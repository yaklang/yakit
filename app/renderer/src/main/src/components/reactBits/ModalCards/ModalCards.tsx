import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import './ModalCards.css'

export interface CardGuideStepItem {
  description?: string
  images: string[]
}

export interface CardGuideStep {
  title: string
  items: CardGuideStepItem[]
}

export interface CardData {
  /** Unique identifier for the card */
  id: string
  /** Image URL for the card */
  imageUrl: string
  /** Title displayed on the card overlay */
  title: string
  /** Description shown when card is expanded */
  description: string
  /** Collapsed layout: banner spans the full grid row without a preview image */
  variant?: 'media' | 'banner'
  /** Optional collapsed-card footer (e.g. a docs button) */
  footer?: ReactNode
  /** Where a click opens the expanded view. Default: the whole card. */
  expandTrigger?: 'card' | 'footer'
  /** Expanded body rendered as a stepped guide instead of a single screenshot */
  steps?: CardGuideStep[]
  /** Label for the expanded-guide confirm button */
  confirmLabel?: string
}

export interface ModalCardsProps {
  /** Array of card data to display */
  cards?: CardData[]
  /** Additional CSS classes for the container */
  className?: string
  /** Animation speed preset (default: "normal") */
  animationSpeed?: 'slow' | 'normal' | 'fast' | 'none'
  /** Override spring stiffness for animations */
  springStiffness?: number
  /** Override spring damping for animations */
  springDamping?: number
  /** Animation variant for modal entry (default: "scale") */
  animationVariant?: 'scale' | 'fade' | 'slide'
  /** Close modal when clicking backdrop (default: true) */
  closeOnBackdropClick?: boolean
  /** Close modal when pressing Escape key (default: true) */
  closeOnEscape?: boolean
  /** Show close button in modal (default: true) */
  showCloseButton?: boolean
  /** Aria label for modal accessibility */
  ariaLabel?: string
  /** Custom CSS classes for modal container */
  modalClassName?: string
  /** Custom CSS classes for backdrop */
  backdropClassName?: string
  /** Label for switching to the previous card while the guide is open */
  prevLabel?: string
  /** Label for switching to the next card while the guide is open */
  nextLabel?: string
  /** Accessible label for the close control */
  closeLabel?: string
}

const ANIMATION_SPEEDS = {
  slow: { duration: 0.6, springStiffness: 200, springDamping: 25 },
  normal: { duration: 0.4, springStiffness: 300, springDamping: 30 },
  fast: { duration: 0.2, springStiffness: 400, springDamping: 35 },
  none: { duration: 0, springStiffness: 500, springDamping: 50 },
}

const ModalCards = ({
  cards = [],
  className = '',
  animationSpeed = 'normal',
  springStiffness,
  springDamping,
  animationVariant = 'scale',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  ariaLabel = 'Card details modal',
  modalClassName = '',
  backdropClassName = '',
  prevLabel = '',
  nextLabel = '',
  closeLabel = '',
}: ModalCardsProps) => {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const guideBodyRef = useRef<HTMLDivElement>(null)

  const speedConfig = ANIMATION_SPEEDS[animationSpeed]
  const finalStiffness = springStiffness ?? speedConfig.springStiffness
  const finalDamping = springDamping ?? speedConfig.springDamping
  const isAnimationDisabled = animationSpeed === 'none'

  const springTransition = {
    type: 'spring' as const,
    stiffness: finalStiffness,
    damping: finalDamping,
  }

  const smoothSpring = {
    type: 'spring' as const,
    stiffness: finalStiffness * 1.3,
    damping: finalDamping * 1.2,
  }

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (selectedCard) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedCard])

  useEffect(() => {
    if (!closeOnEscape || !selectedCard) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCard(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedCard, closeOnEscape])

  const handleClose = () => {
    if (closeOnBackdropClick) {
      setSelectedCard(null)
    }
  }

  const selectedIndex = selectedCard ? cards.findIndex((card) => card.id === selectedCard.id) : -1
  const canGoPrev = selectedIndex > 0
  const canGoNext = selectedIndex >= 0 && selectedIndex < cards.length - 1
  const showGuideNav = Boolean(prevLabel && nextLabel && cards.length > 1)

  useEffect(() => {
    const el = guideBodyRef.current
    if (!el) return
    el.scrollTop = 0
  }, [selectedCard?.id])

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => {
      const newSet = new Set(prev)
      newSet.add(id)
      return newSet
    })
  }

  const getInitialAnimation = () => {
    if (isAnimationDisabled) return { opacity: 1 }

    switch (animationVariant) {
      case 'fade':
        return { opacity: 0 }
      case 'slide':
        return { opacity: 0, y: 50 }
      case 'scale':
      default:
        return { opacity: 0, scale: 0.9 }
    }
  }

  const getAnimateAnimation = () => {
    if (isAnimationDisabled) return { opacity: 1 }

    switch (animationVariant) {
      case 'fade':
        return { opacity: 1 }
      case 'slide':
        return { opacity: 1, y: 0 }
      case 'scale':
      default:
        return { opacity: 1, scale: 1 }
    }
  }

  const getExitAnimation = () => {
    if (isAnimationDisabled) return { opacity: 1 }

    switch (animationVariant) {
      case 'fade':
        return { opacity: 0 }
      case 'slide':
        return { opacity: 0, y: 50 }
      case 'scale':
      default:
        return { opacity: 0, scale: 0.9 }
    }
  }

  return (
    <div className={`modal-cards-container ${className}`}>
      <div className="modal-cards-grid">
        {cards.map((card) => {
          const expandOnFooter = card.expandTrigger === 'footer'
          return (
            <motion.div
              key={card.id}
              onClick={() => {
                if (expandOnFooter) return
                setSelectedCard(card)
              }}
              className={`modal-card${card.variant === 'banner' ? ' modal-card-banner' : ''}${expandOnFooter ? ' modal-card-static' : ''}`}
              whileTap={isAnimationDisabled || expandOnFooter ? undefined : { scale: 0.98 }}
              transition={isAnimationDisabled ? { duration: 0 } : smoothSpring}
            >
              <div className="modal-card-overlay">
                <div className="modal-card-content">
                  <div className="modal-card-copy">
                    <h3 className="modal-card-title">{card.title}</h3>
                    <p className="modal-card-description">{card.description}</p>
                  </div>
                </div>
              </div>
              {card.footer ? (
                <div
                  className="modal-card-footer"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (expandOnFooter) setSelectedCard(card)
                  }}
                >
                  {card.footer}
                </div>
              ) : null}
              <div className="modal-card-media">
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  className="modal-card-image"
                  style={{
                    opacity: loadedImages.has(card.id) ? 1 : 0,
                    transition: 'opacity 0.5s ease',
                  }}
                  onLoad={() => handleImageLoad(card.id)}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {selectedCard && (
              <div key="scene-guide-modal">
                <motion.div
                  initial={isAnimationDisabled ? { opacity: 1 } : { opacity: 0, backdropFilter: 'blur(0px)' }}
                  animate={isAnimationDisabled ? { opacity: 1 } : { opacity: 1, backdropFilter: 'blur(8px)' }}
                  exit={isAnimationDisabled ? { opacity: 1 } : { opacity: 0, backdropFilter: 'blur(0px)' }}
                  transition={
                    isAnimationDisabled
                      ? { duration: 0 }
                      : {
                          duration: speedConfig.duration,
                          ease: [0.32, 0.72, 0, 1],
                        }
                  }
                  onClick={handleClose}
                  className={`modal-backdrop ${closeOnBackdropClick ? 'modal-backdrop-clickable' : ''} ${backdropClassName}`}
                  role="button"
                  aria-label={closeOnBackdropClick ? closeLabel || undefined : undefined}
                  tabIndex={closeOnBackdropClick ? 0 : -1}
                />

                <div className="modal-expanded-container" role="dialog" aria-modal="true" aria-label={ariaLabel}>
                  <motion.div
                    initial={getInitialAnimation()}
                    animate={getAnimateAnimation()}
                    exit={getExitAnimation()}
                    className={`modal-expanded-card${selectedCard.steps?.length ? ' modal-expanded-guide' : ''} ${modalClassName}`}
                    onClick={(e) => e.stopPropagation()}
                    transition={isAnimationDisabled ? { duration: 0 } : springTransition}
                  >
                    <div className="modal-expanded-overlay">
                      <div className="modal-expanded-overlay-content">
                        <div className="modal-card-copy">
                          <h3 className="modal-expanded-title">{selectedCard.title}</h3>
                          <p
                            className={`modal-description${selectedCard.steps?.length ? ' modal-description-hidden' : ''}`}
                          >
                            {selectedCard.description}
                          </p>
                        </div>
                        {showCloseButton && (
                          <YakitButton
                            type="secondary2"
                            size="large"
                            radius="50%"
                            icon={<XOutlined color="currentColor" />}
                            aria-label={closeLabel || undefined}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCard(null)
                            }}
                          />
                        )}
                      </div>
                    </div>
                    {selectedCard.steps?.length ? (
                      <>
                        <div className="modal-guide" ref={guideBodyRef}>
                          {selectedCard.steps.map((step, stepIndex) => (
                            <section key={`${selectedCard.id}-step-${stepIndex}`} className="modal-guide-step">
                              <div className="modal-guide-step-title">{step.title}</div>
                              {step.items.map((item, itemIndex) => {
                                return (
                                  <div
                                    key={`${selectedCard.id}-step-${stepIndex}-${itemIndex}`}
                                    className="modal-guide-step-item"
                                  >
                                    {item.description ? (
                                      <div className="modal-guide-step-subtitle">{item.description}</div>
                                    ) : null}
                                    <div
                                      className={
                                        item.images.length > 1 ? 'modal-guide-images-multi' : 'modal-guide-images'
                                      }
                                    >
                                      {item.images.map((imageSrc) => (
                                        <img
                                          key={imageSrc}
                                          src={imageSrc}
                                          alt={item.description || step.title}
                                          className="modal-guide-image"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </section>
                          ))}
                        </div>
                        {selectedCard.confirmLabel || showGuideNav ? (
                          <div className="modal-guide-footer">
                            {showGuideNav ? (
                              <div className="modal-guide-nav">
                                <YakitButton
                                  type="outline2"
                                  disabled={!canGoPrev}
                                  onClick={() => {
                                    if (canGoPrev) setSelectedCard(cards[selectedIndex - 1])
                                  }}
                                >
                                  {prevLabel}
                                </YakitButton>
                                <YakitButton
                                  type="outline2"
                                  disabled={!canGoNext}
                                  onClick={() => {
                                    if (canGoNext) setSelectedCard(cards[selectedIndex + 1])
                                  }}
                                >
                                  {nextLabel}
                                </YakitButton>
                              </div>
                            ) : null}
                            {selectedCard.confirmLabel ? (
                              <YakitButton type="primary" onClick={() => setSelectedCard(null)}>
                                {selectedCard.confirmLabel}
                              </YakitButton>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="modal-expanded-image-container">
                        <img src={selectedCard.imageUrl} alt={selectedCard.title} className="modal-expanded-image" />
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}

ModalCards.displayName = 'ModalCards'

export default ModalCards
