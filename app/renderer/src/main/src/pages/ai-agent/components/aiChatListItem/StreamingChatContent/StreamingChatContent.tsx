import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {AIStreamNode} from "@/pages/ai-re-act/aiReActChatContents/AIReActChatContents"
import type {ChatStream, ReActChatElement} from "@/pages/ai-re-act/hooks/aiRender"
import {useRafInterval} from "ahooks"
import {useCallback, useRef, useState, type FC} from "react"

interface StreamingChatContentProps extends ReActChatElement {
    streamClassName?: {className: string} | {aiMarkdownProps?: {className: string}}
}

const StreamingChatContent: FC<StreamingChatContentProps> = ({streamClassName, chatType, token}) => {
    const {getChatContentMap} = useChatIPCDispatcher().chatIPCEvents

    const getChatContent = useCallback(() => {
        return getChatContentMap(chatType, token) as ChatStream
    }, [chatType, getChatContentMap, token])

    const [renderData, setRenderData] = useState<ChatStream>(getChatContent())
    const isRunningRef = useRef(true)

    useRafInterval(
        () => {
            const chatItem = getChatContent()
            if (!chatItem) return

            if (chatItem.data.status === "start") {
                isRunningRef.current = true
                setRenderData(chatItem)
            } else if (chatItem.data.status === "end") {
                setRenderData(chatItem)
                isRunningRef.current = false
            }
        },
        isRunningRef.current ? 200 : undefined
    )

    if (!renderData) return null
    return <AIStreamNode {...streamClassName} stream={renderData} />
}
export default StreamingChatContent
