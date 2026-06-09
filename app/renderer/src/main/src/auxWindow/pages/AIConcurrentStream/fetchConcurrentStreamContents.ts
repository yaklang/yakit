import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import type { ConcurrentStreamFramePayload } from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'

const { ipcRenderer } = window.require('electron')

export async function fetchConcurrentStreamContents(
  frame: ConcurrentStreamFramePayload,
): Promise<Array<[string, AIChatQSData]>> {
  const result = await ipcRenderer.invoke('fetch-concurrent-stream-contents', frame)
  return result?.contentEntries ?? []
}
