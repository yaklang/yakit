import {AIChatIPCStartParams} from "@/pages/ai-re-act/hooks/type"
import {ReactNode} from "react"

export interface AITriageChatContentProps {
    isAnswer?: boolean
    content: ReactNode
    contentClassName?: string
    chatClassName?: string
    extraValue?: AIChatIPCStartParams["extraValue"]
}
