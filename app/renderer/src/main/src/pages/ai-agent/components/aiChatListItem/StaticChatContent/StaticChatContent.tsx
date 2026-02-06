import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import type {AIChatQSData, ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import {FC, memo, ReactNode} from "react"

type StaticChatContentProps = ReActChatRenderItem & {
    render?: (contentItem: AIChatQSData) => ReactNode
    session: string
}

const StaticChatContent: FC<StaticChatContentProps> = ({chatType, token, render, session}) => {
    const { fetchChatDataStore } = useChatIPCDispatcher().chatIPCEvents
    
    const chatItem = fetchChatDataStore()?.getContentMap({session, chatType, mapKey: token})
    if (!chatItem) return null
    return <>{render?.(chatItem)}</>
}
export default memo(StaticChatContent)
