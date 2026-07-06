import { AIChatTextareaRefProps, AIChatTextareaSubmit } from '@/pages/ai-agent/template/type'
import { AIReActChatProps } from '../AIReActChatType'

export interface AIReactChatTextareaProps {
  ref?: React.ForwardedRef<AIChatTextareaRefProps>
  handleSubmit: (v: AIChatTextareaSubmit) => void
  externalParameters: AIReActChatProps['externalParameters']
  handleStopCasualTask: () => void
}
