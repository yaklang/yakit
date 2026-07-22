import { ChatThought } from '@/pages/ai-re-act/hooks/aiRender'
import { AINodeItemProps } from '../../aiChatListItem/aiNodeItem/type'
import { AITriageChatContentProps } from '../../aiTriageChat/type'

interface AIItemContentWrapperProps {
  renderNum: AINodeItemProps['renderNum']
}
export interface AITriageChatContentWrapperProps extends Omit<AITriageChatContentProps, 'chatDataStoreKey'> {}

export interface AIThoughtProps extends AIItemContentWrapperProps {
  itemData: ChatThought
}
