import type { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIChatTextareaSubmit } from '../template/type'
import type { ReactNode } from 'react'

export interface AIAgentChatProps {}
export type AIAgentChatMode = 'welcome' | 're-act'
export interface AIReActTaskChatReviewProps {
  footerExtra?: (v: ReactNode) => ReactNode
}

export interface AIChatSubmitParams extends AIChatTextareaSubmit {
  attachedResourceInfo?: AIInputEvent['AttachedResourceInfo']
}

export interface HandleStartParams extends Omit<AIChatSubmitParams, 'sessionId'> {
  /** 提交入口固定意图和正式 ID，启动及重试期间不再推断。 */
  target: { kind: 'new' | 'resume'; sessionId: string }
}
