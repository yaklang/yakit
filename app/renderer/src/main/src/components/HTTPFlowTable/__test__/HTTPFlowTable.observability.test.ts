import { describe, expect, it } from 'vitest'
import type {
  HTTPFlow,
  HTTPFlowSystemTiming,
  QueryHTTPFlowSystemTiming,
  YakQueryHTTPFlowResponse,
} from '../HTTPFlowTable.constants'
import { grpcTimestampToUnixMs, MITMFlowObservability } from '../HTTPFlowTable.observability'

const flow = (Id: number) => ({ Id }) as HTTPFlow

const systemTiming = (overrides: Partial<QueryHTTPFlowSystemTiming> = {}): QueryHTTPFlowSystemTiming => ({
  ServerReceivedAtUnixMs: 1_005,
  SQLFinishedAtUnixMs: 1_025,
  ConversionFinishedAtUnixMs: 1_030,
  ResponseReadyAtUnixMs: 1_035,
  QueryDurationUs: 20_000,
  ConversionDurationUs: 5_000,
  CountDurationUs: 12_000,
  DataQueryDurationUs: 7_000,
  CountExecuted: true,
  AsyncWriteQueueDepth: 10,
  AsyncWriteQueueCapacity: 100,
  DatabaseIdentity: 'project-a',
  ProjectGeneration: 1,
  LatestPersistedId: 7,
  LatestPersistedAtUnixMs: 990,
  LatestDetectedId: 7,
  LatestDetectedAtUnixMs: 1_000,
  ReturnedFlowCount: 1,
  SampledFlowCount: 1,
  FlowTimings: [],
  ...overrides,
})

const response = (
  data: HTTPFlow[],
  timing?: QueryHTTPFlowSystemTiming,
  total = data.length,
): YakQueryHTTPFlowResponse =>
  ({
    Data: data,
    Total: total,
    Pagination: { Page: 1, Limit: 30 },
    SystemTiming: timing,
    YakitMainProcessTiming: {
      MainReceivedAtUnixMs: 1_002,
      GRPCStartedAtUnixMs: 1_004,
      GRPCFinishedAtUnixMs: 1_100,
      GRPCElapsedUs: 96_000,
    },
  }) as YakQueryHTTPFlowResponse

describe('MITMFlowObservability', () => {
  it('keeps diagnostic switches explicit across sample resets', () => {
    const observer = new MITMFlowObservability()
    expect(observer.isBackendSystemTimingEnabled()).toBe(true)
    expect(observer.isSkipLiveExactTotalEnabled()).toBe(true)
    observer.setBackendSystemTimingEnabled(false)
    observer.setSkipLiveExactTotalEnabled(false)
    observer.reset()
    expect(observer.isBackendSystemTimingEnabled()).toBe(false)
    expect(observer.isSkipLiveExactTotalEnabled()).toBe(false)
    expect(observer.snapshot().config).toEqual({
      backendSystemTimingEnabled: false,
      skipLiveExactTotalEnabled: false,
      flowCommittedShadowEnabled: true,
      flowCommittedMode: 'shadow',
      httpFlowLiveStreamMode: 'canary',
      httpFlowLiveRefreshMinIntervalMs: 700,
      httpFlowLiveDirectMinIntervalMs: 100,
      httpFlowLiveDirectSustainedIntervalMs: 100,
      httpFlowLiveDirectSustainedPendingRows: 8,
      mitmFlowTableOverscan: 2,
    })
  })

  it('resets atomically only after active queries have committed and ignores stale tokens', () => {
    const observer = new MITMFlowObservability()
    const token = observer.beginQuery()
    expect(observer.pipelineSnapshot().state.activeQueries).toBe(1)
    expect(observer.resetIfIdle()).toBe(false)

    observer.completeQuery(token, response([flow(7)], systemTiming()))
    expect(observer.pipelineSnapshot().state).toMatchObject({ activeQueries: 0, pendingQueries: 1 })
    expect(observer.resetIfIdle()).toBe(false)

    observer.markVisible([flow(7)])
    expect(observer.resetIfIdle()).toBe(true)
    expect(observer.pipelineSnapshot().state).toMatchObject({
      activeQueries: 0,
      pendingQueries: 0,
      querySamples: 0,
      latestVisibleId: 0,
    })

    const stale = observer.beginQuery()
    observer.reset()
    observer.completeQuery(stale, response([flow(7)], systemTiming()))
    expect(observer.pipelineSnapshot().state).toMatchObject({
      activeQueries: 0,
      pendingQueries: 0,
      querySamples: 0,
      latestBackendPersistedId: 0,
    })
  })

  it('reconciles opt-in FlowCommitted shadow events without triggering the live UI consumer', () => {
    let now = 1_700_000_000_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )
    observer.setFlowCommittedShadowEnabled(true)

    now += 20
    const signal = observer.recordHTTPFlowCommitted(
      {
        version: 1,
        id: 7,
        project_generation: 3,
        database_identity: 'shadow-project',
        committed_at_unix_ms: 1_700_000_000_010,
        high_water_id: 7,
      },
      '1700000000015000000',
    )
    expect(signal).toMatchObject({
      id: 7,
      projectGeneration: 3,
      databaseIdentity: 'shadow-project',
      highWaterId: 7,
      serverSentAtUnixMs: 1_700_000_000_015,
    })

    now += 100
    const token = observer.beginQuery()
    observer.completeQuery(
      token,
      response(
        [flow(7)],
        systemTiming({
          DatabaseIdentity: 'shadow-project',
          ProjectGeneration: 3,
          LatestPersistedId: 7,
          FlowTimings: [
            {
              Id: 7,
              ProjectGeneration: 3,
              RequestHijackAtUnixMs: 0,
              ResponseMirrorAtUnixMs: 0,
              FlowBuiltAtUnixMs: 0,
              PersistEnqueuedAtUnixMs: 0,
              PersistStartedAtUnixMs: 0,
              PersistedAtUnixMs: 1_700_000_000_010,
              DatabaseChangeDetectedAtUnixMs: 0,
            },
          ],
        }),
      ),
    )

    expect(observer.snapshot()).toMatchObject({
      state: { pendingLiveTriggers: 0, pendingFlowCommittedShadow: 0 },
      flowCommittedShadow: {
        mode: 'shadow',
        received: 1,
        invalid: 0,
        duplicates: 0,
        outOfOrder: 0,
        queryMatches: 1,
        queryRowsWithoutEvent: 0,
        pending: 0,
        deliveryMs: { p95: 5 },
        committedToReceiveMs: { p95: 10 },
        committedToQueryObservedMs: { p95: 110 },
        shadowToQueryObservedMs: { p95: 100 },
      },
    })
  })

  it('reconciles a row queried between SQLite commit and FlowCommitted publication', () => {
    let now = 1_700_000_000_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )
    observer.setFlowCommittedShadowEnabled(true)

    now += 20
    const token = observer.beginQuery()
    observer.completeQuery(
      token,
      response(
        [flow(7)],
        systemTiming({
          DatabaseIdentity: 'shadow-project',
          ProjectGeneration: 3,
          LatestPersistedId: 7,
          // The writer records RuntimeTiming immediately after db.Create
          // returns, so this legal interleaving has no timing sample yet.
          FlowTimings: [],
        }),
      ),
    )

    now += 10
    observer.recordHTTPFlowCommitted(
      {
        version: 1,
        id: 7,
        project_generation: 3,
        database_identity: 'shadow-project',
        committed_at_unix_ms: now,
        high_water_id: 7,
      },
      String(now * 1_000_000),
    )

    expect(observer.snapshot()).toMatchObject({
      state: { pendingFlowCommittedShadow: 0 },
      flowCommittedShadow: {
        received: 1,
        queryMatches: 1,
        queryRowsWithoutEvent: 0,
        pending: 0,
      },
    })
  })

  it('classifies the prefix intentionally omitted by the first newest-page snapshot', () => {
    let now = 1_700_000_000_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )

    for (let id = 1; id <= 35; id += 1) {
      now += 1
      observer.recordHTTPFlowCommitted(
        {
          version: 1,
          id,
          project_generation: 3,
          database_identity: 'shadow-project',
          committed_at_unix_ms: now,
          high_water_id: id,
        },
        String(now * 1_000_000),
      )
    }

    const token = observer.beginQuery()
    observer.completeQuery(
      token,
      response(
        Array.from({ length: 21 }, (_, index) => flow(index + 15)),
        systemTiming({
          DatabaseIdentity: 'shadow-project',
          ProjectGeneration: 3,
          LatestPersistedId: 35,
          ReturnedFlowCount: 21,
          FlowTimings: [],
        }),
        35,
      ),
    )

    const snapshot = observer.snapshot()
    expect(snapshot.state.pendingFlowCommittedShadow).toBe(0)
    expect(snapshot.flowCommittedShadow).toMatchObject({
      received: 35,
      queryMatches: 21,
      initialSnapshotOmitted: 14,
      pending: 0,
    })
    expect(snapshot.flowCommittedShadow.received).toBe(
      snapshot.flowCommittedShadow.queryMatches +
        snapshot.flowCommittedShadow.initialSnapshotOmitted +
        snapshot.flowCommittedShadow.pending,
    )
  })

  it('does not hide a missing middle or tail as an initial snapshot omission', () => {
    let now = 1_700_000_000_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )

    for (let id = 1; id <= 35; id += 1) {
      now += 1
      observer.recordHTTPFlowCommitted(
        {
          version: 1,
          id,
          project_generation: 3,
          database_identity: 'shadow-project',
          committed_at_unix_ms: now,
          high_water_id: id,
        },
        String(now * 1_000_000),
      )
    }

    const token = observer.beginQuery()
    observer.completeQuery(
      token,
      response(
        Array.from({ length: 16 }, (_, index) => flow(index + 15)),
        systemTiming({
          DatabaseIdentity: 'shadow-project',
          ProjectGeneration: 3,
          LatestPersistedId: 35,
          ReturnedFlowCount: 16,
          FlowTimings: [],
        }),
        35,
      ),
    )

    expect(observer.snapshot()).toMatchObject({
      state: { pendingFlowCommittedShadow: 19 },
      flowCommittedShadow: {
        received: 35,
        queryMatches: 16,
        initialSnapshotOmitted: 0,
        pending: 19,
      },
    })
  })

  it('keeps off, shadow, and canary subscription modes explicit', () => {
    const observer = new MITMFlowObservability()
    observer.setFlowCommittedMode('canary')
    expect(observer.getFlowCommittedMode()).toBe('canary')
    expect(observer.snapshot().config).toMatchObject({
      flowCommittedShadowEnabled: true,
      flowCommittedMode: 'canary',
    })

    observer.setFlowCommittedMode('off')
    expect(observer.snapshot().config).toMatchObject({
      flowCommittedShadowEnabled: false,
      flowCommittedMode: 'off',
    })
  })

  it('notifies live-stream mode transitions once and supports cleanup', () => {
    const observer = new MITMFlowObservability()
    const transitions: string[] = []
    const cleanup = observer.onHTTPFlowLiveStreamModeChange((mode, previousMode) => {
      transitions.push(`${previousMode}->${mode}`)
    })

    observer.setHTTPFlowLiveStreamMode('canary')
    observer.setHTTPFlowLiveStreamMode('shadow')
    observer.setHTTPFlowLiveStreamMode('off')
    cleanup()
    observer.setHTTPFlowLiveStreamMode('canary')

    expect(transitions).toEqual(['canary->shadow', 'shadow->off'])
  })

  it('can measure legacy duplex delivery without claiming it scheduled a live query', () => {
    let now = 1_100
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )

    expect(observer.recordDuplexNotification(1_000, { recordLiveTrigger: false })).toBe(1_000)
    expect(observer.snapshot()).toMatchObject({
      state: { pendingLiveTriggers: 0 },
      duplex: { deliveryMs: { p95: 100 } },
    })

    now = 1_200
    observer.recordDuplexNotification(1_100)
    expect(observer.snapshot().state.pendingLiveTriggers).toBe(1)
  })

  it('records the dedicated summary stream independently from legacy committed events', () => {
    let now = 2_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )
    observer.setHTTPFlowLiveStreamMode('canary')
    observer.recordHTTPFlowLiveStreamSubscription('stream-project', 9)

    now = 2_050
    observer.recordHTTPFlowLiveStreamEvent({
      Type: 'HTTP_FLOW_LIVE_EVENT_TYPE_COMMITTED',
      Sequence: 4,
      ProjectGeneration: 9,
      DatabaseIdentity: 'stream-project',
      ServerAtUnixMs: 2_030,
      CommittedAtUnixMs: 2_020,
      HighWaterId: 8,
      Replayed: true,
      Flow: { Id: 8 },
    })
    observer.recordHTTPFlowLiveStreamEvent({
      Type: 'HTTP_FLOW_LIVE_EVENT_TYPE_HEARTBEAT',
      Sequence: 5,
      HighWaterId: 9,
    })
    observer.recordHTTPFlowLiveStreamEvent({
      Type: 'HTTP_FLOW_LIVE_EVENT_TYPE_GAP',
      Sequence: 6,
      HighWaterId: 10,
      Gap: { Reason: 'HTTP_FLOW_LIVE_GAP_REASON_SLOW_CONSUMER' },
    })
    observer.recordHTTPFlowLiveStreamFault('sequence-gap')
    observer.recordHTTPFlowLiveStreamFault('duplicate')
    observer.recordHTTPFlowLiveDirectRecovery(true, 10)
    observer.recordHTTPFlowLiveDirectRecovery(true, 12)
    observer.recordHTTPFlowLiveDirectRecovery(false, 0)

    expect(observer.pipelineSnapshot()).toMatchObject({
      version: 1,
      generatedAtUnixMs: 2_050,
      state: {
        latestVisibleId: 0,
        streamVisibleIdBacklog: 10,
        querySamples: 0,
        flowSamples: 0,
        liveCycles: 0,
      },
      httpFlowLiveStream: {
        mode: 'canary',
        status: 'recovering',
        received: 3,
        committed: 1,
        highWaterId: 10,
        gaps: 1,
        directRecoveryRequired: false,
        directRecoveryEntries: 1,
        directRecoveryCompletions: 1,
      },
    })

    expect(observer.snapshot()).toMatchObject({
      config: { flowCommittedMode: 'shadow', httpFlowLiveStreamMode: 'canary' },
      httpFlowLiveStream: {
        mode: 'canary',
        status: 'recovering',
        databaseIdentity: 'stream-project',
        projectGeneration: 9,
        subscriptions: 1,
        received: 3,
        committed: 1,
        heartbeats: 1,
        gaps: 1,
        replayed: 1,
        sequenceGaps: 1,
        duplicates: 1,
        latestSequence: 6,
        highWaterId: 10,
        gapReasons: { HTTP_FLOW_LIVE_GAP_REASON_SLOW_CONSUMER: 1 },
        serverToReceiveMs: { p95: 20 },
        committedToReceiveMs: { p95: 30 },
      },
    })

    observer.reset()
    expect(observer.getHTTPFlowLiveStreamMode()).toBe('canary')
    expect(observer.snapshot().httpFlowLiveStream).toMatchObject({ received: 0, status: 'idle' })
  })

  it('correlates backend, Electron, renderer, and React commit stages', () => {
    let unixMs = 1_000
    let performanceMs = 10
    const observer = new MITMFlowObservability(
      () => unixMs,
      () => performanceMs,
    )
    const token = observer.beginQuery()
    const flowTiming: HTTPFlowSystemTiming = {
      Id: 7,
      RequestHijackAtUnixMs: 900,
      ResponseMirrorAtUnixMs: 950,
      FlowBuiltAtUnixMs: 960,
      PersistEnqueuedAtUnixMs: 970,
      PersistStartedAtUnixMs: 980,
      PersistedAtUnixMs: 990,
      DatabaseChangeDetectedAtUnixMs: 1_000,
    }

    unixMs = 1_120
    performanceMs = 130
    observer.completeQuery(token, response([flow(7)], systemTiming({ FlowTimings: [flowTiming] })))

    unixMs = 1_140
    performanceMs = 150
    observer.markVisible([flow(7)])

    const snapshot = observer.snapshot()
    expect(snapshot.query.rendererRoundTripMs.p95).toBe(120)
    expect(snapshot.query.rendererToMainMs.p95).toBe(2)
    expect(snapshot.query.mainDispatchMs.p95).toBe(2)
    expect(snapshot.query.backendQueryMs.p95).toBe(20)
    expect(snapshot.query.backendCountMs.p95).toBe(12)
    expect(snapshot.query.backendDataQueryMs.p95).toBe(7)
    expect(snapshot.query.countExecutions).toBe(1)
    expect(snapshot.query.countExecutionRatio).toBe(1)
    expect(snapshot.query.recentSamples).toHaveLength(1)
    expect(snapshot.query.recentSamples[0]).toMatchObject({
      rows: 1,
      backendCountMs: 12,
      backendDataQueryMs: 7,
      countExecuted: true,
    })
    expect(snapshot.query.backendConversionMs.p95).toBe(5)
    expect(snapshot.query.backendConversionUsPerFlow.p95).toBe(5_000)
    expect(snapshot.query.backendServerTotalMs.p95).toBe(30)
    expect(snapshot.query.mainGrpcMs.p95).toBe(96)
    expect(snapshot.query.mainToBackendMs.p95).toBe(1)
    expect(snapshot.query.backendToMainMs.p95).toBe(65)
    expect(snapshot.query.mainToRendererMs.p95).toBe(20)
    expect(snapshot.query.responseToReactCommitMs.p95).toBe(20)
    expect(snapshot.query.highWaterDetectionMs.p95).toBe(10)
    expect(snapshot.flow.requestToReactCommitMs.p95).toBe(240)
    expect(snapshot.flow.responseToReactCommitMs.p95).toBe(190)
    expect(snapshot.flow.persistQueueWaitMs.p95).toBe(10)
    expect(snapshot.flow.persistWriteMs.p95).toBe(10)
    expect(snapshot.flow.databaseChangeDetectionMs.p95).toBe(10)
    expect(snapshot.flow.persistToReactCommitMs.p95).toBe(150)
    expect(snapshot.state).toMatchObject({
      latestBackendPersistedId: 7,
      latestVisibleId: 7,
      approximateIdBacklog: 0,
      asyncWriteQueueDepth: 10,
      asyncWriteQueueCapacity: 100,
      asyncWriteQueueUtilization: 0.1,
      pendingQueries: 0,
      pendingFlows: 0,
    })
    expect(observer.pipelineSnapshot().state).toMatchObject({
      latestBackendPersistedId: 7,
      latestVisibleId: 7,
      approximateIdBacklog: 0,
      streamVisibleIdBacklog: 0,
      querySamples: 1,
      flowSamples: 1,
    })
    expect(observer.pipelineStatusSnapshot()).toMatchObject({
      version: 1,
      generatedAtUnixMs: 1_140,
      state: {
        latestBackendPersistedId: 7,
        latestVisibleId: 7,
        approximateIdBacklog: 0,
        pendingQueries: 0,
      },
      flow: {
        persistQueueWaitP95: 10,
        persistWriteP95: 10,
        persistToReactCommitP95: 150,
        responseToReactCommitP95: 190,
      },
    })
  })

  it('preserves end-to-end timings when a stream summary bypasses QueryHTTPFlows', () => {
    let now = 2_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )
    observer.setHTTPFlowLiveStreamMode('canary')
    observer.recordHTTPFlowLiveStreamSubscription('stream-project', 9)
    observer.recordHTTPFlowLiveStreamEvent({
      Type: 'HTTP_FLOW_LIVE_EVENT_TYPE_COMMITTED',
      Sequence: 1,
      ProjectGeneration: 9,
      DatabaseIdentity: 'stream-project',
      ServerAtUnixMs: 1_995,
      CommittedAtUnixMs: 1_990,
      HighWaterId: 7,
      RequestHijackAtUnixMs: 1_900,
      ResponseMirrorAtUnixMs: 1_950,
      FlowBuiltAtUnixMs: 1_960,
      PersistEnqueuedAtUnixMs: 1_970,
      PersistStartedAtUnixMs: 1_980,
      Flow: { Id: 7 },
    })
    observer.recordHTTPFlowLiveDirectBatch(1)

    now = 2_050
    observer.markVisible([flow(7)])
    expect(observer.snapshot()).toMatchObject({
      state: {
        latestBackendPersistedId: 7,
        latestVisibleId: 7,
        approximateIdBacklog: 0,
        pendingFlows: 0,
      },
      httpFlowLiveStream: {
        directBatches: 1,
        directRows: 1,
        directFallbackRows: 0,
        directBatchRows: { p95: 1 },
      },
      flow: {
        count: 1,
        requestToReactCommitMs: { p95: 150 },
        responseToReactCommitMs: { p95: 100 },
        flowBuildToReactCommitMs: { p95: 90 },
        persistQueueWaitMs: { p95: 10 },
        persistWriteMs: { p95: 10 },
        persistToReactCommitMs: { p95: 60 },
      },
    })
  })

  it('reconciles direct list commits with legacy shadow events in either delivery order', () => {
    let now = 2_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )
    observer.setHTTPFlowLiveStreamMode('canary')

    observer.recordHTTPFlowCommitted(
      {
        version: 1,
        id: 7,
        project_generation: 9,
        database_identity: 'stream-project',
        committed_at_unix_ms: 1_990,
        high_water_id: 7,
      },
      '1995000000',
    )
    expect(observer.snapshot().flowCommittedShadow.pending).toBe(1)

    now = 2_050
    observer.recordHTTPFlowLiveDirectBatch(1, [
      {
        Type: 'HTTP_FLOW_LIVE_EVENT_TYPE_COMMITTED',
        ProjectGeneration: 9,
        DatabaseIdentity: 'stream-project',
        CommittedAtUnixMs: 1_990,
        Flow: { Id: 7 },
      },
    ])

    now = 2_060
    observer.recordHTTPFlowLiveDirectBatch(1, [
      {
        Type: 'HTTP_FLOW_LIVE_EVENT_TYPE_COMMITTED',
        ProjectGeneration: 9,
        DatabaseIdentity: 'stream-project',
        CommittedAtUnixMs: 2_040,
        Flow: { Id: 8 },
      },
    ])
    expect(observer.snapshot().flowCommittedShadow).toMatchObject({
      directMatches: 1,
      directRowsWithoutEvent: 1,
      pending: 0,
    })

    now = 2_070
    observer.recordHTTPFlowCommitted(
      {
        version: 1,
        id: 8,
        project_generation: 9,
        database_identity: 'stream-project',
        committed_at_unix_ms: 2_040,
        high_water_id: 8,
      },
      '2065000000',
    )

    expect(observer.snapshot().flowCommittedShadow).toMatchObject({
      received: 2,
      queryMatches: 0,
      directMatches: 2,
      directRowsWithoutEvent: 0,
      pending: 0,
      committedToDirectObservedMs: { count: 2, p95: 60 },
      shadowToDirectObservedMs: { count: 1, p95: 50 },
    })
  })

  it('keeps all sample and pending collections bounded', () => {
    let now = 1_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )
    for (let index = 0; index < 300; index += 1) {
      const token = observer.beginQuery()
      now += 1
      observer.failQuery(token)
    }

    const manyTimings = Array.from({ length: 4_200 }, (_, index) => ({
      Id: index + 1,
      RequestHijackAtUnixMs: 1,
      ResponseMirrorAtUnixMs: 2,
      FlowBuiltAtUnixMs: 3,
      PersistEnqueuedAtUnixMs: 4,
      PersistStartedAtUnixMs: 5,
      PersistedAtUnixMs: 6,
      DatabaseChangeDetectedAtUnixMs: 7,
    }))
    const token = observer.beginQuery()
    now += 1
    observer.completeQuery(
      token,
      response([], systemTiming({ FlowTimings: manyTimings, SampledFlowCount: manyTimings.length })),
    )
    for (let index = 0; index < 160; index += 1) {
      const cycle = observer.beginLiveCycle(index, 30)
      observer.completeLiveCycle(cycle, [])
      now += 1
    }

    const snapshot = observer.snapshot()
    expect(snapshot.query.count).toBe(snapshot.bounds.querySamples)
    expect(snapshot.state.pendingFlows).toBe(snapshot.bounds.pendingFlows)
    expect(snapshot.state.pendingQueries).toBeLessThanOrEqual(snapshot.bounds.pendingQueries)
    expect(snapshot.live.count).toBe(snapshot.bounds.liveCycles)
  })

  it('records a bounded live-consumer timeline from notification through React commit', () => {
    let unixMs = 1_000
    let performanceMs = 10
    const observer = new MITMFlowObservability(
      () => unixMs,
      () => performanceMs,
    )

    observer.recordLiveTrigger('duplex', 990)
    unixMs += 750
    performanceMs += 750
    const cycle = observer.beginLiveCycle(10, 30)
    const token = observer.beginQuery({ liveCycleId: cycle.id, cursorBefore: 10, requestedRows: 30 })

    unixMs += 100
    performanceMs += 100
    observer.completeQuery(
      token,
      response(
        [
          { ...flow(11), Request: new Uint8Array(4), Response: new Uint8Array(6), RequestLength: 4, BodyLength: 6 },
          { ...flow(12), Request: new Uint8Array(5), Response: new Uint8Array(7), RequestLength: 5, BodyLength: 7 },
        ] as HTTPFlow[],
        systemTiming({ LatestPersistedId: 12, LatestDetectedId: 12 }),
      ),
    )
    observer.completeLiveCycle(cycle, [flow(11), flow(12)])

    unixMs += 20
    performanceMs += 20
    observer.markVisible([flow(11), flow(12)])
    unixMs += 1_000
    performanceMs += 1_000
    observer.beginLiveCycle(12, 30, 'poll')

    const snapshot = observer.snapshot()
    expect(snapshot.live).toMatchObject({
      count: 2,
      triggerToQueryStartMs: { count: 1, p95: 750 },
      queryExecutionMs: { count: 1, p95: 100 },
      queryCompleteToReactCommitMs: { count: 1, p95: 20 },
      triggerToReactCommitMs: { count: 1, p95: 870 },
      nextQueryDelayMs: { count: 1, p95: 1_020 },
      responsePacketBytes: { p95: 13 },
      declaredResponseBodyBytes: { p95: 13 },
    })
    expect(snapshot.live.timeline[0]).toMatchObject({
      triggerSource: 'duplex',
      cursorBefore: 10,
      cursorAfter: 12,
      requestedRows: 30,
      returnedRows: 2,
      queryCount: 1,
      backendHighWaterAfter: 12,
      visibleHighWaterAfter: 12,
    })
  })

  it('resets database-local IDs when the project identity changes', () => {
    let now = 1_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )

    let token = observer.beginQuery()
    now += 1
    observer.completeQuery(token, response([flow(100)], systemTiming({ LatestPersistedId: 100 })))
    observer.markVisible([flow(100)])

    token = observer.beginQuery()
    now += 1
    observer.completeQuery(
      token,
      response([flow(2)], systemTiming({ DatabaseIdentity: 'project-b', LatestPersistedId: 2 })),
    )
    observer.markVisible([flow(2)])

    expect(observer.snapshot().state).toMatchObject({
      databaseIdentity: 'project-b',
      latestBackendPersistedId: 2,
      latestVisibleId: 2,
      approximateIdBacklog: 0,
    })

    token = observer.beginQuery()
    now += 1
    observer.completeQuery(
      token,
      response([], systemTiming({ DatabaseIdentity: 'project-b', LatestPersistedId: 0, LatestDetectedId: 0 })),
    )
    observer.markVisible([])
    expect(observer.snapshot().state).toMatchObject({
      latestBackendPersistedId: 0,
      latestVisibleId: 0,
      approximateIdBacklog: 0,
    })
  })

  it('does not mistake a query lagging the live stream for an ID reset', () => {
    let now = 1_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )

    let token = observer.beginQuery()
    now += 1
    observer.completeQuery(token, response([flow(100)], systemTiming({ LatestPersistedId: 100 })))
    observer.markVisible([flow(100)])

    now += 1
    observer.recordHTTPFlowLiveStreamEvent({
      Type: 'HTTP_FLOW_LIVE_EVENT_TYPE_COMMITTED',
      Sequence: 120,
      ProjectGeneration: 1,
      DatabaseIdentity: 'project-a',
      CommittedAtUnixMs: now,
      HighWaterId: 120,
      Flow: { Id: 120 },
    })

    token = observer.beginQuery()
    now += 1
    observer.completeQuery(
      token,
      response([flow(110)], systemTiming({ ServerReceivedAtUnixMs: 1_100, LatestPersistedId: 110 })),
    )

    expect(observer.snapshot().state).toMatchObject({
      latestBackendPersistedId: 120,
      latestVisibleId: 100,
      approximateIdBacklog: 20,
    })
  })

  it('ignores an out-of-order response from the previous project', () => {
    let now = 1_000
    const observer = new MITMFlowObservability(
      () => now,
      () => now,
    )
    const oldProjectToken = observer.beginQuery()
    const newProjectToken = observer.beginQuery()

    now += 1
    observer.completeQuery(
      newProjectToken,
      response(
        [flow(2)],
        systemTiming({ DatabaseIdentity: 'project-b', ServerReceivedAtUnixMs: 2_000, LatestPersistedId: 2 }),
      ),
    )
    now += 1
    observer.completeQuery(
      oldProjectToken,
      response(
        [flow(100)],
        systemTiming({ DatabaseIdentity: 'project-a', ServerReceivedAtUnixMs: 1_000, LatestPersistedId: 100 }),
      ),
    )

    expect(observer.snapshot()).toMatchObject({
      query: { count: 1 },
      state: { databaseIdentity: 'project-b', latestBackendPersistedId: 2 },
    })
  })
})

describe('grpcTimestampToUnixMs', () => {
  it('converts Duplex Unix nanoseconds without losing the millisecond scale', () => {
    expect(grpcTimestampToUnixMs('1700000000050000000')).toBe(1_700_000_000_050)
    expect(grpcTimestampToUnixMs(1_700_000_000_050)).toBe(1_700_000_000_050)
    expect(grpcTimestampToUnixMs('invalid')).toBe(0)
  })
})
