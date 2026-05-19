import React, { useCallback, useMemo, useState } from 'react'
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
import { ReActChatRenderItem } from '../hooks/aiRender'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import Loading from '@/components/Loading/Loading'
import useAISystemStream from '../hooks/useAISystemStream'
import { ScrollText } from '@/pages/ai-agent/chatTemplate/TaskLoading/TaskLoading'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useLoadHistory from '../hooks/useLoadHistory'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'

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
  const { NodeId, content, NodeIdVerbose, CallToolID, ContentType } = stream.data
  const { yakExecResult } = useChatIPCStore().chatIPCData
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
          {...aiMarkdownProps}
        />
      )
    case AIStreamContentType.TEXT_PLAIN: {
      const { execFileRecord } = yakExecResult
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
    default:
      return <AIStreamChatContent content={content} nodeIdVerbose={NodeIdVerbose} referenceNode={referenceNode} />
  }
})
const TYPE = 'reAct'
export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo((props) => {
  const { chats } = props
  const {
    casualTitle,
    casualLoading,
    requestHistoryState: { casualLoadMoreLoading },
    systemStream,
  } = useChatIPCStore().chatIPCData

  const { activeChat } = useAIAgentStore()

  const { handleLoadMoreHistory, handleHasMoreHistory } = useChatIPCDispatcher().chatIPCEvents

  // 向上滚动加载
  const { firstItemIndex, handleLoadMore, isPrependingRef } = useLoadHistory({
    loading: casualLoadMoreLoading,
    dataLength: chats.elements.length,
    SessionID: activeChat?.SessionID || '',
    fetchHasMore: () => handleHasMoreHistory(TYPE),
    loadMore: () => handleLoadMoreHistory(TYPE),
  })
  const { virtuosoRef, setScrollerRef, setIsAtBottomRef, handleTotalListHeightChanged } = useVirtuosoAutoScroll({
    total: chats.elements.length,
    isPrependingRef,
  })
  const renderItem = useCallback(
    (index: number, item?: ReActChatRenderItem) => {
      if (!item?.token) return null
      const arrayIndex = index - firstItemIndex
      const hasNext = chats.elements.length - arrayIndex > 1
      return <AIChatListItem key={item.token} hasNext={hasNext} itemIndex={arrayIndex} item={item} type="re-act" />
    },
    [chats.elements.length, firstItemIndex],
  )
  const Item = useCallback(
    ({ children, style, 'data-index': dataIndex }) => (
      <div key={dataIndex} style={style} data-index={dataIndex} className={styles['item-wrapper']}>
        <div className={styles['item-inner']}>{children}</div>
      </div>
    ),
    [],
  )

  const { displayValue, mode } = useAISystemStream({
    value: casualTitle,
    systemStream,
    enabled: casualLoading,
  })
  const Footer = useCallback(
    () => (
      <div style={{ height: '40px', maxWidth: '784px', margin: '0 auto' }}>
        {casualTitle ? (
          <Loading
            size={14}
            style={{
              marginTop: 8,
            }}
          >
            <div className="text-ellipsis" style={{ fontWeight: 400, display: 'flex', alignItems: 'center' }}>
              {mode === 'value' ? displayValue : <ScrollText text={displayValue as string} />}
            </div>
          </Loading>
        ) : (
          '自由对话已完成'
        )}
      </div>
    ),
    [casualTitle, mode, displayValue],
  )
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
    <div className={styles['ai-re-act-chat-contents']}>
      <Virtuoso
        key={activeChat?.SessionID}
        ref={virtuosoRef}
        scrollerRef={setScrollerRef}
        firstItemIndex={firstItemIndex}
        atBottomStateChange={setIsAtBottomRef}
        data={chats.elements}
        totalListHeightChanged={handleTotalListHeightChanged}
        itemContent={renderItem}
        initialTopMostItemIndex={chats.elements.length > 1 ? chats.elements.length - 1 : 0}
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
})

export const AIReferenceNode: React.FC<AIReferenceNodeProps> = React.memo((props) => {
  const { referenceList } = props
  const [expand, setExpand] = useState<boolean>(false)
  const code = useCreation(() => {
    return expand ? referenceList.map((item) => item.payload).join('\n') : ''
  }, [expand, referenceList])
  return (
    <>
      <YakitModal
        visible={expand}
        title={`参考资料`}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={(e) => {
          e.stopPropagation()
          setExpand(false)
        }}
        onCloseX={(e) => {
          e.stopPropagation()
          setExpand(false)
        }}
        bodyStyle={{ height: 500 }}
        destroyOnClose
      >
        <YakitEditor type="plaintext" readOnly={true} value={code} />
      </YakitModal>
      <span
        className={styles['ai-reference-node']}
        onClick={(e) => {
          e.stopPropagation()
          setExpand(true)
        }}
      >
        [参考资料]
      </span>
    </>
  )
})
