import { describe, expect, it, vi } from 'vitest'
import {
  createMITMLiveAdaptiveBatchState,
  drainMITMLiveBacklog,
  estimateMITMLiveRowBytes,
  MITM_LIVE_PROJECTED_ROW_ESTIMATE_BYTES,
  selectMITMLiveInitialPageSize,
  shouldSkipMITMLiveExactTotal,
  updateMITMLiveAdaptiveBatchState,
} from '../HTTPFlowTable.live'

const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ Id: index + 1 }))

describe('MITM live exact-total policy', () => {
  it('skips COUNT only for an existing forward cursor', () => {
    expect(shouldSkipMITMLiveExactTotal(120, undefined)).toBe(true)
    expect(shouldSkipMITMLiveExactTotal(0, undefined)).toBe(false)
    expect(shouldSkipMITMLiveExactTotal(undefined, undefined)).toBe(false)
    expect(shouldSkipMITMLiveExactTotal(120, 80)).toBe(false)
  })
})

describe('drainMITMLiveBacklog', () => {
  it('uses the last returned id as the strict cursor and yields at the time budget', async () => {
    const allRows = rows(1_500)
    let now = 0
    const fetchPage = vi.fn(async (afterId: number, limit: number) => {
      now += 12
      return { Data: allRows.filter((row) => row.Id > afterId).slice(0, limit) }
    })

    const result = await drainMITMLiveBacklog(
      0,
      {
        initialPageSize: 300,
        maxPageRows: 300,
        timeBudgetMs: 30,
        payloadBudgetBytes: Number.MAX_SAFE_INTEGER,
        targetPagePayloadBytes: Number.MAX_SAFE_INTEGER,
        now: () => now,
      },
      fetchPage,
    )

    expect(result.data).toHaveLength(900)
    expect(result.data[0].Id).toBe(1)
    expect(result.data[899].Id).toBe(900)
    expect(result).toMatchObject({
      cursorAfter: 900,
      pages: 3,
      hasMore: true,
      shouldContinueImmediately: true,
      stopReason: 'time-budget',
    })
    expect(fetchPage.mock.calls.map(([afterId]) => afterId)).toEqual([0, 300, 600])
  })

  it('stops as soon as the available backlog is shorter than a page', async () => {
    const allRows = rows(450)
    const fetchPage = vi.fn(async (afterId: number, limit: number) => ({
      Data: allRows.filter((row) => row.Id > afterId).slice(0, limit),
    }))

    const result = await drainMITMLiveBacklog(
      0,
      {
        initialPageSize: 300,
        maxPageRows: 300,
        timeBudgetMs: 1_000,
        payloadBudgetBytes: Number.MAX_SAFE_INTEGER,
        targetPagePayloadBytes: Number.MAX_SAFE_INTEGER,
        now: () => 0,
      },
      fetchPage,
    )

    expect(result.data).toEqual(allRows)
    expect(result).toMatchObject({
      cursorAfter: 450,
      pages: 2,
      hasMore: false,
      shouldContinueImmediately: false,
      stopReason: 'exhausted',
    })
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('adapts subsequent page size to a bounded packet-byte budget', async () => {
    const allRows = rows(100).map((row) => ({ ...row, Response: new Uint8Array(64 * 1024) }))
    const fetchPage = vi.fn(async (afterId: number, limit: number) => ({
      Data: allRows.filter((row) => row.Id > afterId).slice(0, limit),
      SystemTiming: { LatestPersistedId: 100 },
    }))

    const result = await drainMITMLiveBacklog(
      0,
      {
        initialPageSize: 30,
        timeBudgetMs: 1_000,
        payloadBudgetBytes: 2 * 1024 * 1024,
        now: () => 0,
      },
      fetchPage,
    )

    expect(result).toMatchObject({
      cursorAfter: 32,
      pages: 2,
      hasMore: true,
      shouldContinueImmediately: true,
      stopReason: 'payload-budget',
    })
    expect(result.payloadBytes).toBe(2 * 1024 * 1024)
    expect(fetchPage.mock.calls).toEqual([
      [0, 30],
      [30, 2],
    ])
  })

  it('stops rather than looping when a response cannot advance the cursor', async () => {
    const fetchPage = vi.fn(async () => ({ Data: [{ Id: 9 }, { Id: 10 }] }))
    const result = await drainMITMLiveBacklog(10, { initialPageSize: 30 }, fetchPage)

    expect(result).toMatchObject({ cursorAfter: 10, pages: 1, hasMore: false, stopReason: 'cursor-stalled' })
    expect(result.data).toEqual([])
  })

  it('waits for the coalesced push when the high-water mark advanced during a short page', async () => {
    let now = 0
    const result = await drainMITMLiveBacklog(10, { initialPageSize: 30, now: () => now }, async () => {
      now = 33
      return { Data: [{ Id: 11 }, { Id: 12 }], SystemTiming: { LatestPersistedId: 15 } }
    })

    expect(result).toMatchObject({
      cursorAfter: 12,
      hasMore: true,
      shouldContinueImmediately: false,
      stopReason: 'time-budget',
    })
  })
})

describe('MITM live adaptive batch sizing', () => {
  it('uses the visible viewport for the first responsive batch', () => {
    const state = createMITMLiveAdaptiveBatchState()
    expect(selectMITMLiveInitialPageSize(21, state)).toBe(21)
  })

  it('sizes catch-up batches from observed packet bytes rather than a fixed row count', () => {
    const state = updateMITMLiveAdaptiveBatchState(createMITMLiveAdaptiveBatchState(), {
      rows: 21,
      payloadBytes: 21 * 64 * 1024,
      hasMore: true,
    })

    expect(selectMITMLiveInitialPageSize(21, state)).toBe(64)
  })

  it('does not treat projected detail-body lengths as list transport bytes', () => {
    const projectedRow = {
      Id: 1,
      Request: new Uint8Array(),
      Response: new Uint8Array(),
      RequestLength: 64 * 1024,
      BodyLength: 256 * 1024,
    }
    expect(estimateMITMLiveRowBytes(projectedRow)).toBe(MITM_LIVE_PROJECTED_ROW_ESTIMATE_BYTES)

    const state = updateMITMLiveAdaptiveBatchState(createMITMLiveAdaptiveBatchState(), {
      rows: 21,
      payloadBytes: 21 * estimateMITMLiveRowBytes(projectedRow),
      hasMore: true,
    })
    expect(selectMITMLiveInitialPageSize(21, state)).toBe(256)
  })

  it('reacts immediately to larger rows and keeps byte-based sizing after catch-up', () => {
    const previous = { bytesPerRow: 8 * 1024, catchingUp: true }
    const observed = updateMITMLiveAdaptiveBatchState(previous, {
      rows: 2,
      payloadBytes: 4 * 1024 * 1024,
      hasMore: true,
    })
    expect(selectMITMLiveInitialPageSize(21, observed)).toBe(2)

    const caughtUp = updateMITMLiveAdaptiveBatchState(observed, {
      rows: 1,
      payloadBytes: 2 * 1024 * 1024,
      hasMore: false,
    })
    expect(selectMITMLiveInitialPageSize(21, caughtUp)).toBe(1)
  })

  it('uses the normal payload target after a small-row stream is caught up', () => {
    const caughtUp = { bytesPerRow: 4 * 1024, catchingUp: false }
    expect(selectMITMLiveInitialPageSize(21, caughtUp)).toBe(256)
  })
})
