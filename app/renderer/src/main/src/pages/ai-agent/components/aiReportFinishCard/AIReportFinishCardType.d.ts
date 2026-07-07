import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIReportFinishCardProps {
  item: Extract<AIChatQSData, { type: 'report_finish' }>
  renderNum: number
}
