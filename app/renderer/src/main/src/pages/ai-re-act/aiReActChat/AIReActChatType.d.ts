import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"

export interface AIReActChatProps {}

export interface AIReActLogProps {
    logs: AIChatMessage.Log[]
    setLogVisible: (visible: boolean) => void
}
