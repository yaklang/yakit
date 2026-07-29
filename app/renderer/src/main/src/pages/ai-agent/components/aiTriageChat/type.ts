import { AIChatIPCStartParams } from '@/pages/ai-re-act/hooks/type'

export interface AITriageChatContentProps {
  isAnswer?: boolean
  content: string
  contentClassName?: string
  chatClassName?: string
  extraValue?: AIChatIPCStartParams['extraValue']
}

export interface AITriageChatContentEditProps {
  onCancel: () => void
  content: AITriageChatContentProps['content']
  extraValue?: AITriageChatContentProps['extraValue']
}
