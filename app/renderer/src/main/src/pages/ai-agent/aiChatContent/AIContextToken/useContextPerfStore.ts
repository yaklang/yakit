import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'

export const CONTEXT_PERF_POLL_INTERVAL = 2000

export interface ContextPerfPanelProps {
  session?: string
  execute: boolean
}

/** 读取当前 session 的性能数据 */
export function useContextPerfStore() {
  const rawData = useCurrentRawData()
  return rawData.aiPerfData
}
