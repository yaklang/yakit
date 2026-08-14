import type { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIChatTextareaSubmit } from '../template/type'
import type { ReactNode } from 'react'

export interface AIAgentChatProps {}
export type AIAgentChatMode = 'welcome' | 're-act'
export interface AIReActTaskChatReviewProps {
  footerExtra?: (v: ReactNode) => ReactNode
}

export interface HandleStartParams extends AIChatTextareaSubmit {
  attachedResourceInfo?: AIInputEvent['AttachedResourceInfo']
}
