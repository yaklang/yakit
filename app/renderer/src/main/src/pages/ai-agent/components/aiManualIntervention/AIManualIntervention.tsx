import { memo, useRef, useState } from 'react'
import { useClickAway, useCreation } from 'ahooks'
import React from 'react'
import { AIManualInterventionProps } from './type'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AIChatQSDataTypeEnum, UserManualInterventionContext } from '@/pages/ai-re-act/hooks/aiRender'
import styles from './AIManualIntervention.module.scss'
import ChatCard from '../ChatCard'
import { formatTimestamp } from '@/utils/timeUtil'

export const AIManualIntervention: React.FC<AIManualInterventionProps> = memo((props) => {
  const { info, timestamp } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const containerRef = useRef<HTMLDivElement>(null)
  const [isScroll, setIsScroll] = useState(false)

  useClickAway(() => {
    setIsScroll(false)
  }, containerRef)

  const data: UserManualInterventionContext = useCreation(() => {
    if (info.type === AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION) {
      return info.data
    }
    return {
      type: '',
      content: '',
    }
  }, [info.data, info.type])

  return (
    <ChatCard
      titleText={
        <div className={styles['title-wrapper']}>
          <span className={styles['title']}>{t('AIReActTaskChatContent.humanIntervention')}</span>
          <span className={styles['time']}>{formatTimestamp(timestamp)}</span>
        </div>
      }
      className={styles['manual-intervention-wrapper']}
    >
      <div
        ref={containerRef}
        className={styles['content']}
        style={{
          overflow: isScroll ? 'auto' : 'hidden',
        }}
        onClick={() => setIsScroll(true)}
      >
        {data.content}
      </div>
    </ChatCard>
  )
})
