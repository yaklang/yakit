import { describe, expect, it, vi } from 'vitest'
import { appendWebFuzzerRequestRawAttachmentToEvent } from '../webFuzzerAiRequestAttachment'
import type { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'

vi.mock('@/utils/randomUtil', () => ({ randomString: (length: number) => `random-${length}` }))

describe('Web Fuzzer request attachments', () => {
  it.each([undefined, null, '', '   '])('attaches the first request without a session ID (%s)', (sessionId) => {
    const input: AIInputEvent = { IsStart: true, Params: { UserQuery: 'explain' } }
    const output = appendWebFuzzerRequestRawAttachmentToEvent(input, sessionId, ' GET / HTTP/1.1\r\n\r\n ', true)
    expect(output.AttachedResourceInfo).toEqual([
      {
        Type: 'http_fuzz_request',
        Key: 'random-16-random-10',
        Value: JSON.stringify({ http_packet: 'GET / HTTP/1.1', is_https: true }),
      },
    ])
    expect(output.Params).toEqual({ UserQuery: 'explain' })
    expect(input.AttachedResourceInfo).toBeUndefined()
  })

  it('appends to existing resources for a free input without mutating the input', () => {
    const input: AIInputEvent = {
      IsFreeInput: true,
      FreeInput: 'next',
      AttachedResourceInfo: [
        {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
          Value: '/image.png',
        },
      ],
    }
    const output = appendWebFuzzerRequestRawAttachmentToEvent(input, ' session ', 'POST / HTTP/1.1', false)
    expect(output.FreeInput).toBe('next')
    expect(output.AttachedResourceInfo).toEqual([
      ...input.AttachedResourceInfo!,
      {
        Type: 'http_fuzz_request',
        Key: 'session-random-10',
        Value: JSON.stringify({ http_packet: 'POST / HTTP/1.1', is_https: false }),
      },
    ])
    expect(input.AttachedResourceInfo).toHaveLength(1)
  })

  it.each([undefined, null, '', '  '])('leaves the event untouched for an empty request (%s)', (raw) => {
    const input: AIInputEvent = { IsStart: true }
    expect(appendWebFuzzerRequestRawAttachmentToEvent(input, undefined, raw, false)).toBe(input)
  })

  it('does not attach request packets to synchronization events', () => {
    const input: AIInputEvent = { IsSyncMessage: true, SyncType: 'recovery_history' }
    expect(appendWebFuzzerRequestRawAttachmentToEvent(input, undefined, 'GET / HTTP/1.1', false)).toBe(input)
  })
})
