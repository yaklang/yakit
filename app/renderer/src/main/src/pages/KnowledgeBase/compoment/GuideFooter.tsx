import React from 'react'
import classNames from 'classnames'
import styles from '../guide-footer.module.scss'

import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

interface GuideFooterProps {
  step?: number
  onPrev?: () => void
  onNext?: () => void
  onFinish?: () => void
  /** 最后一步主按钮文案，默认「开始」 */
  finishText?: string
  className?: string
  stopList: Array<{
    title: string
    description: string
    images?: string
  }>
}

const isVideoSrc = (src: string) => /\.(mp4|webm|ogg)(\?|#|$)/i.test(src)

export const GuideFooter = ({
  step = 1,
  onPrev,
  onNext,
  onFinish,
  finishText,
  className,
  stopList,
}: GuideFooterProps) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const finishLabel = finishText || t('GuideFooter.start')
  const media = stopList?.[step - 1]?.images
  return (
    <div className={classNames(styles.wrapper, className)}>
      {media &&
        (isVideoSrc(media) ? (
          <video src={media} autoPlay loop className={styles.media} />
        ) : (
          <img src={media} alt="" className={styles.media} />
        ))}

      <div className={styles.text}>
        <div className={styles.title}>{stopList?.[step - 1]?.title}</div>
        <div className={styles.describe}>{stopList?.[step - 1]?.description}</div>
      </div>

      <div className={styles.footer}>
        <div className={styles.dots}>
          {Array.from({ length: stopList.length }).map((_, i) => (
            <span key={i} className={`${styles.dot} ${i + 1 === step ? styles.active : ''}`} />
          ))}
        </div>

        <div className={styles.actions}>
          {stopList.length === 1 && (
            <YakitButton type="primary" onClick={onFinish}>
              {finishLabel}
            </YakitButton>
          )}

          {stopList.length === 2 && step !== stopList.length && (
            <YakitButton type="primary" onClick={onNext}>
              {t('YakitButton.next')}
            </YakitButton>
          )}

          {stopList.length === 2 && step === stopList.length && (
            <React.Fragment>
              <YakitButton onClick={onPrev}>{t('YakitButton.prev')}</YakitButton>
              <YakitButton type="primary" onClick={onFinish}>
                {finishLabel}
              </YakitButton>
            </React.Fragment>
          )}

          {stopList.length > 2 && step !== stopList.length && (
            <React.Fragment>
              {step !== 1 && <YakitButton onClick={onPrev}>{t('YakitButton.prev')}</YakitButton>}
              <YakitButton type="primary" onClick={onNext}>
                {t('YakitButton.next')}
              </YakitButton>
            </React.Fragment>
          )}

          {stopList.length > 2 && step === stopList.length && (
            <React.Fragment>
              {step !== 1 && <YakitButton onClick={onPrev}>{t('YakitButton.prev')}</YakitButton>}
              <YakitButton type="primary" onClick={onFinish}>
                {finishLabel}
              </YakitButton>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  )
}
