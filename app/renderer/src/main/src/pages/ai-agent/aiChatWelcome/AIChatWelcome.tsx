import { MemfitLogoColorful } from '@yakit-libs/yakit-ui-icons/colorful'
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { AIChatWelcomeProps } from './type'
import styles from './AIChatWelcome.module.scss'
import { AIChatTextarea } from '../template/template'
import type { AIChatTextareaRefProps } from '../template/type'

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import { AIWelcomeAsciiRipple } from './AIWelcomeAsciiRipple'

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
    const [isCompact, setIsCompact] = useState(false)
    useEffect(() => {
      const el = welcomeRef.current
      if (!el || typeof ResizeObserver === 'undefined') return
      const update = (width: number, height: number) => {
        const next = width < 720 || height < 680
        setIsCompact((prev) => (prev === next ? prev : next))
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
              [styles['input-wrapper-compact']]: isCompact,
            })}
          >
            <div className={styles['input-heard']}>
              <MemfitLogoColorful className={styles['memfit-icon']} />
              <div className={styles['title']}>Memfit AI Agent</div>
              <div className={styles['subtitle']}>{t('AIChatWelcome.WelcomeHomeSubTitle')}</div>
            </div>
            <div className={styles['input-body-wrapper']}>
              <div className={styles['input-panel']} data-ai-ripple-disabled>
                <AIChatTextarea
                  ref={aiChatTextareaRef}
                  onSubmit={onTriageSubmit}
                  showScenarioCapabilities
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
