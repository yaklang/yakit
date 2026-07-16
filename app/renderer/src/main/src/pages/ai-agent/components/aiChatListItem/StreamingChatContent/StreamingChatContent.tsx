import { AIStreamNode } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { type FC } from 'react'
import { useTypedStream } from './hooks/useTypedStream'
import { useCreation } from 'ahooks'
import styles from './StreamingChatContent.module.scss'

type StreamCls = { className: string } | { aiMarkdownProps?: { className: string } }

type SingleStreamProps = {
  itemData: ChatStream
  renderNum: number
}

export const AIStreamCard: FC<SingleStreamProps> = ({ itemData }) => {
  const { stream } = useTypedStream({ token: itemData.id })

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
