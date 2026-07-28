import type { AIChatQSData, AIYakExecFileRecord, ChatListRenderType } from '@/pages/ai-re-act/hooks/aiRender'

export interface ConcurrentStreamFramePayload {
  session: string
  token: string
  chatType: ChatListRenderType
  childrenTokens: string[]
  /** childrenTokens 中各节点 token 对应的原始数据 */
  rawData: Map<string, AIChatQSData>

  execFileRecord: Map<string, AIYakExecFileRecord[]>
  taskName?: string
}

export interface FramePayload extends Pick<
  ConcurrentStreamFramePayload,
  'session' | 'token' | 'chatType' | 'childrenTokens'
> {
  renderNum?: number
}
export function isConcurrentStreamFrame(data: unknown): data is FramePayload {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  // 只校验元数据字段；rawData/execFileRecord 在跨 IPC 传输时可能从 Map 退化为普通对象
  return (
    typeof record.session === 'string' &&
    typeof record.token === 'string' &&
    typeof record.chatType === 'string' &&
    Array.isArray(record.childrenTokens)
  )
}
