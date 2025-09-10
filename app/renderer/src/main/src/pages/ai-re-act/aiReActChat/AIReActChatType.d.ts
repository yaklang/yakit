import {AIAgentChatMode} from "@/pages/ai-agent/aiAgentChat/type"
import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"

export interface AIReActChatProps {
    mode: AIAgentChatMode
    setMode: (mode: AIAgentChatMode) => void
}

export interface AIReActLogProps {
    logs: AIChatMessage.Log[]
    setLogVisible: (visible: boolean) => void
}
