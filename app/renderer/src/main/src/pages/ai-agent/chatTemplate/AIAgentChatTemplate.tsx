import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useControllableValue, useCreation, useMemoizedFn, useMount, useUpdateEffect } from 'ahooks'
import { AIAgentChatStreamProps, AIChatLeftSideProps, AIChatToolDrawerContentProps } from '../aiAgentType'
import { OutlineChevronrightIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { AITree } from '../aiTree/AITree'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { grpcQueryAIToolDetails } from '../grpc'
import {
  AIChatQSData,
  AIChatQSDataTypeEnum,
  AITaskInfoProps,
  AITaskStartInfo,
  ReActChatRenderItem,
} from '@/pages/ai-re-act/hooks/aiRender'
import { AIEventQueryRequest, AIInputEventSyncTypeEnum, AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import { taskAnswerToIconMap } from '../defaultConstant'
import { AIChatListItem } from '../components/aiChatListItem/AIChatListItem'
import StreamCard from '../components/StreamCard'
import i18n from '@/i18n/i18n'
import { Virtuoso } from 'react-virtuoso'
import useVirtuosoAutoScroll from '@/pages/ai-re-act/hooks/useVirtuosoAutoScroll'

import classNames from 'classnames'
import styles from './AIAgentChatTemplate.module.scss'
import emiter from '@/utils/eventBus/eventBus'
import { PreWrapper } from '../components/ToolInvokerCard'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import TimelineCard from './TimelineCard/TimelineCard'
import AIMemoryList from './aiMemoryList/AIMemoryList'
import useChatIPCStore from '../useContext/ChatIPCContent/useStore'
import TaskLoading from './TaskLoading/TaskLoading'
import { YakitResizeBox, YakitResizeBoxProps } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import useChatIPCDispatcher from '../useContext/ChatIPCContent/useDispatcher'
import { AIHistoryContinueTask, HistoryTaskTree } from './historyTaskTree/HistoryTaskTree'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIReviewParams } from '../components/aiReviewResult/AIReviewResult'

export enum AIChatLeft {
  TaskTree = 'task-tree',
  Timeline = 'timeline',
}

/** @name chat-左侧侧边栏 */
export const AIChatLeftSide: React.FC<AIChatLeftSideProps> = memo((props) => {
  const { taskTree, taskName } = props

  const { chatIPCData } = useChatIPCStore()
  const { handleSendSyncMessage, chatIPCEvents } = useChatIPCDispatcher()

  const { taskChat, memoryList } = useChatIPCStore().chatIPCData
  const [activeTab, setActiveTab] = useState<AIChatLeft>(AIChatLeft.Timeline)
  const [expand, setExpand] = useControllableValue<boolean>(props, {
    defaultValue: true,
    valuePropName: 'expand',
    trigger: 'setExpand',
  })
  const [activeKey, setActiveKey] = useState<string>('')
  const hasTaskTree = useCreation(() => {
    return (taskChat?.elements?.length ?? 0) > 0
  }, [taskChat?.elements?.length])
  useEffect(() => {
    if (hasTaskTree) {
      setActiveTab(AIChatLeft.TaskTree)
    }
  }, [hasTaskTree])
  useUpdateEffect(() => {
    if (!!chatIPCData.taskStatus.loading) {
      const coordinatorId = getTaskInfo()?.coordinatorId || 'current-task'
      setActiveKey(coordinatorId)
    }
  }, [chatIPCData.taskStatus.loading])
  const planHistoryList = useCreation(() => {
    return (
      chatIPCData.planHistoryList || {
        total: 0,
        records: [],
        session_id: '',
      }
    )
  }, [chatIPCData.planHistoryList])
  const length = useCreation(() => {
    return memoryList?.memories?.length
  }, [memoryList?.memories?.length])
  const getTaskInfo = useMemoizedFn(() => {
    return chatIPCEvents.fetchTaskChatID()
  })

  const handleCancelExpand = useMemoizedFn(() => {
    setExpand(false)
  })

  const onSendPlayHistoryList = useMemoizedFn(() => {
    handleSendSyncMessage({ syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS })
  })

  const onAITreeTitleExtraNode = useMemoizedFn((value: AITaskInfoProps) => {
    const taskInfo = getTaskInfo()
    const isShow = taskInfo?.status === AITaskStatus.error && !chatIPCData?.taskStatus?.loading
    return isShow ? (
      <AIHistoryContinueTask taskIndex={value.index} coordinatorId={taskInfo?.coordinatorId || ''} />
    ) : null
  })

  const renderDom = useMemoizedFn(() => {
    const taskLength = taskTree?.length
    switch (activeTab) {
      case AIChatLeft.TaskTree:
        const coordinatorId = getTaskInfo()?.coordinatorId || 'current-task'
        const historyLength = planHistoryList?.records?.length
        return (
          <div className={styles['history-task-tree-container']}>
            <>
              {taskLength > 0 ? (
                <YakitCollapse
                  destroyInactivePanel
                  accordion
                  bordered={false}
                  activeKey={activeKey}
                  style={{ marginBottom: 8 }}
                  onChange={(key) => setActiveKey(key as string)}
                >
                  <YakitCollapse.YakitPanel
                    header={
                      <div className={styles['history-task-tree-item-header']}>
                        <div className={styles['history-task-tree-item-header-left']}>
                          <div className={styles['history-task-tree-item-header-title']}>{taskName}</div>
                        </div>

                        <YakitTag color="info" size="small" fullRadius>
                          当前任务
                        </YakitTag>
                      </div>
                    }
                    key={coordinatorId}
                  >
                    <AITree tasks={taskTree} aiTreeTitleExtraNode={onAITreeTitleExtraNode} />
                  </YakitCollapse.YakitPanel>
                </YakitCollapse>
              ) : null}
              {historyLength > 0 && <HistoryTaskTree data={planHistoryList} isHaveCurrentTask={taskLength > 0} />}
            </>
          </div>
        )
      case AIChatLeft.Timeline:
        return <TimelineCard />
      default:
        break
    }
  })

  const handleTabChange = useMemoizedFn((value: AIChatLeft) => {
    setActiveTab(value)
    if (chatIPCData.execute && value === AIChatLeft.TaskTree) {
      onSendPlayHistoryList()
    }
  })

  const button = useMemo(() => {
    let options = [
      { label: '时间线', value: AIChatLeft.Timeline },
      { label: '任务列表', value: AIChatLeft.TaskTree },
    ]
    return (
      <YakitRadioButtons
        buttonStyle="solid"
        size="middle"
        defaultValue={AIChatLeft.TaskTree}
        options={options}
        value={activeTab}
        onChange={({ target }) => handleTabChange(target.value)}
      />
    )
  }, [activeTab, handleTabChange])
  const extraProps = useCreation(() => {
    let p: Omit<YakitResizeBoxProps, 'firstNode' | 'secondNode'> = {}
    if (!length) {
      p.firstRatio = '100%'
      p.secondRatio = '0%'
      p.secondNodeStyle = {
        display: 'none',
        padding: 0,
      }
      p.lineStyle = {
        display: 'none',
        padding: 0,
      }
    }
    return p
  }, [length])
  return (
    <div className={classNames(styles['ai-chat-left-side'], { [styles['ai-chat-left-side-hidden']]: !expand })}>
      <YakitResizeBox
        isVer
        firstNode={
          <div className={styles['list-wrapper']}>
            <div className={styles['side-header']}>
              <YakitButton
                type="outline2"
                className={styles['side-header-btn']}
                icon={<OutlineChevronrightIcon />}
                onClick={handleCancelExpand}
                size="small"
              />
              <div className={styles['header-title']}>{button}</div>
            </div>

            <div className={styles['task-list']}>{renderDom()}</div>
          </div>
        }
        secondNode={
          !!length && (
            <div className={styles['memory-wrapper']}>
              <AIMemoryList />
            </div>
          )
        }
        {...extraProps}
      />
    </div>
  )
})

/** @name chat-信息流展示 */
export const AIAgentChatStream: React.FC<AIAgentChatStreamProps> = memo((props) => {
  const { streams, scrollToBottom, taskStatus, session } = props
  const { virtuosoRef, setIsAtBottomRef, setScrollerRef, scrollToIndex, handleTotalListHeightChanged } =
    useVirtuosoAutoScroll()
  const [highlightedItem, setHighlightedItem] = useState<{ index: number; token: number } | null>(null)
  const highlightStartTimerRef = useRef<number | null>(null)
  useUpdateEffect(() => {
    scrollToIndex('LAST')
  }, [scrollToBottom])

  const {
    chatIPCData: { systemStream },
  } = useChatIPCStore()
  const { fetchChatDataStore } = useChatIPCDispatcher().chatIPCEvents
  useEffect(() => {
    if (!highlightedItem) return

    const clearTimer = window.setTimeout(() => {
      setHighlightedItem(null)
    }, 1600)

    return () => {
      window.clearTimeout(clearTimer)
    }
  }, [highlightedItem])

  useEffect(() => {
    return () => {
      if (highlightStartTimerRef.current) {
        window.clearTimeout(highlightStartTimerRef.current)
      }
    }
  }, [])

  const renderItem = (index: number, stream: ReActChatRenderItem) => {
    if (!stream.token) return null
    const hasNext = streams.length - index > 1
    return <AIChatListItem key={stream.token} hasNext={hasNext} item={stream} type="task-agent" />
  }

  const Item = useCallback(
    ({ children, style, 'data-index': dataIndex }) => (
      <div
        key={dataIndex}
        style={style}
        data-index={dataIndex}
        className={classNames(styles['item-wrapper'], {
          [styles['item-wrapper-highlighted']]: highlightedItem?.index === Number(dataIndex),
        })}
      >
        <div className={styles['item-inner']}>{children}</div>
      </div>
    ),
    [highlightedItem],
  )

  const Footer = useCallback(
    () => <TaskLoading className={styles['task-loading-footer']} taskStatus={taskStatus} systemStream={systemStream} />,
    [taskStatus, systemStream],
  )

  const components = useMemo(
    () => ({
      Item,
      Footer,
    }),
    [Footer, Item],
  )

  const onScrollToIndex = useMemoizedFn((id) => {
    const index = streams.findIndex((item) => {
      if (item.type === AIChatQSDataTypeEnum.TASK_INDEX_NODE) {
        const chatItem = fetchChatDataStore()?.getContentMap({
          session,
          chatType: item.chatType,
          mapKey: item.token,
        })
        if (!chatItem) return false
        const taskIndex = (chatItem.data as AITaskStartInfo).taskIndex
        return taskIndex === id
      }
      return false
    })
    if (index !== -1) {
      scrollToIndex(index, 'auto')
      setHighlightedItem(null)
      if (highlightStartTimerRef.current) {
        window.clearTimeout(highlightStartTimerRef.current)
      }
      highlightStartTimerRef.current = window.setTimeout(() => {
        setHighlightedItem({ index, token: Date.now() })
      }, 80)
    }
  })
  useMount(() => {
    emiter.on('onAITreeLocatePlanningList', onScrollToIndex)
    return () => {
      emiter.off('onAITreeLocatePlanningList', onScrollToIndex)
    }
  })

  return (
    <div className={styles['ai-agent-chat-stream']}>
      <Virtuoso<ReActChatRenderItem>
        ref={virtuosoRef}
        scrollerRef={setScrollerRef}
        atBottomStateChange={setIsAtBottomRef}
        style={{ height: '100%', width: '100%' }}
        data={streams}
        totalListHeightChanged={handleTotalListHeightChanged}
        totalCount={streams.length}
        itemContent={(index, item) => renderItem(index, item)}
        atBottomThreshold={100}
        initialTopMostItemIndex={streams.length > 1 ? streams.length - 1 : 0}
        skipAnimationFrameInResizeObserver
        // increaseViewportBy={{top: 160, bottom: 160}}
        components={components}
      />
    </div>
  )
})

export const AIChatToolDrawerContent: React.FC<AIChatToolDrawerContentProps> = memo((props) => {
  const { callToolId, aiFilePath } = props
  const [toolList, setToolList] = useState<AIChatQSData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  useEffect(() => {
    getList()
  }, [])

  const { yakExecResult } = useChatIPCStore().chatIPCData

  const getList = useMemoizedFn(() => {
    if (!callToolId) return
    const params: AIEventQueryRequest = {
      ProcessID: callToolId,
    }
    setLoading(true)
    grpcQueryAIToolDetails(params)
      .then(setToolList)
      .finally(() => {
        setTimeout(() => {
          setLoading(false)
        }, 200)
      })
  })
  return (
    <div className={styles['ai-chat-tool-drawer-content']}>
      {loading ? (
        <YakitSpin />
      ) : (
        <>
          {toolList.map((info) => {
            const { id, Timestamp, type, data } = info
            const { execFileRecord } = yakExecResult
            switch (type) {
              case AIChatQSDataTypeEnum.STREAM:
              case AIChatQSDataTypeEnum.TOOL_CALL_RESULT: {
                const { NodeIdVerbose, CallToolID, content, NodeId } = data
                const fileList = execFileRecord.get(CallToolID)
                const language = i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1)
                const nodeLabel = NodeIdVerbose[language]
                return (
                  <StreamCard
                    key={id}
                    titleText={nodeLabel}
                    titleIcon={taskAnswerToIconMap[NodeId]}
                    content={<PreWrapper code={content} />}
                    modalInfo={{
                      time: Timestamp,
                      title: info.AIModelName,
                      icon: info.AIService,
                    }}
                    operationInfo={{ aiFilePath }}
                    fileList={fileList}
                  />
                )
              }
              case AIChatQSDataTypeEnum.TOOL_CALL_PARAM:
                const { call_tool_id } = data
                const fileList = execFileRecord.get(call_tool_id)
                return (
                  <StreamCard
                    key={id}
                    titleText={'工具参数'}
                    content={<AIReviewParams params={data.params} isPreStyle={true} />}
                    modalInfo={{
                      time: Timestamp,
                      title: info.AIModelName,
                      icon: info.AIService,
                    }}
                    operationInfo={{ aiFilePath }}
                    fileList={fileList}
                  />
                )
              default:
                return <React.Fragment key={id}></React.Fragment>
            }
          })}
        </>
      )}
    </div>
  )
})
