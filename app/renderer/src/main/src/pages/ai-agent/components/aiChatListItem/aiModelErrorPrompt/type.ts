import { type AIChatQSData, type AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIModelErrorPromptProps {
  item: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED }>
  renderNum: number
  isChildWindow: boolean
}
