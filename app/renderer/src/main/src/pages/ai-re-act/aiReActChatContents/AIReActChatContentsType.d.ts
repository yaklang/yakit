import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"

export interface AIReActChatContentsPProps {
    chats: AIChatMessage.AICasualChatQAStream[]
}

export interface AIStreamChatContentProps {
    stream: string
    nodeId: string
}
