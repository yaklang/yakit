import type { AIChatTextareaRefProps, AIChatTextareaSubmit } from '@/pages/ai-agent/template/type'
import type { AIReActChatProps } from '../AIReActChatType'
import type { AIMentionCommandParams } from '@/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

export interface AIReactChatTextareaProps {
  ref?: React.ForwardedRef<AIChatTextareaRefProps>
  submitDisabled?: boolean
  handleSubmit: (v: AIChatTextareaSubmit) => void
  externalParameters: AIReActChatProps['externalParameters']
  handleStopCasualTask: () => void
  defaultMentions?: AIMentionCommandParams[]
}
