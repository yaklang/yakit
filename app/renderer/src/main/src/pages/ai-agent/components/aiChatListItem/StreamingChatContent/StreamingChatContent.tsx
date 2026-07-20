import { AIStreamNode } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { type FC, useMemo } from 'react'
import { useTypedStream } from './hooks/useTypedStream'
import { useCreation, useMemoizedFn } from 'ahooks'
import styles from './StreamingChatContent.module.scss'

type SingleStreamProps = {
  itemData: ChatStream
  renderNum: number
}

export const AIStreamCard: FC<SingleStreamProps> = ({ itemData, renderNum }) => {
  const getContent = useMemoizedFn(() => {
    return itemData.data.content
  })

  const getStatus = useMemoizedFn(() => {
    return itemData.data.status
  })
  // 仅获取用于显示的 content（已应用打字效果）
  const { content } = useTypedStream({
    getContent: () => getContent(),
    getStatus: () => getStatus(),
  })

  const stream = useMemo<ChatStream | null>(() => {
    // 用打字机处理后的 content 覆盖原始 content，其余字段保持原始引用
    return {
      ...itemData,
      data: {
        ...itemData.data,
        content,
      },
    }
  }, [content, renderNum])

  const aiStreamNodeProps = useCreation(() => {
    switch (itemData.chatType) {
      case 'reAct':
        return {
          className: styles['ai-mark-down-wrapper'],
        }

      default:
        return {
          className: '',
        }
    }
  }, [itemData.chatType])
  if (!stream) return null
  return <AIStreamNode aiMarkdownProps={aiStreamNodeProps} stream={stream} />
}
