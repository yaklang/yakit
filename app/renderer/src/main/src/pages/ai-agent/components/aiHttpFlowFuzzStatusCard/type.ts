import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIHttpFlowFuzzStatusCardProps {
  item: Extract<AIChatQSData, { type: 'http_flow_fuzz_status' }>
}
