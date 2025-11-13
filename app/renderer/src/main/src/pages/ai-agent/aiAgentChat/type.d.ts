import {AIChatQSData} from "@/pages/ai-re-act/hooks/aiRender"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"

export interface AIAgentChatProps {}
export type AIAgentChatMode = "welcome" | "re-act" | "task"
export interface AIReActTaskChatReviewProps {
    reviewInfo: AIChatQSData
    planReviewTreeKeywordsMap: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
    setScrollToBottom: (v: boolean) => void
    onStopTask: () => void
}
