import { type AIChatQSData, type AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import type { AINodeItemProps } from '../aiChatListItem/aiNodeItem/type'
import type { ChatDataStoreKey } from '../../store/ChatDataStore'

export interface AITriageChatContentProps {
  isAnswer?: boolean
  contentClassName?: string
  chatClassName?: string
  itemData: Extract<
    AIChatQSData,
    { type: AIChatQSDataTypeEnum.QUESTION | AIChatQSDataTypeEnum.RESULT | AIChatQSDataTypeEnum.THOUGHT }
  >

  renderNum: AINodeItemProps['renderNum']

  chatDataStoreKey: ChatDataStoreKey
}

export interface AITriageChatContentEditProps {
  onCancel: () => void
  content: string
  extraValue?: AIChatQSData['extraValue']
  chatDataStoreKey: AITriageChatContentProps['chatDataStoreKey']
}
