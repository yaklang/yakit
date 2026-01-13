import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import type {AIChatQSData, ReActChatElement} from "@/pages/ai-re-act/hooks/aiRender"
import type {FC, ReactNode} from "react"

interface StaticChatContentProps extends ReActChatElement {
    children?: (contentItem: AIChatQSData ) => ReactNode
}

const StaticChatContent: FC<StaticChatContentProps> = ({chatType, token, children}) => {
    const {
        chatIPCEvents: {getChatContentMap}
    } = useChatIPCDispatcher()

    const chatItem = getChatContentMap(chatType, token)
    if (!chatItem) return null
    return <>{children?.(chatItem)}</>
}
export default StaticChatContent
