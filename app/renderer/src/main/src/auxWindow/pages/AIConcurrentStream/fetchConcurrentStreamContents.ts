import { ipc } from '../../../../../../../shared/communication/window-client'
import type { AIChatQSData, AIYakExecFileRecord } from '@/pages/ai-re-act/hooks/aiRender'
import type {
  ConcurrentStreamFramePayload,
  FramePayload,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'

export interface FetchConcurrentStreamContentsResponse extends Omit<FramePayload, 'renderNum'> {}
/**
 * 子窗口通过 IPC 向主窗口拉取 task 相关的全部 content 数据。
 */
export async function fetchConcurrentStreamContents(
  frame: ConcurrentStreamFramePayload,
): Promise<FetchConcurrentStreamContentsResponse> {
  try {
    const result = await ipc.invoke('local', 'fetch-concurrent-stream-contents', frame)
    if (!result || typeof result !== 'object') throw new Error('Invalid concurrent stream payload')
    const payload = result as Record<string, unknown>
    const tuples = (value: unknown): [string, unknown][] => {
      if (!Array.isArray(value)) throw new Error('Invalid concurrent stream entries')
      return value.map((entry) => {
        if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string')
          throw new Error('Invalid concurrent stream entry')
        return [entry[0], entry[1]]
      })
    }
    // These are renderer-owned UI models relayed by the main process, not protobuf output.
    const rawData = tuples(payload.rawData).map(([key, value]): [string, AIChatQSData] => {
      if (
        !value ||
        typeof value !== 'object' ||
        !('type' in value) ||
        typeof value.type !== 'string' ||
        !('data' in value)
      )
        throw new Error('Invalid chat entry')
      return [key, value as AIChatQSData]
    })
    const execFileRecord = tuples(payload.execFileRecord).map(([key, value]): [string, AIYakExecFileRecord[]] => {
      if (!Array.isArray(value) || value.some((record) => !record || typeof record !== 'object'))
        throw new Error('Invalid execution files')
      return [key, value as AIYakExecFileRecord[]]
    })
    const childrenTokens = Array.isArray(payload.childrenTokens)
      ? payload.childrenTokens.filter((token): token is string => typeof token === 'string')
      : []
    return {
      rawData: new Map(rawData),
      execFileRecord: new Map(execFileRecord),
      childrenTokens,
    }
  } catch (error) {
    return {
      rawData: new Map(),
      execFileRecord: new Map(),
      childrenTokens: [],
    }
  }
}
