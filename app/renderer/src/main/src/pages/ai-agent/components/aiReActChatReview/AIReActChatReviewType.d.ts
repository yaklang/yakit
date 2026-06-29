import { AIChatQSData } from '../../../ai-re-act/hooks/aiRender'
import { AIAgentGrpcApi } from '../../../ai-re-act/hooks/grpcApi'
import { ChatIPCContextDispatcher } from '@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent'
import { ChatIPCSendType } from '@/pages/ai-re-act/hooks/type'

export interface AIReActChatReviewProps {
  chatType: ChatIPCSendType
  info: AIChatQSData
  planReviewTreeKeywordsMap?: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
  isEmbedded?: boolean
  renderFooterExtra?: (node: React.ReactNode) => React.ReactNode
  expand: boolean
  className?: string
  onSendSyncMessage?: ChatIPCContextDispatcher['handleSendSyncMessage']
}

export interface ForgeReviewFormRefProps {
  validateFields: Promise
}
export interface ForgeReviewFormProps extends AIAgentGrpcApi.ExecForgeReview {
  ref: React.ForwardedRef<ForgeReviewFormRefProps>
  /**是否可编辑 */
  editable: boolean
}
