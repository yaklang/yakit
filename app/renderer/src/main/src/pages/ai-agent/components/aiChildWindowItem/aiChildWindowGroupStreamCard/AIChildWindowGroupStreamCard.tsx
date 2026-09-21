import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { useCreation } from 'ahooks'
import { type FC, memo, useState } from 'react'
import AIChildWindowNodeItemWrapper from '../aiChildWindowNodeItemWrapper/AIChildWindowNodeItemWrapper'
import type {
  AIChildWindowGroupStreamCardHeardWrapperProps,
  AIChildWindowGroupStreamCardListWrapperProps,
  AIChildWindowGroupStreamCardProps,
} from './type'
import styles from './AIChildWindowGroupStreamCard.module.scss'
import AIGroupStreamCardHeard from '../../aiGroupStreamCard/aiGroupStreamCardHeard/AIGroupStreamCardHeard'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import { STREAM_MASK_THRESHOLD } from '../../aiGroupStreamCard/AIGroupStreamCard'
import classNames from 'classnames'
import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import AIGroupStreamCardList from '../../aiGroupStreamCard/aiGroupStreamCardList/AIGroupStreamCardList'
import React from 'react'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'
/** 子窗口版 stream group 卡片，从 rawData 中按 parentGroupToken 查找子节点 */
const AIChildWindowGroupStreamCard: FC<AIChildWindowGroupStreamCardProps> = memo((props) => {
  const { token } = props
  const { rawData, renderNum } = useAIConcurrentStreamStore()
  const { ref: containerRef, isFocus } = useClickFocus<HTMLDivElement>()

  // 按 token + renderNum 缓存该 group 的子节点，避免每次渲染都全量 forEach
  const childItemTokens = useCreation<string[]>(() => {
    if (!rawData) return []
    const items: string[] = []
    rawData.forEach((value) => {
      if (value.parentGroupToken === token) {
        items.push(value.id)
      }
    })
    return items
  }, [token, renderNum])
  const lastToken = useCreation(() => {
    return childItemTokens.length > 0 ? childItemTokens[childItemTokens.length - 1] : ''
  }, [childItemTokens.length])
  const isThought = useCreation(() => {
    const groupData = rawData.get(token)
    return groupData?.type === AIChatQSDataTypeEnum.STREAM_GROUP && groupData.data.NodeId === AI_STREAM_THOUGHT_NODE_ID
  }, [token, renderNum])
  const persistKey = childItemTokens[0] || token
  const [expand, setExpand] = useState(!isThought)
  return (
    <div
      className={classNames(styles.container, {
        [styles['container-focus']]: isFocus && !isThought,
        [styles['container-thought']]: isThought,
      })}
      ref={containerRef}
    >
      <AIChildWindowGroupStreamCardHeardWrapper
        expand={expand}
        setExpand={setExpand}
        token={token}
        lastToken={lastToken}
        childrenTokensLength={childItemTokens.length}
        persistKey={persistKey}
      />
      <AIChildWindowGroupStreamCardListWrapper
        childItemTokens={childItemTokens}
        expand={expand}
        isThought={isThought}
      />
    </div>
  )
})

export default AIChildWindowGroupStreamCard

const AIChildWindowGroupStreamCardHeardWrapper: FC<AIChildWindowGroupStreamCardHeardWrapperProps> = memo((props) => {
  const { token, lastToken, childrenTokensLength, setExpand, expand, persistKey } = props
  const { rawData, renderNum } = useAIConcurrentStreamStore()
  const { getLabelByParams } = useAINodeLabel()

  const lastItem = useCreation(() => {
    const lastItem = rawData.get(lastToken)
    if (!lastItem) return undefined
    switch (lastItem.type) {
      case AIChatQSDataTypeEnum.STREAM:
        return lastItem

      default:
        return undefined
    }
  }, [lastToken, renderNum])
  const shouldShowMask = useCreation(() => {
    const lastItem = rawData.get(lastToken)
    if (!lastItem) return false
    switch (lastItem.type) {
      case AIChatQSDataTypeEnum.STREAM: {
        const contentLength = lastItem.data?.content?.length || 0
        return contentLength > STREAM_MASK_THRESHOLD
      }
      default:
        return false
    }
  }, [lastToken, renderNum])
  const { nodeId, nodeLabel } = useCreation(() => {
    const groupData = rawData.get(token)
    if (!groupData) return { nodeId: undefined, nodeLabel: '' }
    switch (groupData.type) {
      case AIChatQSDataTypeEnum.STREAM_GROUP:
        return { nodeId: groupData.data.NodeId, nodeLabel: getLabelByParams(groupData.data.NodeIdVerbose) }

      default:
        return { nodeId: undefined, nodeLabel: '' }
    }
  }, [renderNum])
  return (
    <AIGroupStreamCardHeard
      expand={expand}
      setExpand={setExpand}
      lastItem={lastItem}
      nodeId={nodeId}
      nodeLabel={nodeLabel}
      shouldShowMask={shouldShowMask}
      childrenTokensLength={childrenTokensLength}
      persistKey={persistKey}
    />
  )
})

const AIChildWindowGroupStreamCardListWrapper: React.FC<AIChildWindowGroupStreamCardListWrapperProps> = memo(
  (props) => {
    const { childItemTokens, expand, isThought } = props
    const { rawData, renderNum } = useAIConcurrentStreamStore()
    return (
      <>
        <AIGroupStreamCardList
          expand={expand}
          childrenTokens={childItemTokens}
          isThought={isThought}
          rendItem={(token, index) => {
            const itemData = rawData.get(token)
            if (!itemData) return <React.Fragment key={token}></React.Fragment>
            return (
              <AIChildWindowNodeItemWrapper
                key={token}
                itemData={itemData}
                groupIndex={index}
                renderNum={renderNum ?? 0}
              />
            )
          }}
        />
      </>
    )
  },
)
