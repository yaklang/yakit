import type { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIChatTextareaSubmit } from '../template/type'
import type { ReactNode } from 'react'

export interface AIAgentChatProps {}
export type AIAgentChatMode = 'welcome' | 're-act'
export interface AIReActTaskChatReviewProps {
  footerExtra?: (v: ReactNode) => ReactNode
}

export interface HandleStartParams extends AIChatTextareaSubmit {
  /** 固定提交意图；sessionId 字段本身仍是输入草稿 ID。 */
  target?: { kind: 'new' } | { kind: 'resume'; sessionId: string }
  attachedResourceInfo?: AIInputEvent['AttachedResourceInfo']
}
