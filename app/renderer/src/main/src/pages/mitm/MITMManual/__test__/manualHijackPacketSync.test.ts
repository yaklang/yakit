import { describe, expect, it } from 'vitest'
import { ManualHijackListStatus } from '@/defaultConstants/mitmV2'
import type { SingleManualHijackInfoMessage } from '../../MITMHacker/utils'
import { planManualHijackPacketSync, snapshotManualHijackBackendPackets } from '../manualHijackPacketSync'

const bytes = (value: string): Uint8Array => new TextEncoder().encode(value)

const hijackedRequest = (overrides: Partial<SingleManualHijackInfoMessage> = {}): SingleManualHijackInfoMessage =>
  ({
    TaskID: 'task-1',
    Status: ManualHijackListStatus.Hijacking_Request,
    IsWebsocket: false,
    IsHttps: false,
    Request: bytes(
      'POST /upload HTTP/1.1\r\n\r\n{{unquote("PK\\x03\\x04\\x0a\\x00\\xff\\x00zip")}}\r\n{{file(/engine/part-2)}}',
    ),
    Response: new Uint8Array(),
    Payload: new Uint8Array(),
    TraceInfo: {},
    ...overrides,
  }) as SingleManualHijackInfoMessage

describe('manual hijack editable packet synchronization', () => {
  it('preserves an edited binary chip when the same backend request row refreshes after a large-file replacement', () => {
    const original = hijackedRequest()
    const previous = snapshotManualHijackBackendPackets(original)
    const editedRequest = previous.request.replace('PK\\x03\\x04', '\\x11\\x11\\x11\\x11')

    // Completing a large-file replacement updates sibling UI state and the
    // MITM list may deliver a fresh object for the same task. Its Request still
    // contains the captured original bytes. Reapplying it would make Submit use
    // PK while Monaco continues showing the locally edited/Changed chip.
    const refreshedSameTask = hijackedRequest({ Request: original.Request.slice() })
    const plan = planManualHijackPacketSync(previous, refreshedSameTask)
    const requestSubmittedToMITMv2 = plan.syncRequest ? plan.snapshot.request : editedRequest

    expect(plan.syncRequest).toBe(false)
    expect(requestSubmittedToMITMv2).toBe(editedRequest)
    expect(requestSubmittedToMITMv2).toContain('\\x11\\x11\\x11\\x11')
    expect(requestSubmittedToMITMv2).not.toContain('PK\\x03\\x04')
  })

  it('refreshes request state when the backend request bytes genuinely change', () => {
    const previous = snapshotManualHijackBackendPackets(hijackedRequest())
    const changed = hijackedRequest({ Request: bytes('POST /changed HTTP/1.1\r\n\r\nnew') })

    expect(planManualHijackPacketSync(previous, changed).syncRequest).toBe(true)
  })

  it('initializes both packets for a newly selected HTTP task', () => {
    const previous = snapshotManualHijackBackendPackets(hijackedRequest())
    const nextTask = hijackedRequest({ TaskID: 'task-2', Response: bytes('HTTP/1.1 200 OK\r\n\r\nnext') })
    const plan = planManualHijackPacketSync(previous, nextTask)

    expect(plan.syncRequest).toBe(true)
    expect(plan.syncResponse).toBe(true)
  })

  it('updates only the response when it arrives for the same HTTP task', () => {
    const original = hijackedRequest()
    const previous = snapshotManualHijackBackendPackets(original)
    const withResponse = hijackedRequest({
      Status: ManualHijackListStatus.Hijacking_Response,
      Response: bytes('HTTP/1.1 200 OK\r\n\r\nresponse'),
    })
    const plan = planManualHijackPacketSync(previous, withResponse)

    expect(plan.syncRequest).toBe(false)
    expect(plan.syncResponse).toBe(true)
  })

  it('refreshes a websocket editor only when its payload bytes change', () => {
    const websocket = hijackedRequest({
      IsWebsocket: true,
      Request: bytes('GET /ws HTTP/1.1\r\n\r\n'),
      Payload: bytes('first payload'),
    })
    const previous = snapshotManualHijackBackendPackets(websocket)

    const unchangedPlan = planManualHijackPacketSync(
      previous,
      hijackedRequest({
        ...websocket,
        Payload: websocket.Payload.slice(),
      }),
    )
    const changedPlan = planManualHijackPacketSync(
      previous,
      hijackedRequest({
        ...websocket,
        Payload: bytes('second payload'),
      }),
    )

    expect(unchangedPlan.syncRequest).toBe(false)
    expect(unchangedPlan.syncResponse).toBe(false)
    expect(changedPlan.syncRequest).toBe(true)
    expect(changedPlan.syncResponse).toBe(false)
  })
})
