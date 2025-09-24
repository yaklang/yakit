import {AIChatReview} from "../hooks/aiRender"
import {AIAgentGrpcApi} from "../hooks/grpcApi"

export interface AIReActChatReviewProps {
    info: AIChatReview
    onSendAI: (input: string, id: string) => void
    planReviewTreeKeywordsMap?: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
    isEmbedded?: boolean
    renderFooterExtra?: (node: React.ReactNode) => React.ReactNode
    expand: boolean
    className?: string
}

export interface ForgeReviewFormProps extends AIAgentGrpcApi.ExecForgeReview {}
