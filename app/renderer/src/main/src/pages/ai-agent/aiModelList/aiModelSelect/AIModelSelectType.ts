import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"

export type AISelectType="online" | "local"
export interface AIModelSelectProps {}
export interface AIModelItemProps {
    value: string
    aiService?: AIStartParams["AIService"]
}
