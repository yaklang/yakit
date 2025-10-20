import {AIChatIPCSendParams} from "@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent"
import {AIChatQSData} from "../../../ai-re-act/hooks/aiRender"
import {AIAgentGrpcApi} from "../../../ai-re-act/hooks/grpcApi"

export interface AIReActChatReviewProps {
    info: AIChatQSData
    onSendAI: (params: AIChatIPCSendParams) => void
    planReviewTreeKeywordsMap?: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
    isEmbedded?: boolean
    renderFooterExtra?: (node: React.ReactNode) => React.ReactNode
    expand: boolean
    className?: string
}

export interface ForgeReviewFormProps extends AIAgentGrpcApi.ExecForgeReview {}
