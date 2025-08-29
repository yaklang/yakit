import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"

export interface AIReActChatContentsPProps {
    chats: AIChatMessage.AICasualChatQAStream[]
    onSendAIRequire: (input: string, id: string) => void
}
