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
import useLoadHistory from '@/pages/ai-re-act/hooks/useLoadHistory'
import { useCurrentMeta, useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { generateTaskNodeID } from '@/pages/ai-re-act/hooks/utils'

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

  const [highlightedItem, setHighlightedItem] = useState<{ index: number; token: number } | null>(null)
  const highlightRafRef = useRef<number>(0)
  const highlightObserverRef = useRef<IntersectionObserver | null>(null)

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const meta = useCurrentMeta()
  /** TODO - hooks未写 */
  const { handleLoadMoreHistory, handleHasMoreHistory } = useChatIPCDispatcher().chatIPCEvents
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
  const { firstItemIndex, handleLoadMore, isPrependingRef } = useLoadHistory({
    loading: taskLoadMoreLoading,
    dataLength: streams.length,
    SessionID: session,
    fetchHasMore: () => handleHasMoreHistory(TYPE),
    loadMore: () => handleLoadMoreHistory(TYPE),
  })

  const { virtuosoRef, setIsAtBottomRef, setScrollerRef, scrollToIndex, handleTotalListHeightChanged } =
    useVirtuosoAutoScroll({ total: streams.length, isPrependingRef })

  const cleanupHighlightWatcher = useMemoizedFn(() => {
    if (highlightRafRef.current) {
      cancelAnimationFrame(highlightRafRef.current)
      highlightRafRef.current = 0
    }
    highlightObserverRef.current?.disconnect()
    highlightObserverRef.current = null
  })

  /** 等元素进入可视区域后再设置高亮，避免动画在不可见时播放完毕 */
  const waitAndHighlight = useMemoizedFn((targetIndex: number) => {
    cleanupHighlightWatcher()
    setHighlightedItem(null)

    let attempts = 0
    const tryObserve = () => {
      if (++attempts > 120) return
      const el = document.querySelector(`[data-index="${targetIndex}"]`)
      if (!el) {
        highlightRafRef.current = requestAnimationFrame(tryObserve)
        return
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setHighlightedItem({ index: targetIndex, token: Date.now() })
            observer.disconnect()
            highlightObserverRef.current = null
          }
        },
        { threshold: 0.1 },
      )
      observer.observe(el)
      highlightObserverRef.current = observer
    }
    highlightRafRef.current = requestAnimationFrame(tryObserve)
  })

  useEffect(() => {
    return () => {
      cleanupHighlightWatcher()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderItem = useCallback(
    (index: number, stream: ReActChatRenderElement) => {
      if (!stream.token) return null
      const arrayIndex = index - firstItemIndex
      const hasNext = streams.length - arrayIndex > 1
      return <AIChatListItem key={stream.token} hasNext={hasNext} item={stream} type="task-agent" />
    },
    [firstItemIndex, streams.length],
  )
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

  const onScrollToIndex = useMemoizedFn((id) => {
    /**
     * TODO -
     * 目前版本在恢复任务的过程中无法定位
     * 6.29号这周，将task_index全部改为tasID，后续可以通过taskID来定位
     */
    if (!meta?.currentTaskPlanID?.taskID) return false
    const taskID = generateTaskNodeID(meta?.currentTaskPlanID?.taskID, id)
    const index = streams.findIndex((item) => taskID === item.token)
    if (index !== -1) {
      scrollToIndex(index, 'auto')
      waitAndHighlight(index)
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
      <Virtuoso<ReActChatRenderElement>
        ref={virtuosoRef}
        key={session}
        scrollerRef={setScrollerRef}
        firstItemIndex={firstItemIndex}
        atBottomStateChange={setIsAtBottomRef}
        style={{ height: '100%', width: '100%' }}
        data={streams}
        totalListHeightChanged={handleTotalListHeightChanged}
        totalCount={streams.length}
        itemContent={renderItem}
        atBottomThreshold={100}
        initialTopMostItemIndex={streams.length > 1 ? streams.length - 1 : 0}
        skipAnimationFrameInResizeObserver
        // overscan={20}
        // atTopStateChange={handleAtTopStateChange}
        startReached={handleLoadMore}
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
