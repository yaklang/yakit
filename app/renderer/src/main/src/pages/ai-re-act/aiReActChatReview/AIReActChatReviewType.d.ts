import {AIChatMessage, AIChatReview} from "@/pages/ai-agent/type/aiChat"

type AIReActChatReviewType = AIChatMessage.AICasualChatQAStream["uiType"] | AIChatReview["type"]

export interface AIReActChatReviewProps {
    type: AIReActChatReviewType
    review: AIChatMessage.AICasualChatQAStream["data"] | AIChatReview["data"]
    onSendAI: (input: string, id: string) => void
    planReviewTreeKeywordsMap?: Map<string, AIChatMessage.PlanReviewRequireExtra>
    isEmbedded?: boolean
    renderFooterExtra?: (node: React.ReactNode) => React.ReactNode
    expand: boolean
    className?: string
}

export interface ForgeReviewFormProps extends AIChatMessage.ExecForgeReview {}
