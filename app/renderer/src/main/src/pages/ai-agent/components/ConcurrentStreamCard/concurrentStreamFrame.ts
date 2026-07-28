import type { AIChatQSData, AIYakExecFileRecord, ChatListRenderType } from '@/pages/ai-re-act/hooks/aiRender'

export interface ConcurrentStreamFramePayload {
  session: string
  token: string
  chatType: ChatListRenderType
  taskName?: string
  renderNum?: number
}

export interface FramePayload {
  childrenTokens: string[]
  /** childrenTokens 中各节点 token 对应的原始数据 */
  rawData: Map<string, AIChatQSData>
  execFileRecord: Map<string, AIYakExecFileRecord[]>
}
export function isConcurrentStreamFrame(record: unknown): record is ConcurrentStreamFramePayload {
  if (!record || typeof record !== 'object') return false
  return (
    'session' in record &&
    'token' in record &&
    'chatType' in record &&
    typeof record.session === 'string' &&
    typeof record.token === 'string' &&
    typeof record.chatType === 'string'
  )
}
