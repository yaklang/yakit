import { describe, expect, it } from 'vitest'
import {
  mergeVirtualTableServerPushRows,
  prependAcceptedVirtualTableServerPushRows,
  selectVirtualTableServerPushRows,
  selectVirtualTableAutoRefreshAction,
  VirtualTableViewportSnapshot,
} from '../useVirtualTableScheduler'

const snapshot = (overrides: Partial<VirtualTableViewportSnapshot> = {}): VirtualTableViewportSnapshot => ({
  scrollTop: 0,
  clientHeight: 600,
  scrollHeight: 1200,
  serverPushActive: true,
  ...overrides,
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
