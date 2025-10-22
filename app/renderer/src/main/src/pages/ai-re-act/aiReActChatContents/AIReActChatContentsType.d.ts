import {AIMarkdownProps} from "@/pages/ai-agent/components/aiMarkdown/type"
import {AIChatQSData, ChatStream} from "../hooks/aiRender"

export interface AIReActChatContentsPProps {
    chats: AIChatQSData[]
}

export interface AIStreamNodeProps {
    stream: ChatStream
    aiMarkdownProps?: {className: string}
}
