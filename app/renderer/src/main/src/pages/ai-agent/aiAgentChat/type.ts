import { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { AIChatTextareaSubmit } from '../template/type'
import { ReactNode } from 'react'

export interface AIAgentChatProps {}
export type AIAgentChatMode = 'welcome' | 're-act'
export interface AIReActTaskChatReviewProps {
  setScrollToBottom: (v: boolean) => void
  footerExtra: (v: ReactNode) => ReactNode
}

export interface HandleStartParams extends AIChatTextareaSubmit {
  attachedResourceInfo?: AIInputEvent['AttachedResourceInfo']
}
