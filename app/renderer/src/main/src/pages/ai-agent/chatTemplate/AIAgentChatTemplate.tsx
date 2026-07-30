import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useControllableValue, useCreation, useMemoizedFn, useMount, useUpdateEffect } from 'ahooks'
import { AIAgentChatStreamProps, AIChatLeftSideProps, AIChatToolDrawerContentProps } from '../aiAgentType'
import { OutlineChevronrightIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { grpcQueryAIToolDetails } from '../grpc'
import { AIChatQSData, AIChatQSDataTypeEnum, ReActChatRenderElement } from '@/pages/ai-re-act/hooks/aiRender'
import { AIEventQueryRequest, AIInputEvent, AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
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
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useLoadOlder from '@/pages/ai-re-act/hooks/useLoadOlder'
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
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])

  const { onSend } = useAIAgentDispatcher()
  const sessionId = useCurrentSessionId()

  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  const taskChat = useStore(store, (state) => state.taskChat)
  const execute = useStore(store, (state) => state.execute)
  const memoryListUpdate = useStore(store, (state) => state.memoryListUpdate)

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
        return <HistoryTaskTree />
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
  }, [activeTab, handleTabChange, i18nRefresh])
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
  const { scrollToBottom } = props
  const listRootRef = useRef<HTMLDivElement>(null)

  const [highlightedItem, setHighlightedItem] = useState<{ index: number; token: number } | null>(null)
  const highlightRafRef = useRef<number>(0)
  const highlightObserverRef = useRef<IntersectionObserver | null>(null)

  const session = useCurrentSessionId()
  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  const streams = useStore(store, (state) => state.taskChat.elements)

  const { onRangeChange, firstItemIndex, handleLoadMore, isPrependingRef } = useLoadOlder(TYPE)

  useUpdateEffect(() => {
    scrollToIndex('LAST')
  }, [scrollToBottom])

  // 向上加载历史（recovery_history）的在途状态，给 Header 转圈提示
  const grpcLoadMoreLoading = useStore(store, (state) => state.grpcLoadMoreLoading)

  useEffect(() => {
    if (!highlightedItem) return

    const clearTimer = window.setTimeout(() => {
      setHighlightedItem(null)
    }, 1600)

    return () => {
      window.clearTimeout(clearTimer)
    }
  }, [highlightedItem])

  const {
    virtuosoRef,
    setIsAtBottomRef,
    setScrollerRef,
    scrollToIndex,
    scrollToItemIndex: scrollToListItem,
    handleTotalListHeightChanged,
  } = useVirtuosoAutoScroll({
    total: streams.length,
    isPrependingRef,
  })

  const { locateToIndex } = useChatStreamLocateHighlight({
    // Virtuoso scrollToIndex 接受绝对 index，定位下标需加 firstItemIndex 偏移
    scrollToIndex: (index, behavior) => scrollToListItem(index + firstItemIndex, behavior),
    listRootRef,
  })

  useUpdateEffect(() => {
    scrollToIndex('LAST')
  }, [scrollToBottom])

  const renderItem = useCallback((_: number, stream: ReActChatRenderElement) => {
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

  const Footer = useCallback(() => <TaskLoading className={styles['task-loading-footer']} />, [])
  const Header = useCallback(
    () =>
      grpcLoadMoreLoading ? (
        <div style={{ height: 20, position: 'relative' }}>
          <YakitSpin style={{ position: 'absolute', display: 'inline' }} spinning />
        </div>
      ) : null,
    [grpcLoadMoreLoading],
  )
  const components = useMemo(
    () => ({
      Item,
      Footer,
      Header,
    }),
    [Footer, Header, Item],
  )
  const onTreeLocate = useMemoizedFn((id?: string) => {
    if (!id) return
    const index = streams.findLastIndex((item) => {
      const itemData = rawData.contents.get(item.token)
      switch (itemData?.type) {
        case AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP:
        case AIChatQSDataTypeEnum.TASK_NODE_GROUP:
          return itemData.data?.taskId === id
        default:
          return false
      }
    })
    if (index !== -1) locateToIndex(index, 'auto')
  })
  useMount(() => {
    // 仅监听 Ready：由 AITaskContent 保证深度规划已可见后再发
    emiter.on('onAITreeLocatePlanningListReady', onTreeLocate)
    return () => {
      emiter.off('onAITreeLocatePlanningListReady', onTreeLocate)
    }
  })
  return (
    <div ref={listRootRef} className={styles['ai-agent-chat-stream']}>
      <Virtuoso<ReActChatRenderElement>
        ref={virtuosoRef}
        key={session}
        scrollerRef={setScrollerRef}
        defaultItemHeight={120}
        atBottomStateChange={setIsAtBottomRef}
        style={{ height: '100%', width: '100%' }}
        data={streams}
        totalListHeightChanged={handleTotalListHeightChanged}
        totalCount={streams.length}
        itemContent={renderItem}
        firstItemIndex={firstItemIndex}
        atBottomThreshold={100}
        initialTopMostItemIndex={streams.length > 1 ? { index: 'LAST' } : 0}
        skipAnimationFrameInResizeObserver
        startReached={handleLoadMore}
        rangeChanged={onRangeChange}
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
