import type { AIChatQSData, ChatListRenderType } from '@/pages/ai-re-act/hooks/aiRender'

export interface ConcurrentStreamFramePayload {
  session: string
  token: string
  chatType: ChatListRenderType
  childrenTokens: string[]
  /** childrenTokens 中各节点 token 对应的原始数据 */
  rawData: Map<string, AIChatQSData>
  taskName?: string
}

export function isConcurrentStreamFrame(data: unknown): data is ConcurrentStreamFramePayload {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  return (
    typeof record.session === 'string' &&
    typeof record.token === 'string' &&
    typeof record.chatType === 'string' &&
    Array.isArray(record.childrenTokens)
  )
}
