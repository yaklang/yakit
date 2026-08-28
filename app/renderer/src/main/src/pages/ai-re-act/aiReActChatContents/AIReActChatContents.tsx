import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState, useEffect } from 'react'
import type { AIReActChatContentsPProps, AIReferenceNodeProps, AIStreamNodeProps } from './AIReActChatContentsType'
import styles from './AIReActChatContents.module.scss'
import { AIMarkdown } from '@/pages/ai-agent/components/aiMarkdown/AIMarkdown'
import { AIStreamChatContent } from '@/pages/ai-agent/components/aiStreamChatContent/AIStreamChatContent'
import StreamCard from '@/pages/ai-agent/components/StreamCard'
import { taskAnswerToIconMap } from '@/pages/ai-agent/defaultConstant'
import useAINodeLabel from '../hooks/useAINodeLabel'
import { AIChatListItem } from '@/pages/ai-agent/components/aiChatListItem/AIChatListItem'
import { AIYaklangCode } from '@/pages/ai-agent/components/aiYaklangCode/AIYaklangCode'
import type { ModalInfoProps } from '@/pages/ai-agent/components/ModelInfo'
import { AIStreamContentType } from '../hooks/defaultConstant'
import { Virtuoso } from 'react-virtuoso'
import useVirtuosoAutoScroll from '../hooks/useVirtuosoAutoScroll'
import useChatStreamLocateHighlight from '../hooks/useChatStreamLocateHighlight'
import type { ReActChatRenderElement, ChatReferenceMaterialPayload } from '../hooks/aiRender'
import Loading from '@/components/Loading/Loading'
import { ScrollText } from '@/pages/ai-agent/chatTemplate/TaskLoading/TaskLoading'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import AITextSyntaxFlow from '@/pages/ai-agent/components/aiTextSyntaxFlow/AITextSyntaxFlow'
import { useCurrentStore, useCurrentRawData } from '../hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import useLoadOlder from '../hooks/useLoadOlder'
import { Code } from '@/pages/ai-agent/components/aiGroupStreamCard/AIGroupStreamCard'
import { AITaskStatus } from '../hooks/grpcApi'
import { AIChatQSDataTypeEnum } from '../hooks/aiRender'
import emiter from '@/utils/eventBus/eventBus'
import { OutlinePositionIcon } from '@/assets/icon/outline'
import { useDebounceFn, useMount, useCreation, useMemoizedFn } from 'ahooks'

export const AIStreamNode: React.FC<AIStreamNodeProps> = React.memo((props) => {
  const { stream, aiMarkdownProps, listItemIndex, sessionId } = props
  const { reference } = stream
  const { NodeId, content, NodeIdVerbose, CallToolID, ContentType, status } = stream.data
  // 是否仍在流式输出（结束态 status 为 'end'，历史消息亦为 'end'，据此控制流式淡入效果）
  const streaming = status !== 'end'
  const store = useCurrentStore()
  const execFileRecord = useStore(store, (state) => state.execFileRecord)
  const { nodeLabel } = useAINodeLabel(NodeIdVerbose)

  const modalInfo: ModalInfoProps = useCreation(() => {
    return {
      time: stream.Timestamp,
      title: stream.AIModelName,
      icon: stream.AIService,
    }
  }, [stream.Timestamp, stream.AIModelName, stream.AIService])
  const referenceNode = useCreation(() => {
    return reference ? <AIReferenceNode referenceList={reference || []} sessionId={sessionId || ''} /> : <></>
  }, [reference, sessionId])
  if (ContentType?.startsWith('code/')) {
    return (
      <AIYaklangCode
        contentType={ContentType}
        content={content}
        autoApplyStreamId={stream.id}
        listItemIndex={listItemIndex}
        nodeLabel={nodeLabel}
        modalInfo={modalInfo}
        referenceNode={referenceNode}
        streaming={streaming}
      />
    )
  }
  switch (ContentType) {
    case AIStreamContentType.TEXT_MARKDOWN:
      return (
        <AIMarkdown
          token={stream.id}
          referenceNode={referenceNode}
          content={content}
          nodeLabel={nodeLabel}
          streaming={streaming}
          {...aiMarkdownProps}
        />
      )
    case AIStreamContentType.TEXT_PLAIN: {
      const fileList = execFileRecord.get(CallToolID)
      return (
        <StreamCard
          titleText={nodeLabel}
          titleIcon={taskAnswerToIconMap[NodeId]}
          content={content}
          modalInfo={modalInfo}
          fileList={fileList}
          referenceNode={referenceNode}
        />
      )
    }
    case AIStreamContentType.LOG_TOOL_ERROR_OUTPUT:
      return <></>
    case AIStreamContentType.TEXT_SYNTAXFLOW:
      return (
        <AITextSyntaxFlow
          content={content}
          nodeIdVerbose={NodeIdVerbose}
          modalInfo={modalInfo}
          contentType={ContentType}
        />
      )
    default:
      return (
        <AIStreamChatContent
          token={stream.id}
          content={content}
          nodeId={NodeId}
          nodeIdVerbose={NodeIdVerbose}
          referenceNode={referenceNode}
          streaming={streaming}
        />
      )
  }
})
const TYPE = 'reAct'

export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo(
  forwardRef((props, ref) => {
    const listRootRef = useRef<HTMLDivElement>(null)
    const { activeChat } = useAIAgentStore()

    const store = useCurrentStore()
    const casualChatElements = useStore(store, (state) => state.chatElements)
    const chatLength = useStore(store, (state) => state.chatElements.length)
    const casualTitle = useStore(store, (state) => state.currentLoadingTitle.casualTitle)
    const planTitle = useStore(store, (state) => state.currentLoadingTitle.planTitle)
    const execute = useStore(store, (state) => state.execute)
    // 任务规划运行态：进入任务规划后底部 loading 从 planTitle 取值
    const taskCoordinatorId = useStore(store, (state) => state.currentChatStatus.coordinatorId)
    const taskStatus = useStore(store, (state) => state.currentChatStatus.status)
    const isTaskPlanning = !!taskCoordinatorId && taskStatus === AITaskStatus.inProgress
    // 向上加载历史（recovery_history）的在途状态，给 Header 转圈提示
    const grpcLoadMoreLoading = useStore(store, (state) => state.grpcLoadMoreLoading)

    const { onRangeChange, firstItemIndex, handleLoadMore, isPrependingRef } = useLoadOlder(TYPE)

    const {
      virtuosoRef,
      setScrollerRef,
      setIsAtBottomRef,
      handleTotalListHeightChanged,
      scrollToItemIndex,
      scrollToIndex,
    } = useVirtuosoAutoScroll({
      total: chatLength,
      isPrependingRef,
    })

    // 是否已滚动到底部：ref 供 hook 内部判断，state 触发重渲染控制置底按钮显隐
    const [isAtBottom, setIsAtBottom] = useState(true)
    const handleAtBottomStateChange = useMemoizedFn((flag: boolean) => {
      setIsAtBottomRef(flag)
      setIsAtBottom(flag)
    })
    const onScrollToBottom = useDebounceFn(
      () => {
        scrollToIndex('LAST')
      },
      { wait: 200, leading: true },
    ).run

    const { locateToIndex } = useChatStreamLocateHighlight({
      // scrollToIndex / Item data-index 用 data 数组下标；不要加 firstItemIndex。
      // firstItemIndex 只给 Virtuoso 前插补偿，rangeChanged 才是绝对 index。
      scrollToIndex: (index, behavior) => scrollToItemIndex(index, behavior),
      listRootRef,
    })

    const rawData = useCurrentRawData()

    useImperativeHandle(ref, () => ({ scrollToItemIndex: (index, behavior) => locateToIndex(index, behavior) }), [])

    // 任务树点击定位：在自由对话列表中查找匹配的任务节点并定位高亮
    const onTreeLocate = useMemoizedFn((id?: string) => {
      if (!id) return
      const elements = store.getState().chatElements
      const index = elements.findLastIndex((item) => {
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
      emiter.on('onAITreeLocatePlanningList', onTreeLocate)
      return () => {
        emiter.off('onAITreeLocatePlanningList', onTreeLocate)
      }
    })

    const renderItem = useCallback((_, item?: ReActChatRenderElement) => {
      if (!item?.token) return null
      // TODO -
      // 如果token变化，可能存在以下情况
      // 例如group中list监听数组长度变化确认更新,会出现长度没变token变化，list层不会渲染，token变化的组件拿不到最新的token一直是旧的
      return <AIChatListItem key={item.token} item={item} />
    }, [])
    const Item = useCallback(
      ({ children, style, 'data-index': dataIndex }) => (
        <div style={style} data-index={dataIndex} className={styles['item-wrapper']}>
          <div className={styles['item-inner']}>{children}</div>
        </div>
      ),
      [],
    )

    const Footer = useCallback(() => {
      if (!execute) return chatLength ? <div className={styles['end']}>当前会话已停止</div> : null
      // 任务规划进行中时从 planTitle 取值，否则从 casualTitle 取值
      const mainTitle = isTaskPlanning ? planTitle : casualTitle
      if (!mainTitle) return <div className={styles['end']}>当前会话已结束</div>
      return (
        <div className={styles['footer-loading']}>
          <Loading size={14} style={{ marginTop: 8 }}>
            <div className={styles['footer-loading-title']}>
              <ScrollText text={mainTitle as string} />
            </div>
          </Loading>
        </div>
      )
    }, [casualTitle, planTitle, execute, chatLength, isTaskPlanning])
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
    // console.log('chatElements', casualChatElements, store.getState().items)
    return (
      <div ref={listRootRef} className={styles['ai-re-act-chat-contents']}>
        <Virtuoso
          key={activeChat?.SessionID}
          ref={virtuosoRef}
          scrollerRef={setScrollerRef}
          defaultItemHeight={80}
          atBottomStateChange={handleAtBottomStateChange}
          data={casualChatElements}
          totalListHeightChanged={handleTotalListHeightChanged}
          itemContent={renderItem}
          firstItemIndex={firstItemIndex}
          initialTopMostItemIndex={chatLength > 1 ? { index: 'LAST' } : 0}
          components={components}
          increaseViewportBy={{ top: 600, bottom: 200 }}
          atBottomThreshold={50}
          skipAnimationFrameInResizeObserver
          startReached={handleLoadMore}
          rangeChanged={onRangeChange}
          className={styles['re-act-contents-list']}
        />
        {chatLength > 0 && !isAtBottom && (
          <div className={styles['scroll-to-bottom-wrapper']}>
            <YakitButton
              type="outline2"
              icon={<OutlinePositionIcon />}
              radius="50%"
              onClick={onScrollToBottom}
              className={styles['position-button']}
              size="large"
            />
          </div>
        )}
      </div>
    )
  }),
)

export const AIReferenceNode: React.FC<AIReferenceNodeProps> = React.memo((props) => {
  const { referenceList, sessionId, title = '' } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const [open, setOpen] = useState(false)
  const [modelCode, setModelCode] = useState<ChatReferenceMaterialPayload>([])
  const [modelLoading, setModelLoading] = useState(false)

  const hidden = useCreation(() => {
    return !referenceList?.length
  }, [referenceList?.length])

  const onClose = useMemoizedFn(() => {
    setOpen(false)
  })

  /** 按 token 列表异步获取参考资料完整数据 */
  const fetchReference = useMemoizedFn(async (): Promise<ChatReferenceMaterialPayload> => {
    if (!referenceList.length || !sessionId) return []
    try {
      const items = await globalSessionEngine.getSessionReferenceMaterials(sessionId, referenceList)
      return items.map((item) => item.content)
    } catch {
      return []
    }
  })

  // modal 打开时拉取数据
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setModelLoading(true)
    fetchReference()
      .then((code) => {
        if (!cancelled) setModelCode(code)
      })
      .finally(() => {
        if (!cancelled) setModelLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const openModel = useMemoizedFn(() => {
    setOpen(true)
  })
  return !hidden ? (
    <>
      {open && (
        <YakitModal
          visible={open}
          title={title || '参考资料'}
          cancelButtonProps={{ style: { display: 'none' } }}
          onOk={onClose}
          onCloseX={onClose}
        >
          <YakitSpin spinning={modelLoading}>
            <Code code={modelCode} style={{ maxHeight: '500px' }} />
          </YakitSpin>
        </YakitModal>
      )}
      <YakitButton type="text" colors="primary" size="small" onClick={openModel}>
        {t('AIStreamNode.viewReference')}
      </YakitButton>
    </>
  ) : null
})
