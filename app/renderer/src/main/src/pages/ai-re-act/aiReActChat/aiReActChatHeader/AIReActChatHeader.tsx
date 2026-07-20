import React, { useEffect, useRef } from 'react'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { useStore } from 'zustand'

import styles from './AIReActChatHeader.module.scss'
import { ColorsChatIcon } from '@/assets/icon/colors'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import TaskDetailsPopover from '@/components/historyAIReActChat/TaskDetailsPopover'
import AIContextToken from '@/pages/ai-agent/aiChatContent/AIContextToken/AIContextToken'
import HistoryChat from '@/pages/ai-agent/historyChat/HistoryChat'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ClockIcon } from '@/assets/newIcon'
import { OutlineLandPlotIcon, OutlineListTodoIcon } from '@/assets/icon/outline'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AIReActChatHeaderExternalRightIconProps, AIReActChatHeaderProps, AIReActSubAgentTaskProps } from './type'
import { ChevronleftButton } from '../AIReActComponent'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useCreation from 'ahooks/lib/useCreation'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AISource, AISourceEnum } from '../../hooks/grpcApi'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { SolidChatIcon } from '@/assets/icon/solid'
import useAIItemKind from '../../hooks/useAIItemKind'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import { AI_AGENT_HISTORY_AI_SOURCES } from '../../hooks/useGetChatDataStoreKey'

export const AIReActChatHeader: React.FC<AIReActChatHeaderProps> = React.memo((props) => {
  const {
    title,
    chatContainerHeaderClassName,
    isShowRetract,
    externalParameters,
    handleSwitchShowFreeChat,
    scrollToItemIndex,
  } = props

  const { activeChat } = useAIAgentStore()
  const { getSetting } = useAIAgentDispatcher()

  // 内部订阅 Store 数据
  const store = useCurrentStore()
  const focusMode = useStore(store, (state) => state.focusMode)
  const currentCasualTaskID = useStore(store, (state) => state.currentCasualTaskID)
  const casualLoading = useStore(store, (state) => state.casualLoading)

  const sessionRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (sessionRef.current && sessionRef.current !== activeChat?.SessionID) {
      sessionRef.current = undefined
    }
  }, [activeChat?.SessionID])

  useEffect(() => {
    if (!casualLoading) return
    syncCasualTaskTab()
  }, [casualLoading])

  useEffect(() => {
    if (!activeChat?.Title || !activeChat?.SessionID) return
    if (sessionRef.current !== activeChat.SessionID) return
    emitTaskContentTab('update', activeChat.Title)
  }, [activeChat?.Title, activeChat?.SessionID])

  const defaultTaskTabLabel = useCreation(() => {
    return typeof title === 'string' ? title : '自由对话'
  }, [title])

  const emitTaskContentTab = useMemoizedFn((type: 'add' | 'update', label?: string) => {
    const sessionId = activeChat?.SessionID
    if (!currentCasualTaskID || !sessionId) return false
    if (getSetting()?.Source !== 'ai') return false
    emiter.emit(
      'actionAITaskContentTab',
      JSON.stringify({
        type,
        params: {
          key: sessionId,
          taskId: currentCasualTaskID,
          label: label || activeChat?.Title || defaultTaskTabLabel,
          goal: '',
        },
      }),
    )
    return true
  })

  const syncCasualTaskTab = useMemoizedFn(() => {
    const sessionId = activeChat?.SessionID
    if (!currentCasualTaskID || !sessionId) return
    if (getSetting().Source !== AISourceEnum.aiAgent) return false
    emitTaskContentTab('add')
    sessionRef.current = sessionId
  })

  const onDetails = useMemoizedFn(() => {
    if (!currentCasualTaskID) {
      yakitNotify('error', 'currentCasualTaskID不存在')
      return
    }
    if (getSetting().Source !== AISourceEnum.aiAgent) {
      yakitNotify('info', '当前会话不属于 AIAgent 数据源，无法查看任务详情')
      return
    }
    syncCasualTaskTab()
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
          <>
            <AIReActSubAgentTask scrollToItemIndex={scrollToItemIndex} />
            <AIReActChatHeaderExternalRightIcon rightIcon={externalParameters?.rightIcon} />
          </>
        ) : (
          <>
            {currentCasualTaskID && (
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

const AIReActSubAgentTask: React.FC<AIReActSubAgentTaskProps> = React.memo((props) => {
  const { scrollToItemIndex } = props
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const getKind = useAIItemKind()
  const casualChatElementLength = useStore(store, (state) => state.casualChat?.elements?.length || 0)

  const onScrollToConcurrentTask = useMemoizedFn((token: string) => {
    const elements = store.getState().casualChat?.elements || []
    const index = elements.findIndex((item) => item.token === token)
    if (index !== -1) {
      scrollToItemIndex?.(index, 'smooth')
    }
  })

  const casualConcurrentTaskList = useCreation(() => {
    const list: string[] = []
    const elements = store.getState().casualChat?.elements || []
    for (const item of elements) {
      const kind = getKind(item.token)
      if (kind !== 'task') continue
      const itemContent = rawData.contents.get(item.token)
      if (itemContent?.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
        list.push(item.token)
      }
    }
    return list
  }, [casualChatElementLength])

  const getCasualConcurrentTaskName = useMemoizedFn((token: string) => {
    const contentMap = rawData?.contents
    const chatData = contentMap?.get(token)
    switch (chatData?.type) {
      case AIChatQSDataTypeEnum.TASK_NODE_GROUP:
        return chatData?.data?.taskName || chatData?.data?.goal || token

      default:
        return token
    }
  })

  return (
    <>
      {!!casualConcurrentTaskList.length && (
        <YakitPopover
          overlayClassName={styles['chat-locate-popover']}
          content={
            <div className={styles['chat-locate-list']}>
              {casualConcurrentTaskList.map((token) => (
                <div key={token} className={styles['chat-locate-item']} onClick={() => onScrollToConcurrentTask(token)}>
                  <SolidChatIcon /> {getCasualConcurrentTaskName(token)}
                </div>
              ))}
            </div>
          }
          placement="bottom"
        >
          <YakitButton type="outline2" radius="28px" icon={<OutlineLandPlotIcon />}>
            子Agent任务
          </YakitButton>
        </YakitPopover>
      )}
    </>
  )
})

const AIReActChatHeaderExternalRightIcon: React.FC<AIReActChatHeaderExternalRightIconProps> = React.memo((props) => {
  const { rightIcon } = props

  const store = useCurrentStore()
  const currentCasualTaskID = useStore(store, (state) => state.currentCasualTaskID)

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
      case 'im':
        return ['im']
      default:
        return AI_AGENT_HISTORY_AI_SOURCES // AI Agent 侧栏历史会话：包含 ai、im 来源与兼容老数据的空 source
    }
  }, [setting?.Source])

  return !!rightIcon ? (
    <>
      {currentCasualTaskID && rightIcon.taskDetails && <TaskDetailsPopover />}
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
