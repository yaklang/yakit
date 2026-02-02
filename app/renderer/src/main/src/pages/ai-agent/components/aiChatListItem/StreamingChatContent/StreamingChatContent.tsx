import {AIStreamNode} from "@/pages/ai-re-act/aiReActChatContents/AIReActChatContents"
import type {ReActChatElement, ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import {memo, type FC} from "react"
import {useTypedStream} from "./hooks/useTypedStream"
import AIGroupStreamCard from '../../aiGroupStreamCard/AIGroupStreamCard'

type StreamCls = {className: string} | {aiMarkdownProps?: {className: string}}

type StreamingChatContentProps = ReActChatRenderItem & {
    streamClassName?: StreamCls
    hasNext?: boolean
}

type SingleStreamProps = {
    chatType: ReActChatElement["chatType"]
    token: string
    streamClassName?: StreamCls
}

const AIStreamCard: FC<SingleStreamProps> = ({chatType, token, streamClassName}) => {
    const {stream} = useTypedStream({chatType, token})
    if (!stream) return null

    return <AIStreamNode {...streamClassName} stream={stream} />
}

const StreamingChatContent: FC<StreamingChatContentProps> = (props) => {
    const {streamClassName, chatType, token, hasNext} = props

    if (props.isGroup === true) {
        return <AIGroupStreamCard elements={props.children} hasNext={hasNext} />
    }
    return <AIStreamCard chatType={chatType} token={token} streamClassName={streamClassName} />
}
export default memo(StreamingChatContent)
