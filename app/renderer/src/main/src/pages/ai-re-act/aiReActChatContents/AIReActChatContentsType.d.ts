import {AIChatQSData} from "../hooks/aiRender"

export interface AIReActChatContentsPProps {
    chats: AIChatQSData[]
}

export interface AIStreamChatContentProps {
    stream: string
    nodeLabel: string
}
