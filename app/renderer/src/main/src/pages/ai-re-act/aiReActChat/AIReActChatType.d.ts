import {AIAgentChatMode} from "@/pages/ai-agent/aiAgentChat/type"
import {AIChatQSData} from "../hooks/aiRender"

export interface AIReActChatProps {
    mode: AIAgentChatMode
}

export interface AIReActLogProps {
    logs: AIChatQSData[]
    setLogVisible: (visible: boolean) => void
}

export interface AIReActTimelineMessageProps {
    message?: string
}
