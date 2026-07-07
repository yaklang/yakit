import { AIStreamNode } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import { AIChatQSDataTypeEnum, ChatStream, type ReActChatRenderItem } from '@/pages/ai-re-act/hooks/aiRender'
import { memo, type FC } from 'react'
import { useTypedStream } from './hooks/useTypedStream'
import AIGroupStreamCard from '../../aiGroupStreamCard/AIGroupStreamCard'
import AITaskDefaultGroupCard from '../../AITaskDefaultGroupCard/AITaskDefaultGroupCard'
import ConcurrentStreamCard from '../../ConcurrentStreamCard/ConcurrentStreamCard'
import { useCreation } from 'ahooks'
import styles from './StreamingChatContent.module.scss'

type StreamCls = { className: string } | { aiMarkdownProps?: { className: string } }

type StreamingChatContentProps = ReActChatRenderItem & {
  streamClassName?: StreamCls
  hasNext?: boolean
  session: string
  itemIndex?: number
}

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

const StreamingChatContent: FC<StreamingChatContentProps> = (props) => {
  const { streamClassName, chatType, token, session } = props
  if (props.kind === 'task') {
    if (props.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP) {
      return <AITaskDefaultGroupCard token={token} session={session} chatType={chatType} elements={props.children} />
    } else {
      return <ConcurrentStreamCard token={token} session={session} elements={props.children} chatType={chatType} />
    }
  }
  if (props.kind === 'group') {
    return <AIGroupStreamCard elements={props.children} token={token} />
  }
  return null
  // return <AIStreamCard session={session} token={token} streamClassName={streamClassName} />
}
export default memo(StreamingChatContent)
