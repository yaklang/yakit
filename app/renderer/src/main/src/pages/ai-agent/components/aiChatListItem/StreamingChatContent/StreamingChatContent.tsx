import { AIStreamNode } from '@/pages/ai-re-act/aiReActChatContents/AIReActChatContents'
import {
  AIChatQSDataTypeEnum,
  ReActChatGroupElement,
  ReActChatTaskIndexGroupElement,
  type ReActChatElement,
  type ReActChatRenderItem,
} from '@/pages/ai-re-act/hooks/aiRender'
import { memo, type FC } from 'react'
import { useTypedStream } from './hooks/useTypedStream'
import AIGroupStreamCard from '../../aiGroupStreamCard/AIGroupStreamCard'

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

const isStreamGroupItem = (
  props: StreamingChatContentProps,
): props is StreamingChatContentProps & ReActChatGroupElement =>
  props.type === AIChatQSDataTypeEnum.STREAM_GROUP && (props as ReActChatGroupElement).isGroup === true

const isTaskIndexGroupItem = (
  props: StreamingChatContentProps,
): props is StreamingChatContentProps & ReActChatTaskIndexGroupElement =>
  (props as ReActChatTaskIndexGroupElement).isTaskGroup === true

const AIStreamCard: FC<SingleStreamProps> = ({ chatType, token, streamClassName, session, listItemIndex }) => {
  const { stream } = useTypedStream({ chatType, token, session })
  if (!stream) return null

  return (
    <AIStreamNode {...streamClassName} stream={stream} listItemIndex={listItemIndex} streamChatSessionId={session} />
  )
}

const StreamingChatContent: FC<StreamingChatContentProps> = (props) => {
  const { streamClassName, chatType, token, hasNext, session, itemIndex: listItemIndex } = props
  if (isTaskIndexGroupItem(props)) {
    return <>{/* 此处等待ui组件支持taskIndexGroup */}</>
  }
  if (isStreamGroupItem(props)) {
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
