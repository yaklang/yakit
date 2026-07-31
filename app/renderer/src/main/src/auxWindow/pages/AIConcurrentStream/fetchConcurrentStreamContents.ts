import type { AIChatQSData, AIYakExecFileRecord } from '@/pages/ai-re-act/hooks/aiRender'
import type {
  ConcurrentStreamFramePayload,
  FramePayload,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'

const { ipcRenderer } = window.require('electron')

export interface FetchConcurrentStreamContentsResponse extends Omit<FramePayload, 'renderNum'> {}
/**
 * 子窗口通过 IPC 向主窗口拉取 task 相关的全部 content 数据。
 */
export async function fetchConcurrentStreamContents(
  frame: ConcurrentStreamFramePayload,
): Promise<FetchConcurrentStreamContentsResponse> {
  try {
    const result = await ipcRenderer.invoke('fetch-concurrent-stream-contents', frame)
    const rawData: Array<[string, AIChatQSData]> = result?.rawData ?? []
    const execFileRecord: Array<[string, AIYakExecFileRecord[]]> = result?.execFileRecord ?? []
    return {
      rawData: new Map(rawData),
      execFileRecord: new Map(execFileRecord),
      childrenTokens: result?.childrenTokens ?? [],
    }
  } catch (error) {
    return {
      rawData: new Map(),
      execFileRecord: new Map(),
      childrenTokens: [],
    }
  }
}
