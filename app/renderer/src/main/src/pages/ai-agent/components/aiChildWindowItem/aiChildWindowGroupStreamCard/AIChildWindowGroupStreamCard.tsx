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
/** 子窗口版 stream group 卡片，从 rawData 中按 parentGroupToken 查找子节点 */
const AIChildWindowGroupStreamCard: FC<AIChildWindowGroupStreamCardProps> = memo((props) => {
  const { token } = props
  const { rawData, tokenVersions } = useAIConcurrentStreamStore()
  // per-token 版本：组内任一子节点变化时组版本递增（见 AIConcurrentStream 的 diff 逻辑）
  const version = tokenVersions?.get(token) || 0
  const { ref: containerRef, isFocus } = useClickFocus<HTMLDivElement>()

  const [expand, setExpand] = useState(true)
  // 按 token + 版本 缓存该 group 的子节点，避免每次渲染都全量 forEach
  const childItemTokens = useCreation<string[]>(() => {
    if (!rawData) return []
    const items: string[] = []
    rawData.forEach((value) => {
      if (value.parentGroupToken === token) {
        items.push(value.id)
      }
    })
    return items
  }, [token, version])
  const lastToken = useCreation(() => {
    return childItemTokens.length > 0 ? childItemTokens[childItemTokens.length - 1] : ''
  }, [childItemTokens.length])
  return (
    <div
      className={classNames(styles.container, {
        [styles['container-focus']]: isFocus,
      })}
      ref={containerRef}
    >
      <AIChildWindowGroupStreamCardHeardWrapper
        expand={expand}
        setExpand={setExpand}
        token={token}
        lastToken={lastToken}
        childrenTokensLength={childItemTokens.length}
      />
      <AIChildWindowGroupStreamCardListWrapper childItemTokens={childItemTokens} expand={expand} />
    </div>
  )
})

export default AIChildWindowGroupStreamCard

const AIChildWindowGroupStreamCardHeardWrapper: FC<AIChildWindowGroupStreamCardHeardWrapperProps> = memo((props) => {
  const { token, lastToken, childrenTokensLength, setExpand, expand } = props
  const { rawData, tokenVersions } = useAIConcurrentStreamStore()
  const { getLabelByParams } = useAINodeLabel()
  const version = tokenVersions?.get(token) || 0
  const lastVersion = tokenVersions?.get(lastToken) || 0

  const lastItem = useCreation(() => {
    const lastItem = rawData.get(lastToken)
    if (!lastItem) return undefined
    switch (lastItem.type) {
      case AIChatQSDataTypeEnum.STREAM:
        return lastItem

      default:
        return undefined
    }
  }, [lastToken, lastVersion])
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
  }, [lastToken, lastVersion])
  const nodeLabel = useCreation(() => {
    const groupData = rawData.get(token)
    if (!groupData) return ''
    switch (groupData.type) {
      case AIChatQSDataTypeEnum.STREAM_GROUP:
        return getLabelByParams(groupData.data?.NodeIdVerbose)

      default:
        return ''
    }
  }, [version])
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

const AIChildWindowGroupStreamCardListWrapper: React.FC<AIChildWindowGroupStreamCardListWrapperProps> = memo(
  (props) => {
    const { childItemTokens, expand } = props
    const { rawData, tokenVersions } = useAIConcurrentStreamStore()
    return (
      <>
        <AIGroupStreamCardList
          expand={expand}
          childrenTokens={childItemTokens}
          rendItem={(token, index) => {
            const itemData = rawData.get(token)
            if (!itemData) return <React.Fragment key={token}></React.Fragment>
            return (
              <AIChildWindowNodeItemWrapper
                key={token}
                itemData={itemData}
                groupIndex={index}
                // per-token 版本：内容未变化的子节点不重渲染
                renderNum={tokenVersions?.get(token) || 0}
              />
            )
          }}
        />
      </>
    )
  },
)
