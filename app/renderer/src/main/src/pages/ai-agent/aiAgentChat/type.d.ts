import {AIChatReview} from "@/pages/ai-re-act/hooks/aiRender"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"

export interface AIAgentChatProps {}
export type AIAgentChatMode = "welcome" | "re-act" | "task"
export interface AIReActTaskChatReviewProps {
    reviewInfo: AIChatReview
    planReviewTreeKeywordsMap: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
}
