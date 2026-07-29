import { describe, expect, it, vi } from 'vitest'
import type { HTTPFlow, YakQueryHTTPFlowResponse } from '../HTTPFlowTable.constants'
import {
  createHTTPFlowLiveDirectBatcher,
  createHTTPFlowLiveDirectRecoveryGate,
  createHTTPFlowLiveRefreshScheduler,
  createHTTPFlowLiveStreamController,
  HTTP_FLOW_LIVE_PROTOCOL_VERSION,
  httpFlowLiveSummaryToHTTPFlow,
  shouldPreferHTTPFlowLiveRefresh,
  type HTTPFlowLiveStreamTransport,
} from '../HTTPFlowTable.stream'

const committedType = 'HTTP_FLOW_LIVE_EVENT_TYPE_COMMITTED'
const heartbeatType = 'HTTP_FLOW_LIVE_EVENT_TYPE_HEARTBEAT'

class FakeTransport implements HTTPFlowLiveStreamTransport {
  starts: Array<{ request: SubscribeHTTPFlowsRequest; token: string }> = []
  cancels: string[] = []
  data = new Map<string, (event: HTTPFlowLiveEvent) => void>()
  errors = new Map<string, (error: unknown) => void>()
  ends = new Map<string, () => void>()

  start = (request: SubscribeHTTPFlowsRequest, token: string) => {
    this.starts.push({ request, token })
  }

  cancel = (token: string) => {
    this.cancels.push(token)
  }

  onData = (token: string, callback: (event: HTTPFlowLiveEvent) => void) => {
    this.data.set(token, callback)
    return () => this.data.delete(token)
  }

  onError = (token: string, callback: (error: unknown) => void) => {
    this.errors.set(token, callback)
    return () => this.errors.delete(token)
  }

  onEnd = (token: string, callback: () => void) => {
    this.ends.set(token, callback)
    return () => this.ends.delete(token)
  }

  emitData(event: HTTPFlowLiveEvent, index = this.starts.length - 1) {
    const token = this.starts[index].token
    this.data.get(token)?.(event)
  }

  emitError(error: unknown, index = this.starts.length - 1) {
    const token = this.starts[index].token
    this.errors.get(token)?.(error)
  }
}

const flow = (Id: number): HTTPFlow =>
  ({
    Id,
    Request: new Uint8Array(),
    Response: new Uint8Array(),
  }) as HTTPFlow

const liveFlow = (Id: number): HTTPFlowLiveSummary => ({ Id })

const queryResponse = (
  databaseIdentity: string,
  projectGeneration: number,
  ids: number[],
  latestPersistedId = Math.max(0, ...ids),
): YakQueryHTTPFlowResponse =>
  ({
    Data: ids.map(flow),
    Total: ids.length,
    Pagination: { Page: 1, Limit: 100, Order: 'desc', OrderBy: 'id' },
    SystemTiming: {
      ServerReceivedAtUnixMs: 0,
      SQLFinishedAtUnixMs: 0,
      ConversionFinishedAtUnixMs: 0,
      ResponseReadyAtUnixMs: 0,
      QueryDurationUs: 0,
      ConversionDurationUs: 0,
      CountDurationUs: 0,
      DataQueryDurationUs: 0,
      CountExecuted: false,
      AsyncWriteQueueDepth: 0,
      AsyncWriteQueueCapacity: 0,
      DatabaseIdentity: databaseIdentity,
      ProjectGeneration: projectGeneration,
      LatestPersistedId: latestPersistedId,
      LatestPersistedAtUnixMs: 0,
      LatestDetectedId: latestPersistedId,
      LatestDetectedAtUnixMs: 0,
      ReturnedFlowCount: ids.length,
      SampledFlowCount: 0,
      FlowTimings: [],
    },
  }) as YakQueryHTTPFlowResponse

const event = (
  token: string,
  sequence: number,
  id: number,
  type = committedType,
  databaseIdentity = 'db-a',
  projectGeneration = 7,
): HTTPFlowLiveEvent => ({
  ProtocolVersion: HTTP_FLOW_LIVE_PROTOCOL_VERSION,
  Type: type,
  Sequence: sequence,
  ProjectGeneration: projectGeneration,
  DatabaseIdentity: databaseIdentity,
  SessionId: token,
  Flow: type === committedType ? liveFlow(id) : undefined,
})

describe('HTTPFlow live stream controller', () => {
  it('starts after bootstrap using the maximum row ID, not a later timing high-water', () => {
    const transport = new FakeTransport()
    const controller = createHTTPFlowLiveStreamController({
      transport,
      createToken: () => 'stream-1',
      getMode: () => 'shadow',
    })

    controller.observeQuery(queryResponse('db-a', 7, [10, 12, 11], 99), { SourceType: 'mitm' })

    expect(transport.starts).toHaveLength(1)
    expect(transport.starts[0].request).toMatchObject({
      LastSeenSequence: 0,
      LastSeenId: 12,
      ProjectGeneration: 7,
      DatabaseIdentity: 'db-a',
      Filter: { SourceType: 'mitm' },
    })
  })

  it('accepts a replay baseline and turns a sequence hole into explicit recovery', () => {
    const transport = new FakeTransport()
    const committed = vi.fn()
    const gap = vi.fn()
    let tokenIndex = 0
    const controller = createHTTPFlowLiveStreamController({
      transport,
      createToken: () => `stream-${++tokenIndex}`,
      getMode: () => 'canary',
      onCommitted: committed,
      onGap: gap,
    })
    controller.observeQuery(queryResponse('db-a', 7, [10]), { SourceType: 'mitm' })

    transport.emitData(event('stream-1', 5, 11))
    transport.emitData(event('stream-1', 5, 0, heartbeatType))
    expect(committed).toHaveBeenCalledTimes(1)
    expect(controller.snapshot()).toMatchObject({ lastSeenSequence: 5, lastSeenId: 11, recovering: false })

    transport.emitData(event('stream-1', 7, 13))
    expect(gap).toHaveBeenCalledTimes(1)
    expect(controller.snapshot().recovering).toBe(true)
    expect(transport.cancels).toContain('stream-1')

    controller.observeQuery(queryResponse('db-a', 7, [11, 12, 13]), { SourceType: 'mitm' })
    expect(transport.starts).toHaveLength(2)
    expect(transport.starts[1].request).toMatchObject({ LastSeenSequence: 0, LastSeenId: 13 })
  })

  it('does not subscribe when the table filter cannot be evaluated by protocol v1', () => {
    const transport = new FakeTransport()
    const reset = vi.fn()
    const controller = createHTTPFlowLiveStreamController({
      transport,
      createToken: () => 'filtered',
      getMode: () => 'shadow',
      onReset: reset,
    })

    controller.observeQuery(queryResponse('db-a', 7, [1]), { SourceType: 'mitm', Keyword: 'admin' })
    expect(transport.starts).toHaveLength(0)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('clears pending consumer state before switching projects', () => {
    const transport = new FakeTransport()
    const reset = vi.fn()
    let tokenIndex = 0
    const controller = createHTTPFlowLiveStreamController({
      transport,
      createToken: () => `project-${++tokenIndex}`,
      getMode: () => 'canary',
      onReset: reset,
    })

    controller.observeQuery(queryResponse('db-a', 7, [10]), { SourceType: 'mitm' })
    controller.observeQuery(queryResponse('db-b', 8, [1]), { SourceType: 'mitm' })
    expect(reset).toHaveBeenCalledTimes(2)
    expect(transport.starts[1].request).toMatchObject({ DatabaseIdentity: 'db-b', LastSeenId: 1 })
  })

  it('resumes from the database recovery cursor instead of cancelled direct rows', () => {
    const transport = new FakeTransport()
    let tokenIndex = 0
    const controller = createHTTPFlowLiveStreamController({
      transport,
      createToken: () => `recovery-${++tokenIndex}`,
      getMode: () => 'canary',
    })
    controller.observeQuery(queryResponse('db-a', 7, [10]), { SourceType: 'mitm' })
    transport.emitData(event('recovery-1', 5, 11))
    transport.emitData(event('recovery-1', 6, 0, 'HTTP_FLOW_LIVE_EVENT_TYPE_GAP'))

    controller.observeQuery(queryResponse('db-a', 7, [10]), { SourceType: 'mitm' })
    expect(transport.starts[1].request).toMatchObject({ LastSeenSequence: 0, LastSeenId: 10 })
  })

  it('cancels an active shadow stream on the first heartbeat after mode is disabled', () => {
    const transport = new FakeTransport()
    let mode: 'off' | 'shadow' = 'shadow'
    const controller = createHTTPFlowLiveStreamController({
      transport,
      createToken: () => 'mode-switch',
      getMode: () => mode,
    })
    controller.observeQuery(queryResponse('db-a', 7, [1]), { SourceType: 'mitm' })

    mode = 'off'
    transport.emitData(event('mode-switch', 0, 0, heartbeatType))

    expect(transport.cancels).toContain('mode-switch')
    expect(controller.snapshot().active).toBe(false)
  })

  it('falls back for an unavailable engine without reconnecting on every query', () => {
    const transport = new FakeTransport()
    const unavailable = vi.fn()
    let tokenIndex = 0
    const controller = createHTTPFlowLiveStreamController({
      transport,
      createToken: () => `fallback-${++tokenIndex}`,
      getMode: () => 'shadow',
      onUnavailable: unavailable,
    })

    controller.observeQuery(queryResponse('db-a', 7, [1]), { SourceType: 'mitm' })
    transport.emitError('12 UNIMPLEMENTED')
    controller.observeQuery(queryResponse('db-a', 7, [1, 2]), { SourceType: 'mitm' })
    expect(unavailable).toHaveBeenCalledTimes(1)
    expect(transport.starts).toHaveLength(1)

    controller.observeQuery(queryResponse('db-b', 8, [1]), { SourceType: 'mitm' })
    expect(transport.starts).toHaveLength(2)
  })
})

describe('HTTPFlow live direct summaries', () => {
  it('maps the body-free protocol row into a complete table row', () => {
    const row = httpFlowLiveSummaryToHTTPFlow({
      Id: '42',
      IsHTTPS: true,
      Url: 'https://example.test/a',
      SourceType: 'mitm',
      Path: '/a',
      Method: 'POST',
      BodyLength: '4096',
      BodySizeVerbose: '4.00 KiB',
      RequestLength: 128,
      RequestSizeVerbose: '128 B',
      ContentType: 'text/html',
      StatusCode: 201,
      GetParamsTotal: 1,
      PostParamsTotal: 2,
      CookieParamsTotal: 3,
      CreatedAt: 100,
      UpdatedAt: 101,
      Hash: 'hash-42',
      HostPort: 'example.test:443',
      Host: 'example.test',
      DurationMs: 15,
      IsTooLargeResponse: true,
      FromPlugin: 'plugin-a',
    })

    expect(row).toMatchObject({
      Id: 42,
      URL: 'https://example.test/a',
      Url: 'https://example.test/a',
      Method: 'POST',
      BodyLength: 4096,
      CookieParamsTotal: 3,
      DurationMs: 15,
      IsTooLargeResponse: true,
      FromPlugin: 'plugin-a',
      RequestString: '',
      ResponseString: '',
    })
    expect(row?.Request).toBeInstanceOf(Uint8Array)
    expect(row?.Request).toHaveLength(0)
    expect(row?.Response).toHaveLength(0)
    expect(httpFlowLiveSummaryToHTTPFlow({ Id: Number.MAX_SAFE_INTEGER + 1 })).toBeUndefined()
  })

  it('delivers the first row immediately and bounds trailing batches', () => {
    vi.useFakeTimers()
    let now = 0
    const flushed: number[][] = []
    const batcher = createHTTPFlowLiveDirectBatcher({
      minIntervalMs: 100,
      maxBatchRows: 3,
      maxPendingRows: 100,
      now: () => now,
      onFlush: (events) => flushed.push(events.map((item) => Number(item.Sequence))),
    })

    for (let sequence = 1; sequence <= 7; sequence += 1) {
      batcher.enqueue({ Sequence: sequence })
    }
    expect(flushed).toEqual([[1]])
    expect(batcher.pendingCount()).toBe(6)

    now = 100
    vi.advanceTimersByTime(100)
    expect(flushed).toEqual([[1], [2, 3, 4]])
    expect(batcher.pendingCount()).toBe(3)

    now = 200
    vi.advanceTimersByTime(100)
    expect(flushed).toEqual([[1], [2, 3, 4], [5, 6, 7]])
    expect(batcher.pendingCount()).toBe(0)
    vi.useRealTimers()
  })

  it('slows a pending flush when traffic becomes sustained without losing the trailing batch', () => {
    vi.useFakeTimers()
    let now = 0
    const flushed: number[][] = []
    const batcher = createHTTPFlowLiveDirectBatcher({
      minIntervalMs: 100,
      sustainedIntervalMs: 500,
      sustainedPendingRows: 3,
      maxBatchRows: 100,
      maxPendingRows: 100,
      now: () => now,
      onFlush: (events) => flushed.push(events.map((item) => Number(item.Sequence))),
    })

    batcher.enqueue({ Sequence: 1 })
    batcher.enqueue({ Sequence: 2 })
    batcher.enqueue({ Sequence: 3 })
    batcher.enqueue({ Sequence: 4 })
    expect(flushed).toEqual([[1]])

    now = 100
    vi.advanceTimersByTime(100)
    expect(flushed).toEqual([[1]])

    now = 499
    vi.advanceTimersByTime(399)
    expect(flushed).toEqual([[1]])

    now = 500
    vi.advanceTimersByTime(1)
    expect(flushed).toEqual([[1], [2, 3, 4]])

    batcher.enqueue({ Sequence: 5 })
    now = 600
    vi.advanceTimersByTime(100)
    expect(flushed).toEqual([[1], [2, 3, 4], [5]])
    expect(batcher.pendingCount()).toBe(0)
    vi.useRealTimers()
  })
})

describe('HTTPFlow live direct recovery gate', () => {
  it('keeps direct insertion closed until an exhausted query is visibly committed', () => {
    const changes: Array<{ required: boolean; fallbackHighWaterId: number; catchUpCandidateId: number }> = []
    const gate = createHTTPFlowLiveDirectRecoveryGate({ onChange: (snapshot) => changes.push(snapshot) })

    gate.markFallback([{ Sequence: 10, HighWaterId: 10, Flow: { Id: 10 } }])
    expect(gate.snapshot()).toEqual({ required: true, fallbackHighWaterId: 10, catchUpCandidateId: 0 })
    expect(gate.observeQuery(9, 10, true)).toBe(false)
    expect(gate.observeQuery(10, 10, false)).toBe(false)
    expect(gate.observeQuery(10, 10, true)).toBe(true)
    expect(gate.commitVisible(9, 10)).toBe(false)
    expect(gate.commitVisible(10, 10)).toBe(true)
    expect(gate.snapshot()).toEqual({ required: false, fallbackHighWaterId: 0, catchUpCandidateId: 0 })
    expect(changes.map((snapshot) => snapshot.required)).toEqual([true, true, false])
  })

  it('invalidates a catch-up candidate when another fallback row arrives', () => {
    const gate = createHTTPFlowLiveDirectRecoveryGate()

    gate.markFallback([{ Sequence: 10, Flow: { Id: 10 } }])
    expect(gate.observeQuery(10, 10, true)).toBe(true)
    gate.markFallback([{ Sequence: 11, Flow: { Id: 11 } }])

    expect(gate.snapshot()).toEqual({ required: true, fallbackHighWaterId: 11, catchUpCandidateId: 0 })
    expect(gate.commitVisible(11, 11)).toBe(false)
    expect(gate.observeQuery(11, 11, true)).toBe(true)
    expect(gate.commitVisible(11, 12)).toBe(false)
  })
})

describe('HTTPFlow live refresh scheduler', () => {
  it('flushes the first event immediately and coalesces a burst into one trailing refresh', () => {
    vi.useFakeTimers()
    let now = 0
    const onFlush = vi.fn()
    const scheduler = createHTTPFlowLiveRefreshScheduler({
      minIntervalMs: 400,
      now: () => now,
      onFlush,
    })

    scheduler.request()
    scheduler.request()
    scheduler.request()
    expect(onFlush).toHaveBeenCalledTimes(1)

    now = 399
    vi.advanceTimersByTime(399)
    expect(onFlush).toHaveBeenCalledTimes(1)

    scheduler.request()
    now = 400
    vi.advanceTimersByTime(1)
    expect(onFlush).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(1_000)
    expect(onFlush).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('retains a trailing refresh while events continue throughout the cooldown', () => {
    vi.useFakeTimers()
    let now = 0
    const onFlush = vi.fn()
    const scheduler = createHTTPFlowLiveRefreshScheduler({
      minIntervalMs: 400,
      now: () => now,
      onFlush,
    })

    scheduler.request()
    now = 100
    vi.advanceTimersByTime(100)
    scheduler.request()
    now = 200
    vi.advanceTimersByTime(100)
    scheduler.request()
    now = 399
    vi.advanceTimersByTime(199)
    expect(onFlush).toHaveBeenCalledTimes(1)

    scheduler.request()
    now = 400
    vi.advanceTimersByTime(1)
    expect(onFlush).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('cancels a trailing refresh and lets the next active session start immediately', () => {
    vi.useFakeTimers()
    let now = 0
    const onFlush = vi.fn()
    const scheduler = createHTTPFlowLiveRefreshScheduler({
      minIntervalMs: 400,
      now: () => now,
      onFlush,
    })

    scheduler.request()
    scheduler.request()
    scheduler.cancel()
    now = 800
    vi.advanceTimersByTime(800)
    expect(onFlush).toHaveBeenCalledTimes(1)

    scheduler.request()
    expect(onFlush).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('HTTPFlow live refresh preference', () => {
  const activeSnapshot = {
    active: true,
    projectKey: 'db-a:7',
    lastSeenSequence: 10,
    lastSeenId: 20,
    recovering: false,
    unavailableForProject: false,
  }

  it('suppresses the legacy wake-up only while a canary stream is healthy and visible', () => {
    expect(shouldPreferHTTPFlowLiveRefresh('MITM', true, 'canary', activeSnapshot)).toBe(true)
    expect(shouldPreferHTTPFlowLiveRefresh('MITM', true, 'shadow', activeSnapshot)).toBe(false)
    expect(shouldPreferHTTPFlowLiveRefresh('MITM', false, 'canary', activeSnapshot)).toBe(false)
    expect(shouldPreferHTTPFlowLiveRefresh('History', true, 'canary', activeSnapshot)).toBe(false)
  })

  it('keeps the legacy wake-up as the recovery and compatibility fallback', () => {
    expect(shouldPreferHTTPFlowLiveRefresh('MITM', true, 'canary', { ...activeSnapshot, active: false })).toBe(false)
    expect(shouldPreferHTTPFlowLiveRefresh('MITM', true, 'canary', { ...activeSnapshot, recovering: true })).toBe(false)
    expect(
      shouldPreferHTTPFlowLiveRefresh('MITM', true, 'canary', {
        ...activeSnapshot,
        unavailableForProject: true,
      }),
    ).toBe(false)
  })
})
