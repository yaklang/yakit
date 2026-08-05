import { describe, expect, it } from 'vitest'
import { compareMITMPerformanceReports } from '../mitm-performance-compare.mjs'
import {
  buildComparableMetrics,
  summarizeMITMPipelineSamples,
  summarizeResourceSamples,
} from '../mitm-performance-reporter.mjs'

const createReport = (value, direction = 'lower') => ({
  schemaVersion: 1,
  kind: 'yakit-electron-mitm-http-performance',
  status: 'passed',
  profile: 'smoke',
  system: { platform: 'linux', arch: 'x64', node: 'v22.12.0' },
  config: {
    harnessVersion: 5,
    protocol: 'http',
    loopbackOnly: true,
    requests: 40,
    concurrency: 4,
    requestBodyBytes: 0,
    responseBodyBytes: 32 * 1024,
    responseContentEncoding: 'identity',
    requestTimeoutMs: 10_000,
    resourceSampleIntervalMs: 200,
    resourceIdleCPUThresholdPercent: 25,
    resourceIdleStableSamples: 3,
    resourceIdleTimeoutMs: 30_000,
    resourceBaselineSamples: 5,
    resourceRecoveryTimeoutMs: 10_000,
    engineMaxProcs: 2,
    engineMemoryLimit: '2GiB',
    rendererBuildMode: 'production-unminified',
    rendererReactMode: 'production',
    httpFlowLiveStreamMode: 'shadow',
    consumerMode: 'follow',
    sqliteProjectMaxOpenConns: 1,
    sqliteProjectReadPoolConns: 0,
  },
  correctness: {
    producer: { failed: 0 },
    target: { receivedRequests: 40, duplicateSequences: [] },
    database: { total: 40, uniqueIds: 40, allStatus200: true, allMITM: true },
  },
  cleanup: { mitmStopped: true, targetStopped: true, errors: [] },
  revisions: { frontend: { head: 'test' } },
  metrics: [{ name: 'test.metric', value, unit: 'ms', direction, area: 'test' }],
})

describe('MITM Electron performance comparison', () => {
  it('uses both a relative threshold and an absolute noise floor', () => {
    const noise = compareMITMPerformanceReports(createReport(100), createReport(112))
    expect(noise.status).toBe('passed')
    expect(noise.comparisons[0].status).toBe('noise')

    const regression = compareMITMPerformanceReports(createReport(100), createReport(130))
    expect(regression.status).toBe('failed')
    expect(regression.comparisons[0].status).toBe('regression')
  })

  it('rejects configuration or metric coverage drift', () => {
    const changedConfig = createReport(100)
    changedConfig.config.concurrency = 8
    expect(() => compareMITMPerformanceReports(createReport(100), changedConfig)).toThrow(/Config mismatch/)

    const changedHarness = createReport(100)
    changedHarness.config.harnessVersion = 2
    expect(() => compareMITMPerformanceReports(createReport(100), changedHarness)).toThrow(
      /Config mismatch for harnessVersion/,
    )

    const changedSQLitePool = createReport(100)
    changedSQLitePool.config.sqliteProjectMaxOpenConns = 2
    expect(() => compareMITMPerformanceReports(createReport(100), changedSQLitePool)).toThrow(
      /Config mismatch for sqliteProjectMaxOpenConns/,
    )

    const changedSQLiteReadPool = createReport(100)
    changedSQLiteReadPool.config.sqliteProjectReadPoolConns = 1
    expect(() => compareMITMPerformanceReports(createReport(100), changedSQLiteReadPool)).toThrow(
      /Config mismatch for sqliteProjectReadPoolConns/,
    )

    const changedHTTPFlowLiveStreamMode = createReport(100)
    changedHTTPFlowLiveStreamMode.config.httpFlowLiveStreamMode = 'canary'
    expect(() => compareMITMPerformanceReports(createReport(100), changedHTTPFlowLiveStreamMode)).toThrow(
      /Config mismatch for httpFlowLiveStreamMode/,
    )

    const changedResponseContentEncoding = createReport(100)
    changedResponseContentEncoding.config.responseContentEncoding = 'gzip'
    expect(() => compareMITMPerformanceReports(createReport(100), changedResponseContentEncoding)).toThrow(
      /Config mismatch for responseContentEncoding/,
    )

    const changedConsumerMode = createReport(100)
    changedConsumerMode.config.consumerMode = 'scroll-away'
    changedConsumerMode.correctness.consumer = {
      paused: true,
      resumed: true,
      remainedAway: true,
      restoredToTop: true,
      backlogObserved: true,
      caughtUp: true,
    }
    expect(() => compareMITMPerformanceReports(createReport(100), changedConsumerMode)).toThrow(
      /Config mismatch for consumerMode/,
    )

    const missingMetric = createReport(100)
    missingMetric.metrics = []
    expect(() => compareMITMPerformanceReports(createReport(100), missingMetric)).toThrow(/Metric coverage mismatch/)

    const profiled = createReport(100)
    profiled.config.yakCPUProfileEnabled = true
    expect(() => compareMITMPerformanceReports(createReport(100), profiled)).toThrow(/diagnostic-only/)

    const heapProfiled = createReport(100)
    heapProfiled.config.yakHeapProfileEnabled = true
    expect(() => compareMITMPerformanceReports(createReport(100), heapProfiled)).toThrow(/diagnostic-only/)

    const rendererTraced = createReport(100)
    rendererTraced.config.rendererTraceEnabled = true
    expect(() => compareMITMPerformanceReports(createReport(100), rendererTraced)).toThrow(/diagnostic-only/)
  })

  it('keeps variable-window ratios diagnostic while gating total blocking time', () => {
    const baseline = createReport(100)
    const candidate = createReport(100)
    baseline.metrics = [
      {
        name: 'electron_mitm_http.live.next_query_delay_p95_ms',
        value: 500,
        unit: 'ms',
        direction: 'lower',
        area: 'live-consumer',
      },
      {
        name: 'electron_mitm_http.renderer.long_task_count',
        value: 4,
        unit: 'count',
        direction: 'lower',
        area: 'renderer',
      },
      {
        name: 'electron_mitm_http.httpflow_live_stream.server_to_receive_p95_ms',
        value: 5,
        unit: 'ms',
        direction: 'lower',
        area: 'httpflow-live-stream',
      },
    ]
    candidate.metrics = [
      {
        name: 'electron_mitm_http.live.next_query_delay_p95_ms',
        value: 1_000,
        unit: 'ms',
        direction: 'lower',
        area: 'live-consumer',
      },
      {
        name: 'electron_mitm_http.renderer.long_task_count',
        value: 10,
        unit: 'count',
        direction: 'lower',
        area: 'renderer',
      },
      {
        name: 'electron_mitm_http.httpflow_live_stream.server_to_receive_p95_ms',
        value: 50,
        unit: 'ms',
        direction: 'lower',
        area: 'httpflow-live-stream',
      },
    ]
    baseline.renderer = { longTasks: { totalDurationMs: 200, observationDurationMs: 5_000 } }
    candidate.renderer = { longTasks: { totalDurationMs: 500, observationDurationMs: 5_000 } }

    const comparison = compareMITMPerformanceReports(baseline, candidate)
    expect(comparison.status).toBe('failed')
    expect(comparison.comparisons.filter((item) => item.status === 'diagnostic')).toHaveLength(4)
    expect(comparison.comparisons.find((item) => item.name.endsWith('long_task_blocking_ratio_percent'))).toMatchObject(
      { status: 'diagnostic', gating: false },
    )
    expect(comparison.comparisons.find((item) => item.name.endsWith('long_task_total_ms'))?.status).toBe('regression')
  })

  it('summarizes bounded resource samples and emits stable metric names', () => {
    const samples = [
      {
        phase: 'load',
        electron: [
          { cpuPercent: 10, workingSetSizeKB: 1024 },
          { cpuPercent: 20, workingSetSizeKB: 2048 },
        ],
        yak: { cpuPercent: 30, workingSetSizeKB: 4096 },
      },
      {
        phase: 'drain',
        electron: [{ cpuPercent: 40, workingSetSizeKB: 4096 }],
        yak: { cpuPercent: 50, workingSetSizeKB: 8192 },
      },
    ]
    expect(summarizeResourceSamples(samples).load).toMatchObject({
      electronCPUPercent: { count: 1, p95: 30 },
      electronWorkingSetMB: { count: 1, max: 3 },
      yakCPUPercent: { count: 1, p95: 30 },
      yakWorkingSetMB: { count: 1, max: 4 },
    })

    const metrics = buildComparableMetrics({
      load: { requestsPerSecond: 20, latencyMs: { p95: 50, p99: 60 } },
      timing: {
        databaseCatchUpMs: 90,
        databaseDrainMs: 100,
        rendererDrainMs: 200,
        cpuRecoveryMs: 300,
        producerStopToCPURecoveryMs: 500,
        consumerPauseWindowMs: 4_000,
        consumerResumeToRendererDrainMs: 700,
      },
      consumer: {
        pauseEnd: {
          pipeline: {
            streamVisibleIdBacklog: 120,
            producerPersistenceBacklog: 4,
          },
        },
      },
      pipeline: {
        summary: summarizeMITMPipelineSamples([
          {
            atUnixMs: 1,
            phase: 'load',
            producerPersistenceBacklog: 12,
            streamVisibleIdBacklog: 9,
            approximateIdBacklog: 8,
            asyncWriteQueueDepth: 7,
            asyncWriteQueueUtilization: 0.25,
            pendingQueries: 1,
            activeQueries: 1,
            pendingFlows: 6,
            pendingLiveTriggers: 2,
            pendingFlowCommittedShadow: 11,
          },
          {
            atUnixMs: 2,
            phase: 'producer-stop',
            producerReceivedRequests: 40,
            producerPersistenceBacklog: 4,
            streamVisibleIdBacklog: 3,
            approximateIdBacklog: 2,
            asyncWriteQueueDepth: 1,
            asyncWriteQueueUtilization: 0.1,
            pendingQueries: 0,
            activeQueries: 0,
            pendingFlows: 1,
            pendingLiveTriggers: 0,
            pendingFlowCommittedShadow: 3,
          },
        ]),
      },
      resources: { summary: summarizeResourceSamples(samples) },
      renderer: {
        firstScenarioRow: { latencyFromLoadStartMs: 150 },
        longTasks: { durationMs: { count: 2 }, totalDurationMs: 120, observationDurationMs: 2_000 },
      },
      observability: {
        live: {
          triggerToQueryStartMs: { p95: 700 },
          queryExecutionMs: { p95: 100 },
          queryCompleteToReactCommitMs: { p95: 20 },
          triggerToReactCommitMs: { p95: 820 },
          nextQueryDelayMs: { p95: 1_000 },
          timeline: [{ triggerSource: 'httpflow-live-stream', coalescedTriggers: 3 }],
        },
        query: {
          responsePacketBytes: { p95: 32 * 1024 },
          backendConversionUsPerFlow: { p95: 42 },
        },
        flowCommittedShadow: {
          received: 40,
          queryMatches: 26,
          directMatches: 40,
          initialSnapshotOmitted: 14,
          directRowsWithoutEvent: 0,
          pending: 0,
        },
        httpFlowLiveStream: {
          subscriptions: 1,
          received: 42,
          committed: 40,
          heartbeats: 2,
          gaps: 0,
          replayed: 0,
          invalidEnvelopes: 0,
          invalidEvents: 0,
          sequenceGaps: 0,
          duplicates: 0,
          outOfOrder: 0,
          unavailable: 0,
          ended: 0,
          directBatches: 5,
          directRows: 40,
          directFallbackRows: 0,
          serverToReceiveMs: { p95: 4 },
          committedToReceiveMs: { p95: 5 },
        },
      },
    })
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.resource.yak_load_cpu_p95_percent')
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.resource.yak_load_cpu_p50_percent')
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.resource.yak_drain_cpu_p95_percent')
    expect(metrics.map((metric) => metric.name)).toContain(
      'electron_mitm_http.backlog.producer_stop.persistence_backlog',
    )
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.recovery.producer_stop_to_cpu_ms')
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.consumer.resume_to_renderer_drain_ms')
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.consumer.pause_end_visible_id_backlog')
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.renderer.first_visible_ms')
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.recovery.cpu_ms')
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.live.trigger_to_query_start_p95_ms')
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.query.response_packet_bytes_p95')
    expect(metrics.map((metric) => metric.name)).toContain(
      'electron_mitm_http.query.backend_conversion_per_flow_p95_us',
    )
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.renderer.long_task_total_ms')
    expect(metrics.map((metric) => metric.name)).toContain(
      'electron_mitm_http.httpflow_live_stream.commit_to_receive_p95_ms',
    )
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.httpflow_live_stream.direct_rows')
    expect(metrics.map((metric) => metric.name)).toContain(
      'electron_mitm_http.live.httpflow_live_stream_trigger_cycles',
    )
    expect(metrics.map((metric) => metric.name)).toContain(
      'electron_mitm_http.renderer.long_task_blocking_ratio_percent',
    )
    expect(metrics.map((metric) => metric.name)).toContain(
      'electron_mitm_http.flow_committed_shadow.initial_snapshot_omitted',
    )
    expect(metrics.map((metric) => metric.name)).toContain('electron_mitm_http.flow_committed_shadow.direct_matches')
  })
})
