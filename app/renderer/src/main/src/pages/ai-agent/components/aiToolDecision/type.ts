import { type AIChatQSData, AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIToolDecisionProps {
  item: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.TOOL_CALL_DECISION }>
  renderNum: number
}
