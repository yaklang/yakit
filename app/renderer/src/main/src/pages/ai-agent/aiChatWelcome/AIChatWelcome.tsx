import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { AIChatWelcomeProps } from './type'
import styles from './AIChatWelcome.module.scss'
import { AIChatTextarea } from '../template/template'
import type { AIChatTextareaRefProps } from '../template/type'

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import { AIWelcomeAsciiRipple } from './AIWelcomeAsciiRipple'
import { useWelcomeAnimationDisabled } from '../store/welcomeAnimationStore'
import { Flex } from 'antd'
import { useMemoizedFn } from 'ahooks'
import WelcomeRecentSessions, { type WelcomeRecentSessionsDensity } from './WelcomeRecentSessions/WelcomeRecentSessions'
import WelcomeTipsCards from './WelcomeTipsCards/WelcomeTipsCards'

const WELCOME_TITLE = 'Memfit AI Agent'
const WELCOME_NARROW_WIDTH = 720
const WELCOME_TIGHT_HEIGHT = 680
const WELCOME_SHORT_HEIGHT = 850

interface WelcomeLayout {
  compact: boolean
  sessionDensity: WelcomeRecentSessionsDensity
}

const resolveWelcomeLayout = (width: number, height: number): WelcomeLayout => ({
  compact: width < WELCOME_NARROW_WIDTH || height < WELCOME_TIGHT_HEIGHT,
  sessionDensity: height < WELCOME_TIGHT_HEIGHT ? 'collapsed' : height <= WELCOME_SHORT_HEIGHT ? 'three' : 'full',
})

const AIChatWelcome: React.FC<AIChatWelcomeProps> = React.memo(
  forwardRef((props, ref) => {
    const { t } = useI18nNamespaces(['aiAgent'])
    const { onTriageSubmit } = props
    const aiChatTextareaRef = useRef<AIChatTextareaRefProps>({
      setMention: () => {},
      setValue: () => {},
      getValue: () => {},
    })

    useImperativeHandle(ref, () => {
      return {
        setMention: (value) => aiChatTextareaRef.current?.setMention(value),
        setValue: (value) => aiChatTextareaRef.current?.setValue(value),
        getValue: () => aiChatTextareaRef.current?.getValue(),
        handleStart: () => {},
      }
    }, [])

    const welcomeRef = useRef<HTMLDivElement>(null)
    const animationDisabled = useWelcomeAnimationDisabled()
    const [layout, setLayout] = useState<WelcomeLayout>({ compact: false, sessionDensity: 'full' })
    const [isEmptyStats, setIsEmptyStats] = useState(false)
    const handleEmptyStatsChange = useMemoizedFn((empty: boolean) => {
      setIsEmptyStats((prev) => (prev === empty ? prev : empty))
    })
    useEffect(() => {
      const el = welcomeRef.current
      if (!el || typeof ResizeObserver === 'undefined') return
      const update = (width: number, height: number) => {
        const next = resolveWelcomeLayout(width, height)
        setLayout((prev) =>
          prev.compact === next.compact && prev.sessionDensity === next.sessionDensity ? prev : next,
        )
      }
      update(el.clientWidth, el.clientHeight)
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        update(width, height)
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [])

    return (
      <div className={styles['ai-chat-welcome-wrapper']} ref={welcomeRef}>
        <AIWelcomeAsciiRipple targetRef={welcomeRef} />
        <div className={styles['welcome-scroll']}>
          <div
            className={classNames(styles['input-wrapper'], {
              [styles['input-wrapper-compact']]: layout.compact,
            })}
          >
            <Flex className={styles['input-heard']} align="center" vertical gap={16}>
              <div className={styles['title']}>
                {animationDisabled
                  ? WELCOME_TITLE
                  : WELCOME_TITLE.split('').map((ch, index) => (
                      <span
                        key={`${ch}-${index}`}
                        className={styles['title-char']}
                        style={{ animationDelay: `${index * 36}ms` }}
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </span>
                    ))}
              </div>
              <Flex vertical gap={12} className={styles['welcome-tips-block']}>
                {!isEmptyStats && <div className={styles['subtitle']}>{t('AIChatWelcome.WelcomeHomeSubTitle')}</div>}
                <WelcomeTipsCards compact={layout.compact} onEmptyChange={handleEmptyStatsChange} />
                {!isEmptyStats && <WelcomeRecentSessions density={layout.sessionDensity} />}
              </Flex>
            </Flex>
            <div className={styles['input-body-wrapper']}>
              <div className={styles['input-panel']} data-ai-ripple-disabled>
                <AIChatTextarea
                  ref={aiChatTextareaRef}
                  onSubmitWithDraft={onTriageSubmit}
                  initialDraft={props.initialDraft}
                  showScenarioCapabilities
                  filterMentionType={['recent']}
                  selectedHttpFlowIds={props.selectedHttpFlowIds}
                  selectedRiskIds={props.selectedRiskIds}
                  onHttpFlowRemove={props.onHttpFlowRemove}
                  chatDataStoreKey="aiChatDataStore"
                  className={styles['ai-text-wrapper']}
                  milkdownClassName={styles['milkdown-input']}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }),
)

export default AIChatWelcome

export { SideSettingButton } from './AIChatWelcomeSideSetting'
