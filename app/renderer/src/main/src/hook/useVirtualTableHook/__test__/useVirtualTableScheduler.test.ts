import { describe, expect, it } from 'vitest'
import {
  mergeVirtualTableServerPushRows,
  mergeUniqueVirtualTableRows,
  prependAcceptedVirtualTableServerPushRows,
  resolveVirtualTableServerPushActive,
  selectVirtualTableAutomaticRefreshReason,
  selectVirtualTableViewportFillLimit,
  selectVirtualTableServerPushRows,
  selectVirtualTableAutoRefreshAction,
  shouldLoadVirtualTableBottom,
  shouldRestoreVirtualTableViewport,
  VirtualTableViewportSnapshot,
} from '../useVirtualTableScheduler'

const snapshot = (overrides: Partial<VirtualTableViewportSnapshot> = {}): VirtualTableViewportSnapshot => ({
  scrollTop: 0,
  clientHeight: 600,
  scrollHeight: 1200,
  serverPushActive: true,
  ...overrides,
})

describe('resolveVirtualTableServerPushActive', () => {
  it('keeps polling stopped when the dedicated stream is active before shared duplex emits a frame', () => {
    expect(resolveVirtualTableServerPushActive(false, () => true)).toBe(true)
  })

  it('falls back only when both push sources are inactive', () => {
    expect(resolveVirtualTableServerPushActive(false, () => false)).toBe(false)
    expect(resolveVirtualTableServerPushActive(true, () => false)).toBe(true)
  })
})

describe('selectVirtualTableAutomaticRefreshReason', () => {
  it('treats the first activation and parameter changes as ordinary queries', () => {
    expect(selectVirtualTableAutomaticRefreshReason(false, false)).toBe('query')
    expect(selectVirtualTableAutomaticRefreshReason(true, true)).toBe('query')
  })

  it('identifies a cached table becoming visible again', () => {
    expect(selectVirtualTableAutomaticRefreshReason(true, false)).toBe('visibility')
  })
})

describe('shouldRestoreVirtualTableViewport', () => {
  it('preserves a populated scroll window when a cached tab becomes visible', () => {
    expect(shouldRestoreVirtualTableViewport('visibility', 300, false)).toBe(true)
  })

  it('uses a full query when the hidden table is empty or its parameters changed', () => {
    expect(shouldRestoreVirtualTableViewport('visibility', 0, false)).toBe(false)
    expect(shouldRestoreVirtualTableViewport('visibility', 300, true)).toBe(false)
    expect(shouldRestoreVirtualTableViewport('query', 300, false)).toBe(false)
  })
})

describe('selectVirtualTableViewportFillLimit', () => {
  it('fills a viewport that grew after the detail pane closed', () => {
    expect(selectVirtualTableViewportFillLimit(12, 100, 616, 28)).toBe(20)
  })

  it('does not query when the current window already covers the viewport and prefetch margin', () => {
    expect(selectVirtualTableViewportFillLimit(32, 100, 616, 28)).toBe(0)
  })

  it('caps the request at the number of rows that still exist', () => {
    expect(selectVirtualTableViewportFillLimit(12, 18, 616, 28)).toBe(6)
  })

  it('ignores invalid or exhausted viewport snapshots', () => {
    expect(selectVirtualTableViewportFillLimit(12, 12, 616, 28)).toBe(0)
    expect(selectVirtualTableViewportFillLimit(12, 100, undefined, 28)).toBe(0)
    expect(selectVirtualTableViewportFillLimit(12, 100, 616, 0)).toBe(0)
  })
})

describe('mergeUniqueVirtualTableRows', () => {
  it('repairs the pushed-row and query-page overlap without duplicates or order inversions', () => {
    const current = [{ Id: 6511 }, { Id: 6510 }, { Id: 6509 }, { Id: 6508 }, { Id: 6507 }]
    const completedPage = [{ Id: 6512 }, { Id: 6511 }]

    expect(mergeUniqueVirtualTableRows([completedPage, current], 'Id', 'desc', 'Id')).toEqual([
      { Id: 6512 },
      { Id: 6511 },
      { Id: 6510 },
      { Id: 6509 },
      { Id: 6508 },
      { Id: 6507 },
    ])
  })

  it('keeps the first copy so a query row can replace a body-free summary', () => {
    const queried = { Id: 3, Hash: 'query' }
    const pushed = { Id: 3, Hash: 'push' }

    expect(mergeUniqueVirtualTableRows([[queried], [pushed]], 'Id', 'desc', 'created_at')).toEqual([queried])
  })
})

describe('selectVirtualTableAutoRefreshAction', () => {
  it('stops polling when server push becomes active', () => {
    expect(selectVirtualTableAutoRefreshAction(snapshot({ serverPushActive: false }), snapshot())).toBe('stop-poll')
  })

  it('does not query when only pushed rows increase scroll height', () => {
    expect(selectVirtualTableAutoRefreshAction(snapshot(), snapshot({ scrollHeight: 1800 }))).toBe('stop-poll')
  })

  it('does not query for layout resize or a sub-row automatic scroll adjustment', () => {
    expect(selectVirtualTableAutoRefreshAction(snapshot(), snapshot({ scrollTop: 7, clientHeight: 580 }))).toBe(
      'stop-poll',
    )
  })

  it('refreshes once when the user scrolls while server push is active', () => {
    expect(selectVirtualTableAutoRefreshAction(snapshot(), snapshot({ scrollTop: 400 }))).toBe('refresh-once')
  })

  it('starts fallback polling when server push disconnects', () => {
    expect(selectVirtualTableAutoRefreshAction(snapshot(), snapshot({ serverPushActive: false }))).toBe('start-poll')
  })

  it('starts fallback polling when the first sample has no server push', () => {
    expect(selectVirtualTableAutoRefreshAction(undefined, snapshot({ serverPushActive: false }))).toBe('start-poll')
  })

  it('keeps legacy polling behavior for viewport changes without server push', () => {
    const previous = snapshot({ serverPushActive: false })
    const current = snapshot({ serverPushActive: false, scrollHeight: 1800 })
    expect(selectVirtualTableAutoRefreshAction(previous, current)).toBe('start-poll')
  })
})

describe('shouldLoadVirtualTableBottom', () => {
  it('prefetches a sliding page while ten rows remain', () => {
    expect(shouldLoadVirtualTableBottom(9120, 600, 10000, true, 28)).toBe(true)
  })

  it('does not chain another sliding request immediately after clipping', () => {
    expect(shouldLoadVirtualTableBottom(9000, 600, 10000, true, 28)).toBe(false)
  })

  it('keeps the legacy ninety-percent trigger for an unbounded table', () => {
    expect(shouldLoadVirtualTableBottom(8500, 600, 10000, false, 28)).toBe(true)
  })
})

describe('mergeVirtualTableServerPushRows', () => {
  it('prepends unique pushed rows and clips the old tail', () => {
    const result = mergeVirtualTableServerPushRows(
      [{ Id: 3 }, { Id: 2 }, { Id: 1 }],
      [{ Id: 5 }, { Id: 4 }, { Id: 3 }, { Id: 5 }],
      'Id',
      4,
    )

    expect(result).toEqual({
      data: [{ Id: 5 }, { Id: 4 }, { Id: 3 }, { Id: 2 }],
      inserted: 2,
      clipped: true,
    })
  })

  it('ignores invalid IDs and remains unbounded when maxDataLength is zero', () => {
    const result = mergeVirtualTableServerPushRows([{ Id: 1 }], [{ Id: 0 }, { Id: 2 }], 'Id')
    expect(result).toEqual({ data: [{ Id: 2 }, { Id: 1 }], inserted: 1, clipped: false })
  })

  it('keeps the current array identity when every pushed row is already present', () => {
    const current = [{ Id: 2 }, { Id: 1 }]
    const result = mergeVirtualTableServerPushRows(current, [{ Id: 2 }], 'Id')

    expect(result).toEqual({ data: current, inserted: 0, clipped: false })
    expect(result.data).toBe(current)
  })
})

describe('selectVirtualTableServerPushRows', () => {
  it('returns only valid unique rows without constructing a merged table', () => {
    const current = [{ Id: 3 }, { Id: 2 }]
    const incoming = [{ Id: 5 }, { Id: 4 }, { Id: 3 }, { Id: 5 }, { Id: 0 }]

    expect(selectVirtualTableServerPushRows(current, incoming, 'Id')).toEqual([{ Id: 5 }, { Id: 4 }])
    expect(current).toEqual([{ Id: 3 }, { Id: 2 }])
  })
})

describe('prependAcceptedVirtualTableServerPushRows', () => {
  it('prepends rows validated against an unchanged snapshot and clips the tail', () => {
    const result = prependAcceptedVirtualTableServerPushRows(
      [{ Id: 3 }, { Id: 2 }, { Id: 1 }],
      [{ Id: 5 }, { Id: 4 }],
      4,
    )

    expect(result).toEqual({
      data: [{ Id: 5 }, { Id: 4 }, { Id: 3 }, { Id: 2 }],
      inserted: 2,
      clipped: true,
    })
  })
})
