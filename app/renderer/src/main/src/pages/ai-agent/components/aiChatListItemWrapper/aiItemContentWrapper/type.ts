import { type AIChatQSData, type AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import type { AINodeItemProps } from '../../aiChatListItem/aiNodeItem/type'
import type { AITriageChatContentProps } from '../../aiTriageChat/type'

interface AIItemContentWrapperProps {
  renderNum: AINodeItemProps['renderNum']
}
export interface AITriageChatContentWrapperProps extends Omit<AITriageChatContentProps, 'chatDataStoreKey'> {}

export interface AIThoughtProps extends AIItemContentWrapperProps {
  itemData: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.THOUGHT }>
}
