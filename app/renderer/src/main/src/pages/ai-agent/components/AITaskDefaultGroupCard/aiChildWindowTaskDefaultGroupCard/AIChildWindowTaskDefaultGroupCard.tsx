import { useBoolean, useCreation } from 'ahooks'
import classNames from 'classnames'
import { type FC, memo } from 'react'
import AITaskDefaultGroupCardHeard from '../aiTaskDefaultGroupCardHeard/AITaskDefaultGroupCardHeard'
import { AIChildWindowTaskDefaultGroupCardProps, AIChildWindowTaskDefaultGroupContentProps } from './type'
import styles from './AIChildWindowTaskDefaultGroupCard.module.scss'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import useAIConcurrentStreamDispatcher from '@/auxWindow/pages/AIConcurrentStream/useContext/useDispatcher'
import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import AINodeItem from '../../aiChatListItem/aiNodeItem/AINodeItem'
import { AIChatQSDataTypeEnum, type AIChatQSData, type ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import React from 'react'

const AIChildWindowTaskDefaultGroupCard: FC<AIChildWindowTaskDefaultGroupCardProps> = memo((props) => {
  const { token } = props
  const [expand, { toggle: expandToggle }] = useBoolean(true)

  const { rawData } = useAIConcurrentStreamStore()
  const { requestRefresh } = useAIConcurrentStreamDispatcher()
  const timeStamp = useCreation(() => {
    if (!rawData) return 0
    const itemData = rawData.get(token)
    if (!itemData) return 0
    return itemData.Timestamp || 0
  }, [])

  return (
    <div
      className={classNames(styles['ai-task-default-group-card'], {
        [styles['expand']]: true,
        [styles['child-window-card']]: true,
      })}
    >
      <AITaskDefaultGroupCardHeard
        isChildWindow={true}
        expandToggle={expandToggle}
        timeStamp={timeStamp}
        expand={expand}
        token={token}
        onRefresh={requestRefresh}
      />

      {expand ? <AIChildWindowTaskDefaultGroupContent /> : null}
    </div>
  )
})

export default AIChildWindowTaskDefaultGroupCard

const AIChildWindowTaskDefaultGroupContent: FC<AIChildWindowTaskDefaultGroupContentProps> = memo((props) => {
  const { childrenTokens, rawData } = useAIConcurrentStreamStore()

  const { ref: scrollRef, isFocus } = useClickFocus<HTMLDivElement>()
  return (
    <div
      className={classNames(styles['ai-task-default-group-card-content'], {
        [styles['child-window']]: true,
      })}
    >
      <div className={styles['content-inner']}>
        <div className={styles['concurrent-stream-content-wrapper']}>
          <div
            className={styles['content']}
            hidden={childrenTokens?.length === 0}
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
                if (!item) return <React.Fragment key={token} />
                if (item.parentGroupToken) {
                  if (!rawData) return <React.Fragment key={token} />
                  return <AIChildWindowGroupItem key={token} token={token} rawData={rawData} />
                } else {
                  return <AIChildWindowNodeItemWrapper key={token} itemData={item} />
                }
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// #region 子窗口 group 渲染

/** 子窗口版 group item，数据从 rawData Map 获取 */
const AIChildWindowGroupItem: FC<{ token: string; rawData: Map<string, AIChatQSData> }> = memo(({ token, rawData }) => {
  const itemData = rawData.get(token)
  if (!itemData) return null

  switch (itemData.type) {
    case AIChatQSDataTypeEnum.STREAM_GROUP:
      return <AIChildWindowGroupStreamCard token={token} rawData={rawData} />
    default:
      return null
  }
})

/** 子窗口版 stream group 卡片，从 rawData 中按 parentGroupToken 查找子节点 */
const AIChildWindowGroupStreamCard: FC<{ token: string; rawData: Map<string, AIChatQSData> }> = memo(
  ({ token, rawData }) => {
    // 按 token + rawData 缓存该 group 的子节点，避免每次渲染都全量 forEach
    const childItems = useCreation<AIChatQSData[]>(() => {
      const items: AIChatQSData[] = []
      rawData.forEach((value) => {
        if (value.parentGroupToken === token) {
          items.push(value)
        }
      })
      return items
    }, [rawData, token])

    return (
      <div className={styles['concurrent-stream-content']}>
        {childItems.map((item) => (
          <AIChildWindowNodeItemWrapper key={item.id} itemData={item} />
        ))}
      </div>
    )
  },
)

// #endregion

// #region 子窗口 node item 渲染

/**
 * 子窗口版 node item 包装器。
 * STREAM 类型依赖 streaming hooks（useTypedStream → useCurrentStore），
 * 子窗口无 store，故 STREAM 直接展示纯文本内容；其余类型复用 AINodeItem。
 */
const AIChildWindowNodeItemWrapper: FC<{ itemData: AIChatQSData }> = memo(({ itemData }) => {
  if (itemData.type === AIChatQSDataTypeEnum.STREAM) {
    const streamData = itemData as ChatStream
    return (
      <div className={styles['concurrent-stream-content']}>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{streamData.data?.content || ''}</div>
      </div>
    )
  }
  return (
    <div className={styles['concurrent-stream-content']}>
      <AINodeItem itemData={itemData} renderNum={0} />
    </div>
  )
})

// #endregion
