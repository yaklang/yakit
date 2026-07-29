import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState, useEffect } from 'react'
import { AIReActChatContentsPProps, AIReferenceNodeProps, AIStreamNodeProps } from './AIReActChatContentsType'
import styles from './AIReActChatContents.module.scss'
import { AIMarkdown } from '@/pages/ai-agent/components/aiMarkdown/AIMarkdown'
import { AIStreamChatContent } from '@/pages/ai-agent/components/aiStreamChatContent/AIStreamChatContent'
import StreamCard from '@/pages/ai-agent/components/StreamCard'
import { taskAnswerToIconMap } from '@/pages/ai-agent/defaultConstant'
import useAINodeLabel from '../hooks/useAINodeLabel'
import { AIChatListItem } from '@/pages/ai-agent/components/aiChatListItem/AIChatListItem'
import { AIYaklangCode } from '@/pages/ai-agent/components/aiYaklangCode/AIYaklangCode'
import { ModalInfoProps } from '@/pages/ai-agent/components/ModelInfo'
import { AIStreamContentType } from '../hooks/defaultConstant'
import { Virtuoso } from 'react-virtuoso'
import useVirtuosoAutoScroll from '../hooks/useVirtuosoAutoScroll'
import useChatStreamLocateHighlight from '../hooks/useChatStreamLocateHighlight'
import { ReActChatRenderElement, ChatReferenceMaterialPayload } from '../hooks/aiRender'
import Loading from '@/components/Loading/Loading'
import { ScrollText } from '@/pages/ai-agent/chatTemplate/TaskLoading/TaskLoading'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import AITextSyntaxFlow from '@/pages/ai-agent/components/aiTextSyntaxFlow/AITextSyntaxFlow'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useCreation from 'ahooks/lib/useCreation'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import useLoadOlder from '../hooks/useLoadOlder'
import { Code } from '@/pages/ai-agent/components/aiGroupStreamCard/AIGroupStreamCard'

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
    return !!reference ? <AIReferenceNode referenceList={reference || []} sessionId={sessionId || ''} /> : <></>
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
      />
    )
  }
  switch (ContentType) {
    case AIStreamContentType.TEXT_MARKDOWN:
      return (
        <AIMarkdown
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
      return <AIStreamChatContent content={content} nodeIdVerbose={NodeIdVerbose} referenceNode={referenceNode} />
  }
})
const TYPE = 'reAct'

export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo(
  forwardRef((_, ref) => {
    const listRootRef = useRef<HTMLDivElement>(null)
    const { activeChat } = useAIAgentStore()

    const store = useCurrentStore()
    const casualChatElements = useStore(store, (state) => state.casualChat.elements)
    const chatLength = useStore(store, (state) => state.casualChat.elements.length)
    const casualTitle = useStore(store, (state) => state.casualTitle)
    const execute = useStore(store, (state) => state.execute)
    // const casualLoadMoreLoading = useStore(store, (state) => state.requestHistoryState.casualLoadMoreLoading)

    const { onRangeChange } = useLoadOlder(TYPE)

    const { virtuosoRef, setScrollerRef, setIsAtBottomRef, handleTotalListHeightChanged, scrollToItemIndex } =
      useVirtuosoAutoScroll({
        total: chatLength,
      })

    const { locateToIndex } = useChatStreamLocateHighlight({
      scrollToIndex: scrollToItemIndex,
      listRootRef,
    })

    useImperativeHandle(ref, () => ({ scrollToItemIndex: (index, behavior) => locateToIndex(index, behavior) }), [])

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
      return execute ? (
        <div style={{ height: '40px', maxWidth: '784px', margin: '0 auto' }}>
          {!!casualTitle ? (
            <Loading
              size={14}
              style={{
                marginTop: 8,
              }}
            >
              <div className="text-ellipsis" style={{ fontWeight: 400, display: 'flex', alignItems: 'center' }}>
                <ScrollText text={casualTitle as string} />
              </div>
            </Loading>
          ) : (
            <div className={styles['end']}>当前会话已结束</div>
          )}
        </div>
      ) : chatLength ? (
        <div className={styles['end']}>当前会话已停止</div>
      ) : null
    }, [casualTitle, execute, chatLength])
    // const Header = useCallback(
    //   () =>
    //     casualLoadMoreLoading ? (
    //       <div style={{ height: 20, position: 'relative' }}>
    //         <YakitSpin style={{ position: 'absolute', display: 'inline' }} spinning />
    //       </div>
    //     ) : null,
    //   [casualLoadMoreLoading],
    // )
    const components = useMemo(
      () => ({
        Item,
        Footer,
        // Header,
      }),
      [Footer, Item],
    )
    // const rawData = useCurrentRawData()
    // console.log('casualChat.elements', casualChatElements, store.getState().items)
    return (
      <div ref={listRootRef} className={styles['ai-re-act-chat-contents']}>
        <Virtuoso
          key={activeChat?.SessionID}
          ref={virtuosoRef}
          scrollerRef={setScrollerRef}
          defaultItemHeight={120}
          atBottomStateChange={setIsAtBottomRef}
          data={casualChatElements}
          totalListHeightChanged={handleTotalListHeightChanged}
          itemContent={renderItem}
          initialTopMostItemIndex={chatLength > 1 ? chatLength - 1 : 0}
          components={components}
          increaseViewportBy={{ top: 1200, bottom: 0 }}
          atBottomThreshold={50}
          skipAnimationFrameInResizeObserver
          rangeChanged={onRangeChange}
          className={styles['re-act-contents-list']}
        />
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
