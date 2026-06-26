import React, { memo, useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'

import { OutlineListTodoIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { AITaskExecutionDetails } from '@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'

import { useHistoryAIReActChat } from '../withHistoryAIReActChat'
import styles from './historyAIReActChat.module.scss'

export interface TaskDetailsPopoverProps {
  taskLabel?: string
}

const TaskDetailsPopover: React.FC<TaskDetailsPopoverProps> = ({ taskLabel = '自由对话' }) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const { historyAIReActChatBridge } = useHistoryAIReActChat()
  const [visible, setVisible] = useState(false)
  const [aiTaskDetails, setAITaskDetails] = useState<{ key: string; label: string; goal: string }>()

  const handleOpen = useMemoizedFn(() => {
    if (visible) return
    const taskId = historyAIReActChatBridge.events.fetchCurrentCasualTaskID()
    if (!taskId) {
      yakitNotify('error', 'taskId不存在')
      return
    }
    setAITaskDetails({
      key: taskId,
      label: taskLabel,
      goal: '',
    })
    setVisible(true)
  })

  const handleVisibleChange = useMemoizedFn((v: boolean) => {
    setVisible(v)
  })

  const popoverContent = useMemo(() => {
    if (!aiTaskDetails) return null
    return (
      <div className={styles['task-details-popover-body']}>
        <AITaskExecutionDetails
          taskId={aiTaskDetails.key}
          taskGoal={aiTaskDetails.goal}
          taskName={aiTaskDetails.label}
          onClose={() => setVisible(false)}
        />
      </div>
    )
  }, [aiTaskDetails])

  return (
    <YakitPopover
      content={popoverContent}
      destroyTooltipOnHide={true}
      trigger="click"
      overlayClassName={styles['ai-re-act-task-popover']}
      visible={visible}
      onVisibleChange={handleVisibleChange}
    >
      <Tooltip title={t('YakitButton.viewDetail')}>
        <YakitButton isHover={visible} type="text2" icon={<OutlineListTodoIcon />} onClick={handleOpen} />
      </Tooltip>
    </YakitPopover>
  )
}

export default memo(TaskDetailsPopover)
