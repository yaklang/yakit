import type { AIChatQSData, AIYakExecFileRecord } from '@/pages/ai-re-act/hooks/aiRender'
import type { ConcurrentStreamFramePayload } from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'

const { ipcRenderer } = window.require('electron')

export interface FetchConcurrentStreamContentsResponse {
  rawData: Map<string, AIChatQSData>
  execFileRecord: Map<string, AIYakExecFileRecord[]>
}
/**
 * 子窗口通过 IPC 向主窗口拉取 task 相关的全部 content 数据。
 * 主窗口从 globalSessionEngine 取最新 store + rawData，复用 buildConcurrentStreamFramePayload
 * 收集 task 自身、childrenTokens 各节点、group 内子节点的数据，
 * 返回为 Map<string, AIChatQSData>（token → 原始数据）。
 */
export async function fetchConcurrentStreamContents(
  frame: ConcurrentStreamFramePayload,
): Promise<FetchConcurrentStreamContentsResponse> {
  const result = await ipcRenderer.invoke('fetch-concurrent-stream-contents', frame)
  const rawData: Array<[string, AIChatQSData]> = result?.rawData ?? []
  const execFileRecord: Array<[string, AIYakExecFileRecord[]]> = result?.execFileRecord ?? []
  return {
    rawData: new Map(rawData),
    execFileRecord: new Map(execFileRecord),
  }
}
