import React from 'react'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { useStore } from 'zustand'
import styles from './AIReActChatHeader.module.scss'
import { ColorsChatIcon } from '@/assets/icon/colors'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import TaskDetailsPopover from '@/components/historyAIReActChat/TaskDetailsPopover'
import HistoryChat from '@/pages/ai-agent/historyChat/HistoryChat'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ClockIcon } from '@/assets/newIcon'
import { OutlineLandPlotIcon } from '@/assets/icon/outline'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import type { AIReActChatHeaderExternalRightIconProps, AIReActChatHeaderProps, AIReActSubAgentTaskProps } from './type'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { type AISource, AISourceEnum } from '../../hooks/grpcApi'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { SolidChatIcon } from '@/assets/icon/solid'
import useAIItemKind from '../../hooks/useAIItemKind'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import { AI_AGENT_HISTORY_AI_SOURCES } from '../../hooks/useGetChatDataStoreKey'
import { useMemoizedFn, useCreation } from 'ahooks'

export const AIReActChatHeader: React.FC<AIReActChatHeaderProps> = React.memo((props) => {
  const { title, chatContainerHeaderClassName, isShowRetract, externalParameters, scrollToItemIndex } = props

  // 内部订阅 Store 数据
  const store = useCurrentStore()
  const focusMode = useStore(store, (state) => state.focusMode)

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
        {isShowRetract && (
          <>
            <AIReActSubAgentTask scrollToItemIndex={scrollToItemIndex} />
            {externalParameters?.rightIcon && (
              <AIReActChatHeaderExternalRightIcon rightIcon={externalParameters?.rightIcon} />
            )}
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
  const casualChatElementLength = useStore(store, (state) => state.chatElements.length || 0)

  const onScrollToConcurrentTask = useMemoizedFn((token: string) => {
    const elements = store.getState().chatElements || []
    const index = elements.findIndex((item) => item.token === token)
    if (index !== -1) {
      scrollToItemIndex?.(index, 'smooth')
    }
  })

  const casualConcurrentTaskList = useCreation(() => {
    const list: string[] = []
    const elements = store.getState().chatElements || []
    for (const item of elements) {
      // chatElements 已合并 task 类型数据，子 agent 列表只展示 reAct 类型的并发任务
      if (item.chatType !== 'reAct') continue
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
          classNames={{ root: styles['chat-locate-popover'] }}
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
  const currentChatStatusQuestionID = useStore(store, (state) => state.currentChatStatus.questionID)

  const { setting } = useAIAgentStore()

  const aiSource: AISource[] = useCreation(() => {
    switch (setting?.Source) {
      case AISourceEnum.flow:
        return ['flow']
      case AISourceEnum.knowledgeBase:
        return ['knowledgeBase']
      case AISourceEnum.webFuzzer:
        return ['webFuzzer']
      case AISourceEnum.irify:
        return ['irify']
      case AISourceEnum.yakRunner:
        return ['yakRunner']
      case AISourceEnum.im:
        return ['im']
      case AISourceEnum.history:
        return ['history']
      default:
        return AI_AGENT_HISTORY_AI_SOURCES // AI Agent 侧栏历史会话：包含 ai、im 来源与兼容老数据的空 source
    }
  }, [setting?.Source])

  return rightIcon ? (
    <>
      {currentChatStatusQuestionID && rightIcon.taskDetails && <TaskDetailsPopover />}
      {/* {rightIcon.dataDetails && (
        <AIContextToken iconOnly buttonProps={rightIcon.dataDetails === true ? undefined : rightIcon.dataDetails} />
      )} */}
      {rightIcon.history && (
        <Tooltip
          trigger={['click']}
          destroyOnHidden
          classNames={{ root: styles['history-chat-tooltip'] }}
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
