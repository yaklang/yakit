import type { ChatListRenderType, ReActChatTaskElementSub } from '@/pages/ai-re-act/hooks/aiRender'

export interface ConcurrentStreamFramePayload {
  session: string
  token: string
  chatType: ChatListRenderType
  elements: ReActChatTaskElementSub[]
  taskName?: string
}

export function isConcurrentStreamFrame(data: unknown): data is ConcurrentStreamFramePayload {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  return (
    typeof record.session === 'string' &&
    typeof record.token === 'string' &&
    typeof record.chatType === 'string' &&
    Array.isArray(record.elements)
  )
}
