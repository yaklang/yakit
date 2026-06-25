import React, { useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'

import { OutlineListTodoIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import { AITaskExecutionDetails } from '@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'

import { useHistoryAIReActChat } from '../withHistoryAIReActChat'

export interface HistoryAIReActTaskDetailsInfo {
  key: string
  label: string
  goal: string
}

export interface UseHistoryAIReActTaskDetailsOptions {
  taskLabel?: string
  onSwitchTab?: (key: 'ai-details') => void
}

export function useHistoryAIReActTaskDetails(options?: UseHistoryAIReActTaskDetailsOptions) {
  const { historyAIReActChatBridge } = useHistoryAIReActChat()
  const [aiTaskDetails, setAITaskDetails] = useState<HistoryAIReActTaskDetailsInfo>()
  const [isShowAIReActChatDetails, setIsShowAIReActChatDetails] = useState(false)

  const onAIReActChatDetails = useMemoizedFn(() => {
    const taskId = historyAIReActChatBridge.events.fetchCurrentCasualTaskID()
    if (!taskId) return
    setAITaskDetails({
      key: taskId,
      label: options?.taskLabel ?? '自由对话',
      goal: '',
    })
    setIsShowAIReActChatDetails(true)
    options?.onSwitchTab?.('ai-details')
  })

  const aiDetailsSideTab = useMemo((): YakitTabsProps | null => {
    if (!isShowAIReActChatDetails) return null
    return {
      icon: <OutlineListTodoIcon />,
      label: '任务详情',
      value: 'ai-details',
    }
  }, [isShowAIReActChatDetails])

  const appendAiDetailsTab = useMemoizedFn((tabs: YakitTabsProps[]) => {
    if (!aiDetailsSideTab) return tabs
    return [...tabs, aiDetailsSideTab]
  })

  const renderAITaskDetailsPanel = useMemoizedFn((activeKey: string) => {
    if (activeKey !== 'ai-details' || !aiTaskDetails) return null
    return (
      <AITaskExecutionDetails
        taskId={aiTaskDetails.key}
        taskGoal={aiTaskDetails.goal}
        taskName={aiTaskDetails.label}
      />
    )
  })

  const detailsRightIcon = useMemo(
    () => (
      <Tooltip title="任务详情">
        <YakitButton type="text2" icon={<OutlineListTodoIcon />} onClick={onAIReActChatDetails} />
      </Tooltip>
    ),
    [onAIReActChatDetails],
  )

  const isAiDetailsViewActive = isShowAIReActChatDetails && !!aiTaskDetails

  const renderInlineAITaskDetails = useMemoizedFn(() => {
    if (!aiTaskDetails) return null
    return (
      <AITaskExecutionDetails
        taskId={aiTaskDetails.key}
        taskGoal={aiTaskDetails.goal}
        taskName={aiTaskDetails.label}
      />
    )
  })

  return {
    onAIReActChatDetails,
    aiTaskDetails,
    isShowAIReActChatDetails,
    isAiDetailsViewActive,
    aiDetailsSideTab,
    appendAiDetailsTab,
    renderAITaskDetailsPanel,
    renderInlineAITaskDetails,
    detailsRightIcon,
  }
}
