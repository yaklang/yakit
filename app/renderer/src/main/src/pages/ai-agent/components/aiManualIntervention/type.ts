import { type AIChatQSData, type AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIManualInterventionProps {
  info: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION }>
  renderNum: number
}
