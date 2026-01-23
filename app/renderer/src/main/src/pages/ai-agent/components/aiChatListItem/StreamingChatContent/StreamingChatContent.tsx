import {AIStreamNode} from "@/pages/ai-re-act/aiReActChatContents/AIReActChatContents"
import type {ReActChatElement, ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import {memo, type FC} from "react"
import {useStreamingChatContent} from "./hooks/useStreamingChatContent"
import AIGroupStreamCard from '../../aiGroupStreamCard/AIGroupStreamCard'

type StreamCls = {className: string} | {aiMarkdownProps?: {className: string}}

type StreamingChatContentProps = ReActChatRenderItem & {
    streamClassName?: StreamCls
}

type SingleStreamProps = {
    chatType: ReActChatElement["chatType"]
    token: string
    streamClassName?: StreamCls
}

const AIStreamCard: FC<SingleStreamProps> = ({chatType, token, streamClassName}) => {
    const renderData = useStreamingChatContent({chatType, token})
    if (!renderData) return null
    return <AIStreamNode {...streamClassName} stream={renderData} />
}

const StreamingChatContent: FC<StreamingChatContentProps> = (props) => {
    const {streamClassName, chatType, token} = props

    if (props.isGroup === true) {
        return <AIGroupStreamCard elements={props.children} />
    }
    return <AIStreamCard chatType={chatType} token={token} streamClassName={streamClassName} />
}
export default memo(StreamingChatContent)
