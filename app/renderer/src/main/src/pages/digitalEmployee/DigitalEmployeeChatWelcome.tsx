import React, { useMemo } from 'react'
import { AIChatTextarea } from '@/pages/ai-agent/template/template'
import type { AIChatTextareaRefProps, AIChatTextareaSubmit } from '@/pages/ai-agent/template/type'
import { useDigitalEmployee } from './DigitalEmployeeContext'
import { DigitalEmployeeAgentSelector } from './DigitalEmployeeWorkspace'
import { getDigitalEmployeeDefaultMention } from './resolver'
import styles from '@/pages/ai-agent/aiChatWelcome/AIChatWelcome.module.scss'

interface DigitalEmployeeChatWelcomeProps {
  welcomeRef?: React.Ref<HTMLDivElement>
  inputRef?: React.Ref<AIChatTextareaRefProps>
  onSubmit: (value: AIChatTextareaSubmit) => void
}

export const DigitalEmployeeChatWelcome: React.FC<DigitalEmployeeChatWelcomeProps> = ({
  welcomeRef,
  inputRef,
  onSubmit,
}) => {
  const { selectedEmployee, selectedAgent, selectionVersion, loading, error } = useDigitalEmployee()
  const defaultMentions = useMemo(() => {
    const mention = getDigitalEmployeeDefaultMention(selectedAgent)
    return mention ? [mention] : []
  }, [selectedAgent])

  if (!selectedEmployee) return null

  const unavailableMessage = loading
    ? '正在加载智能体，请稍候…'
    : error || '当前角色暂无可用智能体，请先在智能体广场分配智能体。'

  return (
    <div className={styles['employee-chat-welcome']} ref={welcomeRef}>
      <div className={styles['employee-welcome-copy']}>
        <span className={styles['employee-welcome-label']}>AI Senso · {selectedEmployee.name}</span>
        <h2>请告诉我，你想做什么？</h2>
        <p>
          {selectedAgent
            ? `当前使用“${selectedAgent.ForgeVerboseName || selectedAgent.ForgeName}”协助你完成任务`
            : unavailableMessage}
        </p>
      </div>
      <div className={styles['employee-agent-wrapper']}>
        <DigitalEmployeeAgentSelector />
      </div>
      <div className={styles['employee-input-wrapper']}>
        <AIChatTextarea
          key={`digital-employee-input-${selectedEmployee.id}-${selectionVersion}-${selectedAgent?.Id ?? 'none'}`}
          ref={inputRef}
          onSubmit={(value) => {
            if (selectedAgent) onSubmit(value)
          }}
          submitDisabled={!selectedAgent}
          defaultMentions={defaultMentions}
          chatDataStoreKey="aiChatDataStore"
        />
      </div>
      <div className={styles['content-copy']}>@2026 亚信安全 · AI Senso 数字员工</div>
    </div>
  )
}
