import type { AIReActChatRefProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import { type AITabsEnum } from '../defaultConstant'

export interface AIChatContentRefProps extends AIReActChatRefProps {}
export interface AIChatContentProps {
  ref?: React.ForwardedRef<AIChatContentRefProps>
  onChat: () => void
  showFreeChat?: boolean
  setShowFreeChat?: (visible: boolean) => void
  rightPanelLayoutRef?: React.RefCallback<HTMLDivElement>
}
export interface AIAgentTabPayload {
  key: AITabsEnum
  value?: string
}
