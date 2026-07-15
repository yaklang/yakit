import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import type { ConcurrentStreamFramePayload } from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'

const { ipcRenderer } = window.require('electron')

/**
 * @deprecated
 * 如果沿用这个逻辑，参考：
 * 子窗口通过 IPC 向主窗口拉取 task 相关的全部 content 数据。
 * 主窗口从 ChatDataStore 中收集 task 自身、childrenTokens 各节点、group 内子节点的数据，
 * 返回为 Map<string, AIChatQSData>（token → 原始数据）。
 */
export async function fetchConcurrentStreamContents(
  frame: ConcurrentStreamFramePayload,
): Promise<Map<string, AIChatQSData>> {
  const result = await ipcRenderer.invoke('fetch-concurrent-stream-contents', frame)
  const entries: Array<[string, AIChatQSData]> = result?.rawData ?? []
  return new Map(entries)
}
