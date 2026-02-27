import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"

export type AISelectType = "online" | "local"
export interface AIModelSelectProps {
    isOpen?: boolean
    className?: string
}
export interface AIModelItemProps {
    value: string
    aiService?: AIStartParams["AIService"]
}
