import {AIChatReview} from "../type/aiChat"

export interface AIAgentChatProps {}
export type AIAgentChatMode = "welcome" | "re-act" | "task"
export interface AIReActTaskChatReviewProps {
    reviewInfo: AIChatReview
    planReviewTreeKeywordsMap: Map<string, AIChatMessage.PlanReviewRequireExtra>
}
