// @vitest-environment node

import { bench, describe } from 'vitest'
import { ManualHijackListAction, ManualHijackListStatus } from '@/defaultConstants/mitmV2'
import type { SingleManualHijackInfoMessage } from '../../MITMHacker/utils'
import { filterColorTag } from '@/components/TableVirtualResize/utils'
import { applyManualHijackBatch, decorateManualHijackRows } from '../manualHijackListModel'

const isSmoke = process.env.MITM_PERF_PROFILE === 'smoke'
const baseSize = isSmoke ? 2_000 : 10_000
const burstSize = isSmoke ? 250 : 1_000
const options = isSmoke
  ? { time: 100, iterations: 5, warmupTime: 25, warmupIterations: 2 }
  : { time: 300, iterations: 10, warmupTime: 50, warmupIterations: 3 }

const makeItem = (id: number, manualHijackListAction: ManualHijackListAction): SingleManualHijackInfoMessage => {
  return {
    TaskID: `task-${id}`,
    URL: `https://example.test/${id}`,
    Method: 'GET',
    Status: ManualHijackListStatus.Hijacking_Request,
    Request: new Uint8Array(128),
    Response: new Uint8Array(256),
    HijackResponse: new Uint8Array(),
    Payload: new Uint8Array(),
    Tags: id % 10 === 0 ? ['YAKIT_COLOR_RED'] : [],
    IsHttps: true,
    RemoteAddr: '127.0.0.1:443',
    IsWebsocket: false,
    WebsocketEncode: [],
    TraceInfo: {} as SingleManualHijackInfoMessage['TraceInfo'],
    manualHijackListAction,
    arrivalOrder: id + 1,
  }
}

const base = Array.from({ length: baseSize }, (_, id) => makeItem(id, ManualHijackListAction.Hijack_List_Add))
const additions = Array.from({ length: burstSize }, (_, offset) =>
  makeItem(baseSize + offset, ManualHijackListAction.Hijack_List_Add),
)
const tailUpdates = Array.from({ length: burstSize }, (_, offset) =>
  makeItem(baseSize - 1 - (offset % baseSize), ManualHijackListAction.Hijack_List_Update),
)
const deletions = Array.from({ length: burstSize }, (_, offset) =>
  makeItem(offset % baseSize, ManualHijackListAction.Hijack_List_Delete),
)

describe(`MITM manual array model ${baseSize}+${burstSize}`, () => {
  bench(
    'add burst',
    () => {
      applyManualHijackBatch(base, additions)
    },
    options,
  )
  bench(
    'tail update burst',
    () => {
      applyManualHijackBatch(base, tailUpdates)
    },
    options,
  )
  bench(
    'delete burst',
    () => {
      applyManualHijackBatch(base, deletions)
    },
    options,
  )
  bench(
    'decorate full list',
    () => {
      decorateManualHijackRows(base, filterColorTag)
    },
    options,
  )
})
