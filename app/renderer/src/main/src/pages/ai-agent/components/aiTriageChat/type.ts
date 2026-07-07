import { ChatQuestion, ChatResult, ChatThought } from '@/pages/ai-re-act/hooks/aiRender'
import { AIChatIPCStartParams } from '@/pages/ai-re-act/hooks/type'
import { AINodeItemProps } from '../aiChatListItem/aiNodeItem/type'
import { ChatDataStoreKey } from '../../store/ChatDataStore'

export interface AITriageChatContentProps {
  isAnswer?: boolean
  contentClassName?: string
  chatClassName?: string
  itemData: ChatQuestion | ChatResult | ChatThought

  renderNum: AINodeItemProps['renderNum']

  chatDataStoreKey: ChatDataStoreKey
}

export interface AITriageChatContentEditProps {
  onCancel: () => void
  content: string
  extraValue?: AIChatIPCStartParams['extraValue']
  chatDataStoreKey: AITriageChatContentProps['chatDataStoreKey']
}
