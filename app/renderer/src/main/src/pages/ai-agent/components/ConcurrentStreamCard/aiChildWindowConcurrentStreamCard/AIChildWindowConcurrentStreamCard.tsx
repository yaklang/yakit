import classNames from 'classnames'
import { type FC, memo } from 'react'
import ConcurrentStreamCardHeard from '../concurrentStreamCardHeard/ConcurrentStreamCardHeard'
import styles from './AIChildWindowConcurrentStreamCard.module.scss'
import AINodeItem from '../../aiChatListItem/aiNodeItem/AINodeItem'
import {
  AIChatQSDataTypeEnum,
  type AIChatQSData,
  type ChatStream,
  type ChatTaskNodeGroup,
} from '@/pages/ai-re-act/hooks/aiRender'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import useAIConcurrentStreamDispatcher from '@/auxWindow/pages/AIConcurrentStream/useContext/useDispatcher'
import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import {
  AIChildWindowGroupItemProps,
  AIChildWindowGroupStreamCardProps,
  AIChildWindowNodeItemWrapperProps,
} from './type'
import useBoolean from 'ahooks/lib/useBoolean'
import useCreation from 'ahooks/lib/useCreation'

export interface AIChildWindowConcurrentStreamCardProps {
  token: string
}

/** 子窗口版并发流卡片（task_node_group 类型），数据从 auxWindow context 读取 */
const AIChildWindowConcurrentStreamCard: FC<AIChildWindowConcurrentStreamCardProps> = memo((props) => {
  const { token } = props
  const [expand, { toggle: expandToggle }] = useBoolean(true)

  const { rawData, renderNum } = useAIConcurrentStreamStore()
  const { requestRefresh } = useAIConcurrentStreamDispatcher()

  const itemData = useCreation<ChatTaskNodeGroup | undefined>(() => {
    if (!rawData) return undefined
    const itemData = rawData.get(token)
    if (!itemData) return undefined
    return itemData as ChatTaskNodeGroup
  }, [renderNum])

  return (
    <div className={classNames(styles['chat-card'], styles['child-chat-card'], 'concurrent-stream-card')}>
      <ConcurrentStreamCardHeard
        isChildWindow={true}
        expand={expand}
        expandToggle={expandToggle}
        rowData={itemData}
        token={token}
        onRefresh={requestRefresh}
      />
      {expand ? <AIChildWindowConcurrentStreamContent /> : null}
    </div>
  )
})

export default AIChildWindowConcurrentStreamCard

// #region 子窗口并发流内容区

const AIChildWindowConcurrentStreamContent: FC = memo(() => {
  const { childrenTokens, rawData, renderNum } = useAIConcurrentStreamStore()
  const { ref: scrollRef, isFocus } = useClickFocus<HTMLDivElement>()

  return (
    <div className={styles['concurrent-stream-content-wrapper']}>
      <div
        className={styles['content']}
        hidden={!childrenTokens?.length}
        style={{ flex: 1, maxHeight: 'inherit', height: 0 }}
      >
        <div
          ref={scrollRef}
          className={classNames(styles['concurrent-stream-content'], {
            [styles.focused]: isFocus,
          })}
          style={{ maxHeight: 'inherit', height: '100%', overflowY: 'auto' }}
        >
          {childrenTokens?.map((token) => {
            const item = rawData?.get(token)
            if (!item) return null
            if (item.parentGroupToken) {
              if (!rawData) return null
              return <AIChildWindowGroupItem key={token} token={token} />
            }
            return <AIChildWindowNodeItemWrapper key={token} itemData={item} renderNum={renderNum ?? 0} />
          })}
        </div>
      </div>
    </div>
  )
})

// #endregion

// #region 子窗口 group 渲染

/** 子窗口版 group item，数据从 rawData Map 获取 */
const AIChildWindowGroupItem: FC<AIChildWindowGroupItemProps> = memo(({ token }) => {
  const { rawData } = useAIConcurrentStreamStore()
  const itemData = rawData?.get(token)
  if (!itemData || !rawData) return null

  switch (itemData.type) {
    case AIChatQSDataTypeEnum.STREAM_GROUP:
      return <AIChildWindowGroupStreamCard token={token} />
    default:
      return null
  }
})

/** 子窗口版 stream group 卡片，从 rawData 中按 parentGroupToken 查找子节点 */
const AIChildWindowGroupStreamCard: FC<AIChildWindowGroupStreamCardProps> = memo(({ token }) => {
  const { rawData, renderNum } = useAIConcurrentStreamStore()
  // 按 token + renderNum 缓存该 group 的子节点，避免每次渲染都全量 forEach
  const childItems = useCreation<AIChatQSData[]>(() => {
    if (!rawData) return []
    const items: AIChatQSData[] = []
    rawData.forEach((value) => {
      if (value.parentGroupToken === token) {
        items.push(value)
      }
    })
    return items
  }, [rawData, token, renderNum])

  return (
    <div className={styles['concurrent-stream-content-item']}>
      {childItems.map((item) => (
        <AIChildWindowNodeItemWrapper key={item.id} itemData={item} renderNum={renderNum ?? 0} />
      ))}
    </div>
  )
})

// #endregion

// #region 子窗口 node item 渲染

/**
 * 子窗口版 node item 包装器。
 * STREAM 类型依赖 streaming hooks（useTypedStream → useCurrentStore），
 * 子窗口无 store，故 STREAM 直接展示纯文本内容；其余类型复用 AINodeItem。
 */
const AIChildWindowNodeItemWrapper: FC<AIChildWindowNodeItemWrapperProps> = memo(({ itemData, renderNum }) => {
  if (itemData.type === AIChatQSDataTypeEnum.STREAM) {
    const streamData = itemData as ChatStream
    return (
      <div className={styles['concurrent-stream-content-item']}>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{streamData.data?.content || ''}</div>
      </div>
    )
  }
  return (
    <div className={styles['concurrent-stream-content-item']}>
      <AINodeItem itemData={itemData} renderNum={renderNum} />
    </div>
  )
})

// #endregion
