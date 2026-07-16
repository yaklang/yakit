import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useControllableValue, useCreation, useMemoizedFn, useMount, useUpdateEffect } from 'ahooks'
import { AIAgentChatStreamProps, AIChatLeftSideProps, AIChatToolDrawerContentProps } from '../aiAgentType'
import { OutlineChevronrightIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { grpcQueryAIToolDetails } from '../grpc'
import { AIChatQSData, AIChatQSDataTypeEnum, ReActChatRenderElement } from '@/pages/ai-re-act/hooks/aiRender'
import {
  AIAgentGrpcApi,
  AIEventQueryRequest,
  AIInputEvent,
  AIInputEventSyncTypeEnum,
} from '@/pages/ai-re-act/hooks/grpcApi'
import { taskAnswerToIconMap } from '../defaultConstant'
import { AIChatListItem } from '../components/aiChatListItem/AIChatListItem'
import StreamCard from '../components/StreamCard'
import i18n from '@/i18n/i18n'
import { Virtuoso } from 'react-virtuoso'
import useVirtuosoAutoScroll from '@/pages/ai-re-act/hooks/useVirtuosoAutoScroll'
import useChatStreamLocateHighlight from '@/pages/ai-re-act/hooks/useChatStreamLocateHighlight'

import classNames from 'classnames'
import styles from './AIAgentChatTemplate.module.scss'
import emiter from '@/utils/eventBus/eventBus'
import { PreWrapper } from '../components/ToolInvokerCard'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import TimelineCard from './TimelineCard/TimelineCard'
import AIMemoryList from './aiMemoryList/AIMemoryList'
import TaskLoading from './TaskLoading/TaskLoading'
import { YakitResizeBox, YakitResizeBoxProps } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { HistoryTaskTree } from './historyTaskTree/HistoryTaskTree'
import { AIReviewParams } from '../components/aiReviewResult/AIReviewResult'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentMeta, useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'

export enum AIChatLeft {
  TaskTree = 'task-tree',
  Timeline = 'timeline',
}

/** @name chat-左侧侧边栏 */
export const AIChatLeftSide: React.FC<AIChatLeftSideProps> = memo((props) => {
  const { taskTree, taskName } = props
  const { t, i18n } = useI18nNamespaces(['aiAgent'])

  const { onSend } = useAIAgentDispatcher()
  const sessionId = useCurrentSessionId()

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const meta = useCurrentMeta()

  const taskChat = useStore(store, (state) => state.taskChat)
  const execute = useStore(store, (state) => state.execute)
  const memoryListUpdate = useStore(store, (state) => state.memoryListUpdate)
  const planHistoryList = useStore(store, (state) => state.planHistoryList)

  const [activeTab, setActiveTab] = useState<AIChatLeft>(AIChatLeft.Timeline)
  const [expand, setExpand] = useControllableValue<boolean>(props, {
    defaultValue: true,
    valuePropName: 'expand',
    trigger: 'setExpand',
  })
  const hasTaskTree = useCreation(() => {
    return (taskChat?.elements?.length ?? 0) > 0
  }, [taskChat?.elements?.length])
  useEffect(() => {
    if (hasTaskTree) {
      setActiveTab(AIChatLeft.TaskTree)
    }
  }, [hasTaskTree])

  const length = useCreation(() => {
    return rawData?.memoryList?.memories?.length || 0
  }, [memoryListUpdate])

  const handleCancelExpand = useMemoizedFn(() => {
    setExpand(false)
  })

  const onSendPlayHistoryList = useMemoizedFn(() => {
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,

      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
  })

  const renderDom = useMemoizedFn(() => {
    switch (activeTab) {
      case AIChatLeft.TaskTree:
        const coordinatorId = meta.currentTaskPlanID?.coordinatorId || ''
        const currentTaskItem: AIAgentGrpcApi.PlanHistory = {
          coordinator_id: coordinatorId,
          created_at: '',
          created_at_unix: 0,
          session_id: '',
          task_progress: {
            total_tasks: 0,
            completed_tasks: 0,
            skipped_tasks: 0,
            aborted_tasks: 0,
            current_index: 0,
            current_task_index: '',
            current_task: '',
            current_goal: '',
            phase: 'NotCompleted',
            updated_at: 0,
          },
          task_tree: taskTree,
          updated_at: '',
          updated_at_unix: 0,
          root_task_name: taskName,
        }
        return <HistoryTaskTree data={planHistoryList} currentTaskItem={currentTaskItem} />
      case AIChatLeft.Timeline:
        return <TimelineCard />
      default:
        break
    }
  })

  const handleTabChange = useMemoizedFn((value: AIChatLeft) => {
    setActiveTab(value)
    if (execute && value === AIChatLeft.TaskTree) {
      onSendPlayHistoryList()
    }
  })

  const button = useMemo(() => {
    let options = [
      { label: t('AIAgentChatTemplate.timeline'), value: AIChatLeft.Timeline },
      { label: t('AIAgentChatTemplate.tasklist'), value: AIChatLeft.TaskTree },
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
  }, [activeTab, handleTabChange, i18n.language])
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
const TYPE = 'task'
export const AIAgentChatStream: React.FC<AIAgentChatStreamProps> = memo((props) => {
  const { streams, scrollToBottom, taskStatus, session } = props
  const listRootRef = useRef<HTMLDivElement>(null)

  const [highlightedItem, setHighlightedItem] = useState<{ index: number; token: number } | null>(null)
  const highlightRafRef = useRef<number>(0)
  const highlightObserverRef = useRef<IntersectionObserver | null>(null)

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const meta = useCurrentMeta()
  /** TODO - hooks未写 */
  // const { handleLoadMoreHistory, handleHasMoreHistory } = useChatIPCDispatcher().chatIPCEvents
  useUpdateEffect(() => {
    scrollToIndex('LAST')
  }, [scrollToBottom])

  const taskLoadMoreLoading = useStore(store, (state) => state.requestHistoryState.taskLoadMoreLoading)

  useEffect(() => {
    if (!highlightedItem) return

    const clearTimer = window.setTimeout(() => {
      setHighlightedItem(null)
    }, 1600)

    return () => {
      window.clearTimeout(clearTimer)
    }
  }, [highlightedItem])

  // 向上滚动加载
  // const { firstItemIndex, handleLoadMore, isPrependingRef } = useLoadHistory({
  //   loading: taskLoadMoreLoading,
  //   dataLength: streams.length,
  //   SessionID: session,
  //   fetchHasMore: () => handleHasMoreHistory(TYPE),
  //   loadMore: () => handleLoadMoreHistory(TYPE),
  // })

  const {
    virtuosoRef,
    setIsAtBottomRef,
    setScrollerRef,
    scrollToIndex,
    scrollToItemIndex: scrollToListItem,
    handleTotalListHeightChanged,
  } = useVirtuosoAutoScroll({
    total: streams.length,
    // isPrependingRef
  })

  const { locateToIndex } = useChatStreamLocateHighlight({
    scrollToIndex: scrollToListItem,
    listRootRef,
  })

  useUpdateEffect(() => {
    scrollToIndex('LAST')
  }, [scrollToBottom])

  const renderItem = useCallback((index: number, stream: ReActChatRenderElement) => {
    if (!stream.token) return null
    return <AIChatListItem key={stream.token} item={stream} />
  }, [])
  const Item = useCallback(
    ({ children, style, 'data-index': dataIndex }) => (
      <div style={style} data-index={dataIndex} className={styles['item-wrapper']}>
        <div className={styles['item-inner']}>{children}</div>
      </div>
    ),
    [],
  )

  const Footer = useCallback(
    () => <TaskLoading className={styles['task-loading-footer']} taskStatus={taskStatus} />,
    [taskStatus],
  )
  const Header = useCallback(
    () =>
      taskLoadMoreLoading ? (
        <div style={{ height: 20, position: 'relative' }}>
          <YakitSpin style={{ position: 'absolute', display: 'inline' }} spinning />
        </div>
      ) : null,
    [taskLoadMoreLoading],
  )
  const components = useMemo(
    () => ({
      Item,
      Footer,
      Header,
    }),
    [Footer, Header, Item],
  )
  /** TODO - 需验证一下 */
  const onTreeLocate = useMemoizedFn((id?: string) => {
    if (!id) return
    // const index = streams.findIndex((item) => {
    //   if (item.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) return false
    //   const chatItem = fetchChatDataStore()?.getContentMap({
    //     session,
    //     chatType: item.chatType,
    //     mapKey: item.token,
    //   })
    //   if (!chatItem) return false
    //   return (chatItem.data as AITaskStartInfo).taskId === id
    // })
    const index = streams.findIndex((item) => item.token === id)
    if (index !== -1) locateToIndex(index, 'auto')
  })
  useMount(() => {
    emiter.on('onAITreeLocatePlanningList', onTreeLocate)
    return () => {
      emiter.off('onAITreeLocatePlanningList', onTreeLocate)
    }
  })
  return (
    <div className={styles['ai-agent-chat-stream']}>
      <Virtuoso<ReActChatRenderElement>
        ref={virtuosoRef}
        key={session}
        scrollerRef={setScrollerRef}
        // firstItemIndex={firstItemIndex}
        atBottomStateChange={setIsAtBottomRef}
        style={{ height: '100%', width: '100%' }}
        data={streams}
        totalListHeightChanged={handleTotalListHeightChanged}
        totalCount={streams.length}
        itemContent={renderItem}
        atBottomThreshold={100}
        initialTopMostItemIndex={streams.length > 1 ? streams.length - 1 : 0}
        skipAnimationFrameInResizeObserver
        // startReached={handleLoadMore}
        components={components}
      />
    </div>
  )
})

export const AIChatToolDrawerContent: React.FC<AIChatToolDrawerContentProps> = memo((props) => {
  const { callToolId, aiFilePath } = props
  const [toolList, setToolList] = useState<AIChatQSData[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const store = useCurrentStore()
  const execFileRecord = useStore(store, (state) => state.execFileRecord)

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

  useMount(getList)

  return (
    <div className={styles['ai-chat-tool-drawer-content']}>
      {loading ? (
        <YakitSpin />
      ) : (
        <>
          {toolList.map((info) => {
            const { id, Timestamp, type, data } = info
            switch (type) {
              case AIChatQSDataTypeEnum.STREAM:
              case AIChatQSDataTypeEnum.TOOL_CALL_RESULT: {
                const { NodeIdVerbose, CallToolID, content, NodeId } = data
                const fileList = execFileRecord.get(CallToolID)
                const language = i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1)
                const nodeLabel = NodeIdVerbose[language] || NodeIdVerbose['Zh']
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
