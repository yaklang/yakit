import { type AIChatQSData, type ChatListRenderType } from '../../../ai-re-act/hooks/aiRender'
import { type AIAgentGrpcApi } from '../../../ai-re-act/hooks/grpcApi'
import { type AIChatSendParams } from '@/pages/ai-re-act/hooks/type'
export interface AIReActChatReviewProps {
  chatType: ChatListRenderType
  info: AIChatQSData
  planReviewTreeKeywordsMap?: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
  isEmbedded?: boolean
  renderFooterExtra?: (node: React.ReactNode) => React.ReactNode
  expand: boolean
  className?: string
  renderNum: number
}

export interface ForgeReviewFormRefProps {
  validateFields: () => Promise<Record<string, any>>
}
export interface ForgeReviewFormProps extends AIAgentGrpcApi.ExecForgeReview {
  ref: React.ForwardedRef<ForgeReviewFormRefProps>
  /**是否可编辑 */
  editable: boolean
}
