import { AIStreamNode } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import { type ReActChatElement, type ReActChatRenderItem } from '@/pages/ai-re-act/hooks/aiRender'
import { memo, type FC } from 'react'
import { useTypedStream } from './hooks/useTypedStream'
import AIGroupStreamCard from '../../aiGroupStreamCard/AIGroupStreamCard'
import ConcurrentStreamCard from '../../ConcurrentStreamCard/ConcurrentStreamCard'

type StreamCls = { className: string } | { aiMarkdownProps?: { className: string } }

type StreamingChatContentProps = ReActChatRenderItem & {
  streamClassName?: StreamCls
  hasNext?: boolean
  session: string
  itemIndex?: number
}

type SingleStreamProps = {
  chatType: ReActChatElement['chatType']
  token: string
  streamClassName?: StreamCls
  session: string
  listItemIndex?: number
}

const AIStreamCard: FC<SingleStreamProps> = ({ chatType, token, streamClassName, session, listItemIndex }) => {
  const { stream } = useTypedStream({ chatType, token, session })
  if (!stream) return null

  return (
    <AIStreamNode {...streamClassName} stream={stream} listItemIndex={listItemIndex} streamChatSessionId={session} />
  )
}

const StreamingChatContent: FC<StreamingChatContentProps> = (props) => {
  const { streamClassName, chatType, token, hasNext, session, itemIndex: listItemIndex } = props
  if (props.kind === 'task') {
    return <ConcurrentStreamCard token={token} session={session} elements={props.children} chatType={chatType} />
  }
  if (props.kind === 'group') {
    return <AIGroupStreamCard session={session} elements={props.children} hasNext={hasNext} />
  }
  return (
    <AIStreamCard
      session={session}
      chatType={chatType}
      token={token}
      listItemIndex={listItemIndex}
      streamClassName={streamClassName}
    />
  )
}
export default memo(StreamingChatContent)
