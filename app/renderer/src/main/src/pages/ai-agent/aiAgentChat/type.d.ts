import {AIChatReviewExtra} from "../type/aiChat"

export interface AIAgentChatProps {}
export type AIAgentChatMode = "welcome" | "re-act" | "task"
export interface AIReActTaskChatReviewProps {
    reviewInfo: AIChatReviewExtra
    planReviewTreeKeywordsMap: Map<string, AIChatMessage.PlanReviewRequireExtra>
}
