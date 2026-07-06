import React from 'react'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { useStore } from 'zustand'

import styles from '../AIReActChatHeader.module.scss'
import { ColorsChatIcon } from '@/assets/icon/colors'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import TaskDetailsPopover from '@/components/historyAIReActChat/TaskDetailsPopover'
import AIContextToken from '@/pages/ai-agent/aiChatContent/AIContextToken/AIContextToken'
import HistoryChat from '@/pages/ai-agent/historyChat/HistoryChat'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ClockIcon } from '@/assets/newIcon'
import { OutlineListTodoIcon } from '@/assets/icon/outline'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AIReActChatHeaderExternalRightIconProps, AIReActChatHeaderProps } from './type'
import { ChevronleftButton } from '../AIReActComponent'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useCreation from 'ahooks/lib/useCreation'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AISource } from '../../hooks/grpcApi'

export const AIReActChatHeader: React.FC<AIReActChatHeaderProps> = React.memo((props) => {
  const { title, chatContainerHeaderClassName, isShowRetract, externalParameters, handleSwitchShowFreeChat } = props

  const { activeChat } = useAIAgentStore()
  const { getSetting } = useAIAgentDispatcher()

  // 内部订阅 Store 数据
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const focusMode = useStore(store, (state) => state.focusMode)
  const casualLoading = useStore(store, (state) => state.casualLoading)
  const todoListUpdate = useStore(store, (state) => state.casualChat?.todoListUpdate)

  const taskId = useCreation(() => {
    if (!activeChat?.SessionID) return ''
    try {
      return rawData.casualChat.planDetails?.taskId || ''
    } catch (error) {
      return ''
    }
  }, [todoListUpdate, activeChat?.SessionID, casualLoading])

  const onDetails = useMemoizedFn((e) => {
    e.stopPropagation()
    if (!taskId) {
      yakitNotify('error', 'taskId不存在')
      return
    }
    if (getSetting()?.Source === 'ai') {
      emiter.emit(
        'actionAITaskContentTab',
        JSON.stringify({
          type: 'add',
          params: {
            key: taskId,
            label: '自由对话',
            goal: '',
          },
        }),
      )
    } else {
      yakitNotify('info', '当前会话不属于 AIAgent 数据源，无法查看任务详情')
    }
  })

  return (
    <div className={classNames(styles['chat-header'], chatContainerHeaderClassName)}>
      <div className={styles['chat-header-title']}>
        <ColorsChatIcon />
        <span className={styles['chat-header-title-text']}>{title}</span>
        {focusMode && (
          <YakitTag fullRadius={true} className={styles['chat-header-focus-mode']}>
            场景:<span className={styles['text']}>{focusMode}</span>
          </YakitTag>
        )}
      </div>
      <div className={styles['chat-header-extra']}>
        {isShowRetract ? (
          <AIReActChatHeaderExternalRightIcon rightIcon={externalParameters?.rightIcon} />
        ) : (
          <>
            {casualLoading && (
              <YakitButton type="outline2" radius="28px" icon={<OutlineListTodoIcon />} onClick={onDetails}>
                任务详情
              </YakitButton>
            )}
            <ChevronleftButton onClick={() => handleSwitchShowFreeChat(false)} />
          </>
        )}
      </div>
    </div>
  )
})

const AIReActChatHeaderExternalRightIcon: React.FC<AIReActChatHeaderExternalRightIconProps> = React.memo((props) => {
  const { rightIcon } = props

  const store = useCurrentStore()
  const casualLoading = useStore(store, (state) => state.casualLoading)

  const { setting } = useAIAgentStore()

  const aiSource: AISource[] = useCreation(() => {
    switch (setting?.Source) {
      case 'flow':
        return ['flow']
      case 'knowledgeBase':
        return ['knowledgeBase']
      case 'webFuzzer':
        return ['webFuzzer']
      case 'irify':
        return ['irify']
      case 'yakRunner':
        return ['yakRunner']
      default:
        return ['ai', ''] // AI Agent 侧栏历史会话：包含 ai 与兼容老数据的空 source
    }
  }, [setting?.Source])

  return !!rightIcon ? (
    <>
      {casualLoading && rightIcon.taskDetails && <TaskDetailsPopover />}
      {rightIcon.dataDetails && (
        <AIContextToken iconOnly buttonProps={rightIcon.dataDetails === true ? undefined : rightIcon.dataDetails} />
      )}
      {rightIcon.history && (
        <Tooltip
          trigger={['click']}
          destroyTooltipOnHide
          overlayClassName={styles['history-chat-tooltip']}
          title={
            <div className={styles['history-chat-tooltip-content']}>
              <HistoryChat embedded aiSource={aiSource} />
            </div>
          }
        >
          <YakitButton type="text2" icon={<ClockIcon />} title="" />
        </Tooltip>
      )}
      {rightIcon.add}
      {rightIcon.close}
    </>
  ) : (
    <></>
  )
})
