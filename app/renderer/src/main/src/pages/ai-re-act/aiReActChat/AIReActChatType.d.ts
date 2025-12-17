import {AIAgentChatMode} from "@/pages/ai-agent/aiAgentChat/type"
import {AIChatQSData} from "../hooks/aiRender"

export interface AIReActChatProps {
    mode: AIAgentChatMode
    chatContainerClassName?: string
    chatContainerHeaderClassName?: string
    showFreeChat: boolean
    setShowFreeChat: (show: boolean) => void
    title?: React.ReactNode
    storeKey?: FileListStoreKey
}

export interface AIReActLogProps {
    logs: AIChatQSData[]
    setLogVisible: (visible: boolean) => void
}

export interface AIReActTimelineMessageProps {
    message?: string
    loading: boolean
    setLoading: (loading: boolean) => void
}
