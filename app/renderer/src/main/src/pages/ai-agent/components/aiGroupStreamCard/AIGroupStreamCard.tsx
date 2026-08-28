import { useCreation } from 'ahooks'
import {
  AIChatQSDataTypeEnum,
  type ChatReferenceMaterialPayload,
  type ChatStream,
} from '@/pages/ai-re-act/hooks/aiRender'
import { type CSSProperties, type FC, useRef, useEffect, useMemo, memo } from 'react'
import styles from './AIGroupStreamCard.module.scss'
import classNames from 'classnames'
import useClickFocus from '../../../ai-re-act/hooks/useClickFocus'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import type { AIGroupStreamCardHeardWrapperProps, AIGroupStreamCardListWrapperProps } from './type'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import AIGroupStreamCardHeard from './aiGroupStreamCardHeard/AIGroupStreamCardHeard'
import AIGroupStreamCardList from './aiGroupStreamCardList/AIGroupStreamCardList'
import { useTypedStream } from '../aiChatListItem/StreamingChatContent/hooks/useTypedStream'
import { AIReferenceNode } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import { OutlineChevrondownIcon, OutlineThoughtIcon } from '@/assets/icon/outline'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'
import { useUiExpand } from '@/pages/ai-re-act/hooks/useUiExpand'
import ThoughtDuration from '../thoughtDuration/ThoughtDuration'

export const Code: FC<{ code: ChatReferenceMaterialPayload; style: CSSProperties }> = ({ code, style }) => {
  return (
    <pre className={styles['code-wrapper']} style={style}>
      {code.map((item, index) => (
        <code key={`${item.event_uuid}-${index}`}>{item.payload}</code>
      ))}
    </pre>
  )
}

export const AIGroupStreamNode: FC<{
  itemData: ChatStream
  renderNum: number
  seqNo: string
  sessionId: string
}> = memo(({ itemData, renderNum, seqNo, sessionId }) => {
  // 仅获取用于显示的 content（已应用打字效果）
  const { content } = useTypedStream({
    getContent: () => itemData.data.content,
    getStatus: () => itemData.data.status,
    disableTyping: itemData.data.NodeId === AI_STREAM_THOUGHT_NODE_ID,
  })

  const { getLabelByParams } = useAINodeLabel()

  const nodeLabel = useCreation(() => {
    if (!itemData) return
    switch (itemData.type) {
      case AIChatQSDataTypeEnum.STREAM:
        return getLabelByParams(itemData.data?.NodeIdVerbose)

      default:
        return ''
    }
  }, [])

  const hidden = useCreation(() => {
    return !itemData?.reference?.length
  }, [renderNum, itemData?.reference?.length])

  return (
    <div className={styles['single-stream-text']}>
      {seqNo}
      {content}
      {!hidden && (
        <AIReferenceNode
          referenceList={itemData.reference || []}
          sessionId={sessionId}
          title={`${seqNo}${nodeLabel}`}
        />
      )}
    </div>
  )
})

export const STREAM_MASK_THRESHOLD = 170

const AIGroupThoughtHeader: FC<AIGroupStreamCardHeardWrapperProps> = memo((props) => {
  const { expand, setExpand, token } = props
  const { getLabelByParams } = useAINodeLabel()
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const renderNum = useStore(store, (state) => state.groups[token]?.renderNum)
  const groupData = useCreation(() => rawData.contents.get(token), [renderNum])

  const nodeLabel = useCreation(() => {
    if (!groupData) return ''
    switch (groupData.type) {
      case AIChatQSDataTypeEnum.STREAM_GROUP:
        return getLabelByParams(groupData.data?.NodeIdVerbose)
      default:
        return ''
    }
  }, [renderNum])

  const lastToken = useCreation(() => {
    if (!groupData) return ''
    switch (groupData.type) {
      case AIChatQSDataTypeEnum.STREAM_GROUP:
        return groupData.data.lastToken
      default:
        return ''
    }
  }, [renderNum])

  const lastItemRenderNum = useStore(store, (state) => state.items[lastToken]?.renderNum)
  const persistKey = useStore(store, (state) => state.groups[token]?.childrenTokens[0] || token)
  const streaming = useCreation(() => {
    const lastItem = rawData.contents.get(lastToken)
    return lastItem?.type === AIChatQSDataTypeEnum.STREAM && lastItem.data.status !== 'end'
  }, [lastToken, lastItemRenderNum])

  return (
    <div className={styles['thought-header']} onClick={() => setExpand((open) => !open)}>
      <OutlineThoughtIcon className={styles['thought-icon']} />
      <span className={classNames({ [styles['thought-title-blink']]: streaming })}>
        {nodeLabel}
        <ThoughtDuration persistKey={persistKey} status={streaming ? 'start' : 'end'} />
      </span>
      <OutlineChevrondownIcon
        className={classNames(styles['thought-chevron'], {
          [styles['thought-chevron-collapsed']]: !expand,
        })}
      />
    </div>
  )
})

const AIGroupStreamCard: FC<{
  token: string
}> = memo(({ token }) => {
  const { ref: containerRef, isFocus } = useClickFocus<HTMLDivElement>()
  const store = useCurrentStore()
  const nodeId = useStore(store, (state) => state.groups[token]?.nodeId)
  const isThought = nodeId === AI_STREAM_THOUGHT_NODE_ID
  const [expand, setExpand] = useUiExpand(token, !isThought)

  return (
    <div
      className={classNames(styles.container, {
        [styles['container-focus']]: isFocus && !isThought,
        [styles['container-thought']]: isThought,
      })}
      ref={containerRef}
    >
      {isThought ? (
        <AIGroupThoughtHeader expand={expand} setExpand={setExpand} token={token} />
      ) : (
        <AIGroupStreamCardHeardWrapper expand={expand} setExpand={setExpand} token={token} />
      )}
      <AIGroupStreamCardListWrapper expand={expand} token={token} isThought={isThought} />
    </div>
  )
})
export default AIGroupStreamCard

const AIGroupStreamCardListWrapper: React.FC<AIGroupStreamCardListWrapperProps> = memo((props) => {
  const { expand, token, isThought } = props
  const store = useCurrentStore()
  const childrenTokens = useStore(store, (state) => state.groups[token]?.childrenTokens || [])
  return <AIGroupStreamCardList expand={expand} childrenTokens={childrenTokens} isThought={isThought} />
})
const AIGroupStreamCardHeardWrapper: React.FC<AIGroupStreamCardHeardWrapperProps> = memo((props) => {
  const { expand, setExpand, token } = props

  const { getLabelByParams } = useAINodeLabel()

  const perHasNext = useRef<boolean>(true)

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const chatLength = useStore(store, (state) => state.chatElements.length)
  const renderNum = useStore(store, (state) => state.groups[token]?.renderNum)
  const childrenTokensLength = useStore(store, (state) => state.groups[token]?.childrenTokens.length || 0)

  /** 可能存在第一次拿到的数据为undefined  */
  const groupData = useCreation(() => {
    return rawData.contents.get(token)
  }, [renderNum])

  const lastToken = useCreation(() => {
    if (!groupData) return ''
    switch (groupData.type) {
      case AIChatQSDataTypeEnum.STREAM_GROUP:
        return groupData.data.lastToken

      default:
        return ''
    }
  }, [renderNum])

  const lastItemRenderNum = useStore(store, (state) => state.items[lastToken]?.renderNum)

  const isLastActiveGroup = useCreation(() => {
    if (expand === false) return false
    if (perHasNext.current === false) return false
    perHasNext.current = store.getState().chatElements[chatLength - 1]?.token === token
    return perHasNext.current
  }, [chatLength])

  const nodeLabel = useCreation(() => {
    if (!groupData) return ''
    switch (groupData.type) {
      case AIChatQSDataTypeEnum.STREAM_GROUP:
        return getLabelByParams(groupData.data?.NodeIdVerbose)

      default:
        return ''
    }
  }, [renderNum])

  useEffect(() => {
    if (isLastActiveGroup) {
      setExpand(false)
    }
  }, [isLastActiveGroup])

  const shouldShowMask = useMemo(() => {
    const lastItem = rawData.contents.get(lastToken)
    if (!lastItem) return false
    switch (lastItem.type) {
      case AIChatQSDataTypeEnum.STREAM: {
        const contentLength = lastItem.data?.content?.length || 0
        return contentLength > STREAM_MASK_THRESHOLD
      }
      default:
        return false
    }
  }, [lastToken, lastItemRenderNum])

  const lastItem = useCreation(() => {
    const lastItem = rawData.contents.get(lastToken)
    if (!lastItem) return undefined
    switch (lastItem.type) {
      case AIChatQSDataTypeEnum.STREAM:
        return lastItem

      default:
        return undefined
    }
  }, [lastItemRenderNum])

  return (
    <AIGroupStreamCardHeard
      expand={expand}
      setExpand={setExpand}
      lastItem={lastItem}
      nodeLabel={nodeLabel}
      shouldShowMask={shouldShowMask}
      childrenTokensLength={childrenTokensLength}
    />
  )
})
