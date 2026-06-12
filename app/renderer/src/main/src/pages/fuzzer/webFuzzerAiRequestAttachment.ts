import type { AIInputEvent, AttachedResourceInfo } from '@/pages/ai-re-act/hooks/grpcApi'
import { randomString } from '@/utils/randomUtil'

export const WEB_FUZZER_ATTACHED_TYPE_SELECTED = 'http_fuzz_request' as const

export function buildWebFuzzerRequestRawAttachmentKey(sessionId: string): string {
  return `${sessionId}-${randomString(10)}`
}

export function buildWebFuzzerRequestRawAttachment(sessionId: string, requestRaw: string): AttachedResourceInfo {
  return {
    Type: WEB_FUZZER_ATTACHED_TYPE_SELECTED as AttachedResourceInfo['Type'],
    Key: buildWebFuzzerRequestRawAttachmentKey(sessionId) as AttachedResourceInfo['Key'],
    Value: requestRaw,
  }
}

/** Web Fuzzer AI 发包：将当前请求包写入 AttachedResourceInfo，不再拼接到 UserQuery / FreeInput */
export function appendWebFuzzerRequestRawAttachmentToEvent(
  event: AIInputEvent,
  sessionId: string | undefined | null,
  requestRaw: string | undefined | null,
): AIInputEvent {
  const raw = (requestRaw || '').trim()
  const sid = (sessionId || '').trim()
  if (!raw || !sid) return event
  if (!event.IsStart && !event.IsFreeInput) return event

  const item = buildWebFuzzerRequestRawAttachment(sid, raw)
  const existing = event.AttachedResourceInfo || []
  return { ...event, AttachedResourceInfo: [...existing, item] }
}
