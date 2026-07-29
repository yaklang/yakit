import { describe, expect, it, vi } from 'vitest'
import { ManualHijackListAction, ManualHijackListStatus } from '@/defaultConstants/mitmV2'
import type { SingleManualHijackInfoMessage } from '../../MITMHacker/utils'
import { applyManualHijackBatch, decorateManualHijackRows } from '../manualHijackListModel'

const item = (taskID: string, action: ManualHijackListAction, arrivalOrder?: number): SingleManualHijackInfoMessage => {
  return {
    TaskID: taskID,
    manualHijackListAction: action,
    arrivalOrder,
    Request: new Uint8Array(),
    Response: new Uint8Array(),
    HijackResponse: new Uint8Array(),
    Payload: new Uint8Array(),
    Status: ManualHijackListStatus.Hijacking_Request,
    Tags: [],
    IsHttps: false,
    URL: `http://example.test/${taskID}`,
    RemoteAddr: '127.0.0.1:80',
    IsWebsocket: false,
    WebsocketEncode: [],
    TraceInfo: {} as SingleManualHijackInfoMessage['TraceInfo'],
    Method: 'GET',
  }
}

describe('manualHijackListModel', () => {
  it('applies add, update, and delete without mutating the input list', () => {
    const original = [item('one', ManualHijackListAction.Hijack_List_Add, 1)]
    const updated = item('one', ManualHijackListAction.Hijack_List_Update)
    updated.Method = 'POST'

    const result = applyManualHijackBatch(original, [
      item('two', ManualHijackListAction.Hijack_List_Add, 2),
      updated,
      item('two', ManualHijackListAction.Hijack_List_Delete),
    ])

    expect(original).toHaveLength(1)
    expect(original[0].Method).toBe('GET')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ TaskID: 'one', Method: 'POST', arrivalOrder: 1 })
  })

  it('ignores an out-of-order update instead of indexing data[-1]', () => {
    const onUpdate = vi.fn()
    const result = applyManualHijackBatch([], [item('missing', ManualHijackListAction.Hijack_List_Update)], {
      onUpdate,
    })

    expect(result.data).toEqual([])
    expect(result.missingUpdateTaskIDs).toEqual(['missing'])
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ TaskID: 'missing' }), false)
  })

  it('decorates rows using their normalized tag list', () => {
    const row = item('one', ManualHijackListAction.Hijack_List_Add)
    row.Tags = ['YAKIT_COLOR_RED', 'custom']

    const result = decorateManualHijackRows([row], (tags) => `class:${tags}`)

    expect(result[0]).toMatchObject({
      Tags: ['YAKIT_COLOR_RED', 'custom'],
      cellClassName: 'class:YAKIT_COLOR_RED|custom',
    })
  })
})
