import {AIAgentChatMode} from "@/pages/ai-agent/aiAgentChat/type"
import {AIChatQSData} from "../hooks/aiRender"

export interface AIReActChatProps {
    mode: AIAgentChatMode
    setMode: (mode: AIAgentChatMode) => void
}

export interface AIReActLogProps {
    logs: AIChatQSData[]
    setLogVisible: (visible: boolean) => void
}
