import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"

export interface AIReActChatReviewProps {
    type: AIChatMessage.AICasualChatQAStream["uiType"]
    review: AIChatMessage.AICasualChatQAStream["data"]
    onSendAIRequire: (input: string, id: string) => void
}
