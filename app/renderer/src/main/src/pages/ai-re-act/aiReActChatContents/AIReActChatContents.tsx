import React, { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react'
import classNames from 'classnames'
import { AIReActChatContentsPProps, AIReferenceNodeProps, AIStreamNodeProps } from './AIReActChatContentsType'
import styles from './AIReActChatContents.module.scss'
import { useCreation } from 'ahooks'
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
import { ChatReferenceMaterialPayload, ReActChatRenderItem } from '../hooks/aiRender'
import Loading from '@/components/Loading/Loading'
import { ScrollText } from '@/pages/ai-agent/chatTemplate/TaskLoading/TaskLoading'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useLoadHistory from '../hooks/useLoadHistory'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import AITextSyntaxFlow from '@/pages/ai-agent/components/aiTextSyntaxFlow/AITextSyntaxFlow'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

const getAIReferenceNodeByType = (contentType?: string) => {
  switch (contentType) {
    case AIStreamContentType.TEXT_MARKDOWN:
      return styles['ai-text-markdown-reference-node']
    case AIStreamContentType.CODE_YAKLANG:
    case AIStreamContentType.CODE_HTTP_REQUEST:
      return styles['ai-yaklang-reference-node']
    case AIStreamContentType.TEXT_PLAIN:
      return styles['ai-text-plain-reference-node']
    case AIStreamContentType.LOG_TOOL:
      return styles['ai-log-tool-reference-node']
    default:
      return styles['ai-stream-chat-reference-node']
  }
}
export const AIStreamNode: React.FC<AIStreamNodeProps> = React.memo((props) => {
  const { stream, aiMarkdownProps, listItemIndex, streamChatSessionId } = props
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
    const className = getAIReferenceNodeByType(ContentType)
    return !!reference ? <AIReferenceNode referenceList={reference || []} className={className} /> : <></>
  }, [reference, ContentType])
  if (ContentType?.startsWith('code/')) {
    return (
      <AIYaklangCode
        contentType={ContentType}
        content={content}
        autoApplyStreamId={stream.id}
        autoApplyChatSessionId={streamChatSessionId}
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
          modalInfo={modalInfo}
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
  forwardRef((props, ref) => {
    const { activeChat } = useAIAgentStore()

    const store = useCurrentStore()
    const casualChat = useStore(store, (state) => state.casualChat)
    const chatLength = useStore(store, (state) => state.casualChat.elements.length)
    const casualTitle = useStore(store, (state) => state.casualTitle)
    const execute = useStore(store, (state) => state.execute)
    const casualLoadMoreLoading = useStore(store, (state) => state.requestHistoryState.casualLoadMoreLoading)

    /** TODO - 新版中历史逻辑暂未补充 */
    const { handleLoadMoreHistory, handleHasMoreHistory } = useChatIPCDispatcher().chatIPCEvents

    // 向上滚动加载
    const { firstItemIndex, handleLoadMore, isPrependingRef } = useLoadHistory({
      loading: casualLoadMoreLoading,
      dataLength: chatLength,
      SessionID: activeChat?.SessionID || '',
      fetchHasMore: () => handleHasMoreHistory(TYPE),
      loadMore: () => handleLoadMoreHistory(TYPE),
    })
    const { virtuosoRef, setScrollerRef, setIsAtBottomRef, handleTotalListHeightChanged, scrollToItemIndex } =
      useVirtuosoAutoScroll({
        total: chatLength,
        isPrependingRef,
      })

    const { locateToIndex } = useChatStreamLocateHighlight({
      scrollToIndex: scrollToItemIndex,
      listRootRef,
    })

    useImperativeHandle(ref, () => ({ scrollToItemIndex: locateToIndex }), [locateToIndex])

    const renderItem = useCallback((_, item?: ReActChatRenderElement) => {
      if (!item?.token) return null
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
    const Header = useCallback(
      () =>
        casualLoadMoreLoading ? (
          <div style={{ height: 20, position: 'relative' }}>
            <YakitSpin style={{ position: 'absolute', display: 'inline' }} spinning />
          </div>
        ) : null,
      [casualLoadMoreLoading],
    )
    const components = useMemo(
      () => ({
        Item,
        Footer,
        Header,
      }),
      [Footer, Header, Item],
    )
    return (
      <div ref={listRootRef} className={styles['ai-re-act-chat-contents']}>
        <Virtuoso
          key={activeChat?.SessionID}
          ref={virtuosoRef}
          scrollerRef={setScrollerRef}
          firstItemIndex={firstItemIndex}
          atBottomStateChange={setIsAtBottomRef}
          data={casualChat}
          totalListHeightChanged={handleTotalListHeightChanged}
          itemContent={renderItem}
          initialTopMostItemIndex={chatLength > 1 ? chatLength - 1 : 0}
          components={components}
          atBottomThreshold={50}
          skipAnimationFrameInResizeObserver
          // atTopStateChange={handleAtTopStateChange}
          startReached={handleLoadMore}
          // increaseViewportBy={{ top: 200, bottom: 0 }}
          className={styles['re-act-contents-list']}
        />
      </div>
    )
  }),
)

/** 挂到 body，避免 Virtuoso 滚出视口时卸载列表项导致弹窗消失 */
export const openAIReferenceModal = (referenceList: ChatReferenceMaterialPayload, title = '参考资料') => {
  const code = referenceList.map((item) => item.payload).join('\n')
  const modal = showYakitModal({
    title,
    cancelButtonProps: { style: { display: 'none' } },
    bodyStyle: { height: 500 },
    content: <YakitEditor type="plaintext" readOnly value={code} />,
    onOk: () => modal.destroy(),
  })
}

export const AIReferenceNode: React.FC<AIReferenceNodeProps> = React.memo((props) => {
  const { referenceList, className } = props
  return (
    <span
      className={classNames(styles['ai-reference-node'], className)}
      onClick={(e) => {
        e.stopPropagation()
        openAIReferenceModal(referenceList)
      }}
    >
      [参考资料]
    </span>
  )
})
