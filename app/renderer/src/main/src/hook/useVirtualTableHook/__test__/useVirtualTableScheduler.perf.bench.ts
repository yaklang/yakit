// @vitest-environment node

import { bench, describe } from 'vitest'
import {
  mergeVirtualTableServerPushRows,
  prependAcceptedVirtualTableServerPushRows,
  selectVirtualTableServerPushRows,
} from '../useVirtualTableScheduler'

const isSmoke = process.env.MITM_PERF_PROFILE === 'smoke'
const current = Array.from({ length: 1_000 }, (_, offset) => ({ Id: 1_000 - offset }))
const incoming = Array.from({ length: 10 }, (_, offset) => ({ Id: 1_010 - offset }))
const options = isSmoke
  ? { time: 100, iterations: 10, warmupTime: 25, warmupIterations: 3 }
  : { time: 300, iterations: 20, warmupTime: 50, warmupIterations: 5 }

let observedRows = 0

describe('virtual table direct push 1000+10', () => {
  bench(
    'legacy candidate merge plus authoritative merge',
    () => {
      const candidate = mergeVirtualTableServerPushRows(current, incoming, 'Id')
      const acceptedRows = candidate.data.slice(0, candidate.inserted)
      observedRows = mergeVirtualTableServerPushRows(current, acceptedRows, 'Id', 1_000).data.length
    },
    options,
  )

  bench(
    'snapshot selection plus accepted prepend',
    () => {
      const acceptedRows = selectVirtualTableServerPushRows(current, incoming, 'Id')
      observedRows = prependAcceptedVirtualTableServerPushRows(current, acceptedRows, 1_000).data.length
    },
    options,
  )
})

void observedRows
