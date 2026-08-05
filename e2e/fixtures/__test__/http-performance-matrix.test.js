// @vitest-environment node

import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import {
  aggregateMITMBodyMatrixCase,
  renderMITMBodyMatrixMarkdown,
  resolveMITMBodyMatrix,
  summarizeMITMBodyMatrixCase,
  summarizeMITMBodyMatrixMeasurements,
} from '../http-performance/http-performance-matrix.mjs'

const execFileAsync = promisify(execFile)

describe('MITM HTTP body matrix', () => {
  it('prints help without starting a matrix run', async () => {
    const result = await execFileAsync(
      process.execPath,
      [path.resolve('scripts/run-electron-mitm-body-matrix.mjs'), '--help'],
      { cwd: process.cwd() },
    )

    expect(result.stdout).toContain('Usage: node scripts/run-electron-mitm-body-matrix.mjs')
    expect(result.stdout).toContain('--httpflow-live-stream-mode <mode>')
    expect(result.stderr).toBe('')
  })

  it('rejects timing-free traces that cannot bootstrap the live stream', async () => {
    await expect(
      execFileAsync(
        process.execPath,
        [
          path.resolve('scripts/run-electron-mitm-body-matrix.mjs'),
          '--renderer-trace',
          '--disable-system-timing',
          '--httpflow-live-stream-mode',
          'shadow',
        ],
        { cwd: process.cwd() },
      ),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('--disable-system-timing requires --httpflow-live-stream-mode off'),
    })
  })

  it('validates the checked-in bounded matrix', async () => {
    const config = JSON.parse(await readFile(path.resolve('e2e/config/mitm-body-matrix.json'), 'utf8'))
    const matrix = resolveMITMBodyMatrix(config)
    expect(matrix.cases.map((entry) => entry.name)).toEqual([
      'small',
      'request-64k',
      'request-64k-medium',
      'response-256k',
      'bidirectional-64k-256k',
    ])
    expect(matrix.cases[2].profile).toMatchObject({
      requests: 600,
      concurrency: 12,
      requestBodyBytes: 64 * 1024,
      responseBodyBytes: 4 * 1024,
      responseContentEncoding: 'identity',
    })
    expect(matrix.cases[4].profile).toMatchObject({
      requests: 120,
      concurrency: 8,
      requestBodyBytes: 64 * 1024,
      responseBodyBytes: 256 * 1024,
      responseContentEncoding: 'identity',
    })
  })

  it('validates the checked-in gzip response matrix', async () => {
    const config = JSON.parse(await readFile(path.resolve('e2e/config/mitm-compressed-matrix.json'), 'utf8'))
    const matrix = resolveMITMBodyMatrix(config)
    expect(matrix.cases).toHaveLength(1)
    expect(matrix.cases[0]).toMatchObject({
      name: 'gzip-response-256k',
      profile: {
        requests: 120,
        concurrency: 8,
        requestBodyBytes: 0,
        responseBodyBytes: 256 * 1024,
        responseContentEncoding: 'gzip',
      },
    })
  })

  it('validates the bounded fixed-rate gzip matrix and recovery gate', async () => {
    const config = JSON.parse(await readFile(path.resolve('e2e/config/mitm-compressed-fixed-rate-matrix.json'), 'utf8'))
    const matrix = resolveMITMBodyMatrix(config)
    expect(matrix.harness).toEqual({
      requireCPURecovery: true,
      recoveryTimeoutMs: 30_000,
      recoveryStableSamples: 10,
      pipelineSampleIntervalMs: 1_000,
    })
    expect(matrix.cases).toHaveLength(1)
    expect(matrix.cases[0]).toMatchObject({
      name: 'gzip-response-256k-fixed-rate',
      profile: {
        requests: 400,
        concurrency: 12,
        targetRequestsPerSecond: 100,
        requestBodyBytes: 0,
        responseBodyBytes: 256 * 1024,
        responseContentEncoding: 'gzip',
      },
    })
  })

  it('validates the bounded sustained matrix and its recovery gate', async () => {
    const config = JSON.parse(await readFile(path.resolve('e2e/config/mitm-sustained-matrix.json'), 'utf8'))
    const matrix = resolveMITMBodyMatrix(config)
    expect(matrix.harness).toEqual({
      requireCPURecovery: true,
      recoveryTimeoutMs: 30_000,
      recoveryStableSamples: 10,
      pipelineSampleIntervalMs: 1_000,
    })
    expect(matrix.cases).toHaveLength(1)
    expect(matrix.cases[0]).toMatchObject({
      name: 'sustained-small',
      profile: {
        requests: 1_000,
        concurrency: 16,
        requestBodyBytes: 0,
        responseBodyBytes: 4 * 1024,
      },
    })
    expect(() =>
      resolveMITMBodyMatrix({
        ...config,
        harness: { ...config.harness, recoveryStableSamples: 0 },
      }),
    ).toThrow(/recoveryStableSamples/)
    expect(() =>
      resolveMITMBodyMatrix({
        ...config,
        harness: { ...config.harness, typoRecovery: true },
      }),
    ).toThrow(/Unknown/)
  })

  it('validates bounded scroll-away consumers for small and large bodies', async () => {
    const config = JSON.parse(await readFile(path.resolve('e2e/config/mitm-slow-consumer-matrix.json'), 'utf8'))
    const matrix = resolveMITMBodyMatrix(config)
    expect(matrix.cases.map((entry) => entry.name)).toEqual([
      'slow-consumer-gap-recovery',
      'slow-consumer-bidirectional',
    ])
    expect(matrix.cases[0]).toMatchObject({
      profile: {
        requests: 800,
        targetRequestsPerSecond: 120,
        requestBodyBytes: 0,
        responseBodyBytes: 4 * 1024,
      },
      consumer: {
        mode: 'scroll-away',
        pauseAtTargetPercent: 25,
        resumeAtTargetPercent: 75,
        pauseAfterRequests: 200,
        resumeAfterRequests: 600,
      },
    })
    expect(matrix.cases[1]).toMatchObject({
      profile: {
        requests: 240,
        targetRequestsPerSecond: 30,
        requestBodyBytes: 64 * 1024,
        responseBodyBytes: 256 * 1024,
      },
      consumer: {
        pauseAfterRequests: 60,
        resumeAfterRequests: 180,
        targetPauseWindowMs: 4_000,
      },
    })

    const sample = summarizeMITMBodyMatrixCase({
      matrixCase: matrix.cases[0],
      reportPath: 'slow-consumer/mitm-performance.json',
      report: {
        status: 'passed',
        config: {
          consumerMode: 'scroll-away',
          consumerPauseAtTargetPercent: 25,
          consumerResumeAtTargetPercent: 75,
          consumerPauseAfterRequests: 200,
          consumerResumeAfterRequests: 600,
        },
        timing: { consumerPauseWindowMs: 3_400, consumerResumeToRendererDrainMs: 800 },
        consumer: {
          pauseStart: { pipeline: { streamVisibleIdBacklog: 2 } },
          pauseEnd: { pipeline: { streamVisibleIdBacklog: 380, producerPersistenceBacklog: 4 } },
        },
        correctness: {
          consumer: {
            paused: true,
            resumed: true,
            remainedAway: true,
            restoredToTop: true,
            backlogObserved: true,
            caughtUp: true,
          },
        },
        cleanup: { errors: [] },
      },
    })
    expect(sample).toMatchObject({
      config: { consumerMode: 'scroll-away', consumerPauseAfterRequests: 200 },
      correctness: { consumerBacklogObserved: true, consumerCaughtUp: true },
      measurements: {
        consumerPauseWindowMs: 3_400,
        consumerPauseEndVisibleIdBacklog: 380,
        consumerResumeToRendererDrainMs: 800,
      },
    })
    const aggregated = aggregateMITMBodyMatrixCase({
      matrixCase: matrix.cases[0],
      samples: [sample],
      requestedRepeats: 1,
    })
    expect(aggregated.status).toBe('passed')
    expect(
      renderMITMBodyMatrixMarkdown({
        matrixId: 'slow-consumer',
        status: 'passed',
        baseProfile: 'stress',
        startedAt: '2026-01-01T00:00:00.000Z',
        cases: [aggregated],
      }),
    ).toContain('| slow-consumer-gap-recovery | scroll-away | 25% / 200 | 75% / 600 |')

    expect(() =>
      resolveMITMBodyMatrix({
        ...config,
        cases: [{ ...config.cases[0], targetRequestsPerSecond: 0 }],
      }),
    ).toThrow(/positive targetRequestsPerSecond/)
    expect(() =>
      resolveMITMBodyMatrix({
        ...config,
        cases: [
          {
            ...config.cases[0],
            consumer: { ...config.cases[0].consumer, resumeAtTargetPercent: 20 },
          },
        ],
      }),
    ).toThrow(/pauseAtTargetPercent/)
    expect(() =>
      resolveMITMBodyMatrix({
        ...config,
        cases: [{ ...config.cases[0], typoConsumer: true }],
      }),
    ).toThrow(/Unknown MITM body matrix case field/)
  })

  it('retains the fixed-rate target in case summaries and rendered evidence', async () => {
    const config = JSON.parse(await readFile(path.resolve('e2e/config/mitm-fixed-rate-matrix.json'), 'utf8'))
    const matrix = resolveMITMBodyMatrix(config)
    const matrixCase = matrix.cases[0]
    expect(matrixCase).toMatchObject({
      name: 'fixed-rate-small',
      profile: {
        requests: 1_000,
        concurrency: 16,
        targetRequestsPerSecond: 200,
        requestBodyBytes: 0,
        responseBodyBytes: 4 * 1024,
      },
    })

    const aggregated = aggregateMITMBodyMatrixCase({
      matrixCase,
      requestedRepeats: 1,
      samples: [
        {
          status: 'passed',
          correctness: { cleanupErrors: [] },
          measurements: { requestsPerSecond: 180 },
          runnerExit: { code: 0, signal: null },
        },
      ],
    })
    expect(aggregated.config.targetRequestsPerSecond).toBe(200)

    const markdown = renderMITMBodyMatrixMarkdown({
      matrixId: 'matrix-fixed-rate',
      status: 'passed',
      baseProfile: 'stress',
      startedAt: '2026-01-01T00:00:00.000Z',
      cases: [aggregated],
    })
    expect(markdown).toContain('| fixed-rate-small | passed | 1/1 | 1000 | 200 |')
  })

  it('rejects duplicate names and renders partial summaries', () => {
    expect(() =>
      resolveMITMBodyMatrix({
        schemaVersion: 1,
        baseProfile: 'smoke',
        cases: [
          { name: 'same', requests: 1, concurrency: 1, requestBodyBytes: 0, responseBodyBytes: 0 },
          { name: 'same', requests: 1, concurrency: 1, requestBodyBytes: 0, responseBodyBytes: 0 },
        ],
      }),
    ).toThrow(/Duplicate/)
    expect(
      renderMITMBodyMatrixMarkdown({
        matrixId: 'matrix-test',
        status: 'running',
        baseProfile: 'smoke',
        startedAt: '2026-01-01T00:00:00.000Z',
        cases: [],
      }),
    ).toContain('MITM V2 Body Matrix')
  })

  it('aggregates sequential repeats by median while retaining dispersion and samples', () => {
    const matrixCase = {
      name: 'repeat-test',
      profile: { requests: 120, concurrency: 8, requestBodyBytes: 64 * 1024, responseBodyBytes: 256 * 1024 },
    }
    const samples = [80, 100, 120].map((requestsPerSecond, index) => ({
      name: matrixCase.name,
      repeatIndex: index + 1,
      reportPath: `repeat-${index + 1}/mitm-performance.json`,
      status: 'passed',
      correctness: { cleanupErrors: [] },
      measurements: {
        requestsPerSecond,
        queryRoundTripP95Ms: [90, 100, 200][index],
        longTaskTotalMs: [300, 200, 400][index],
      },
      runnerExit: { code: 0, signal: null },
    }))
    const aggregated = aggregateMITMBodyMatrixCase({ matrixCase, samples, requestedRepeats: 3 })
    expect(aggregated).toMatchObject({
      status: 'passed',
      repetitions: { requested: 3, completed: 3, passed: 3, failed: 0, sequential: true },
      measurements: { requestsPerSecond: 100, queryRoundTripP95Ms: 100, longTaskTotalMs: 300 },
      measurementDistributions: {
        requestsPerSecond: {
          count: 3,
          min: 80,
          p50: 100,
          p95: 120,
          max: 120,
          medianAbsoluteDeviation: 20,
          relativeRangePercent: 40,
        },
      },
    })
    expect(aggregated.samples).toHaveLength(3)
    expect(
      renderMITMBodyMatrixMarkdown({
        matrixId: 'matrix-repeat',
        status: 'passed',
        baseProfile: 'smoke',
        repeatCount: 3,
        startedAt: '2026-01-01T00:00:00.000Z',
        finishedAt: '2026-01-01T00:01:00.000Z',
        cases: [aggregated],
      }),
    ).toContain('100.0 [80.0..120.0]')
  })

  it('keeps backend persistence and live-delivery segments in every matrix sample', () => {
    const sample = summarizeMITMBodyMatrixCase({
      matrixCase: { name: 'segments' },
      reportPath: 'segments/mitm-performance.json',
      report: {
        status: 'passed',
        config: {
          flowCommittedMode: 'canary',
          httpFlowLiveStreamMode: 'canary',
          httpFlowLiveRefreshMinIntervalMs: 700,
          httpFlowLiveDirectMinIntervalMs: 100,
          httpFlowLiveDirectSustainedIntervalMs: 100,
          httpFlowLiveDirectSustainedPendingRows: 8,
          mitmFlowTableOverscan: 2,
          sqliteProjectMaxOpenConns: 1,
          sqliteProjectReadPoolConns: 1,
        },
        observability: {
          flow: {
            persistQueueWaitMs: { p50: 9, p95: 142 },
            persistWriteMs: { p95: 36 },
            databaseChangeDetectionMs: { p95: 59 },
            persistToReactCommitMs: { p95: 820 },
          },
          duplex: { deliveryMs: { p95: 113 } },
          query: { count: 7, ratePerSecond: 3.5, backendConversionUsPerFlow: { p95: 42 } },
          live: {
            triggerToQueryStartMs: { p95: 994 },
            timeline: [
              { triggerSource: 'flow-committed', coalescedTriggers: 8 },
              { triggerSource: 'httpflow-live-stream', coalescedTriggers: 4 },
              { triggerSource: 'duplex', coalescedTriggers: 1 },
            ],
          },
          flowCommittedShadow: {
            received: 120,
            queryMatches: 120,
            directMatches: 118,
            initialSnapshotOmitted: 14,
            queryRowsWithoutEvent: 0,
            directRowsWithoutEvent: 0,
            pending: 0,
            deliveryMs: { p95: 4 },
            committedToReceiveMs: { p95: 5 },
            committedToQueryObservedMs: { p95: 994 },
            shadowToQueryObservedMs: { p95: 989 },
            committedToDirectObservedMs: { p95: 510 },
            shadowToDirectObservedMs: { p95: 505 },
          },
          httpFlowLiveStream: {
            subscriptions: 1,
            received: 122,
            committed: 120,
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
            directBatches: 12,
            directRows: 120,
            directFallbackRows: 0,
            directBatchRows: { p95: 15 },
            serverToReceiveMs: { p95: 6 },
            committedToReceiveMs: { p95: 7 },
          },
        },
      },
    })
    expect(sample.measurements).toMatchObject({
      persistQueueWaitP50Ms: 9,
      persistQueueWaitP95Ms: 142,
      persistWriteP95Ms: 36,
      databaseChangeDetectionP95Ms: 59,
      duplexDeliveryP95Ms: 113,
      triggerToQueryStartP95Ms: 994,
      queryCount: 7,
      queryRatePerSecond: 3.5,
      backendConversionPerFlowP95Us: 42,
      flowCommittedTriggerCycles: 1,
      flowCommittedCoalescedTriggers: 8,
      httpFlowLiveStreamTriggerCycles: 1,
      httpFlowLiveStreamCoalescedTriggers: 4,
      persistToReactP95Ms: 820,
      flowCommittedShadowReceived: 120,
      flowCommittedShadowQueryMatches: 120,
      flowCommittedShadowDirectMatches: 118,
      flowCommittedShadowInitialSnapshotOmitted: 14,
      flowCommittedShadowQueryRowsWithoutEvent: 0,
      flowCommittedShadowDirectRowsWithoutEvent: 0,
      flowCommittedShadowPending: 0,
      flowCommittedShadowDeliveryP95Ms: 4,
      flowCommittedShadowCommittedToReceiveP95Ms: 5,
      flowCommittedShadowCommittedToQueryP95Ms: 994,
      flowCommittedShadowToQueryP95Ms: 989,
      flowCommittedShadowCommittedToDirectP95Ms: 510,
      flowCommittedShadowToDirectP95Ms: 505,
      httpFlowLiveStreamReceived: 122,
      httpFlowLiveStreamCommitted: 120,
      httpFlowLiveStreamGaps: 0,
      httpFlowLiveStreamSequenceGaps: 0,
      httpFlowLiveStreamDirectBatches: 12,
      httpFlowLiveStreamDirectRows: 120,
      httpFlowLiveStreamDirectFallbackRows: 0,
      httpFlowLiveStreamDirectBatchRowsP95: 15,
      httpFlowLiveStreamServerToReceiveP95Ms: 6,
      httpFlowLiveStreamCommitToReceiveP95Ms: 7,
    })
    expect(sample.config.flowCommittedMode).toBe('canary')
    expect(sample.config.httpFlowLiveStreamMode).toBe('canary')
    expect(sample.config.httpFlowLiveRefreshMinIntervalMs).toBe(700)
    expect(sample.config.httpFlowLiveDirectMinIntervalMs).toBe(100)
    expect(sample.config.httpFlowLiveDirectSustainedIntervalMs).toBe(100)
    expect(sample.config.httpFlowLiveDirectSustainedPendingRows).toBe(8)
    expect(sample.config.mitmFlowTableOverscan).toBe(2)
    expect(sample.config.sqliteProjectMaxOpenConns).toBe(1)
    expect(sample.config.sqliteProjectReadPoolConns).toBe(1)
    const markdown = renderMITMBodyMatrixMarkdown({
      matrixId: 'segments',
      status: 'passed',
      baseProfile: 'smoke',
      startedAt: '2026-01-01T00:00:00.000Z',
      diagnostics: { httpFlowLiveRefreshMinIntervalMs: 700 },
      cases: [
        aggregateMITMBodyMatrixCase({
          matrixCase: {
            name: 'segments',
            profile: { requests: 1, concurrency: 1, requestBodyBytes: 0, responseBodyBytes: 0 },
          },
          requestedRepeats: 1,
          samples: [{ ...sample, correctness: { cleanupErrors: [] } }],
        }),
      ],
    })
    expect(markdown).toContain('HTTPFlow Live Stream')
    expect(markdown).toContain('Direct rows')
    expect(markdown).toContain('700 ms')
  })

  it('uses population dispersion and marks a failed runner sample', () => {
    const distribution = summarizeMITMBodyMatrixMeasurements([10, 20, 30])
    expect(distribution.mean).toBe(20)
    expect(distribution.standardDeviation).toBeCloseTo(Math.sqrt(200 / 3), 8)
    const aggregated = aggregateMITMBodyMatrixCase({
      matrixCase: {
        name: 'failed-repeat',
        profile: { requests: 1, concurrency: 1, requestBodyBytes: 0, responseBodyBytes: 0 },
      },
      requestedRepeats: 1,
      samples: [
        {
          status: 'passed',
          correctness: { cleanupErrors: [] },
          measurements: { requestsPerSecond: 1 },
          runnerExit: { code: 1, signal: null },
        },
      ],
    })
    expect(aggregated.status).toBe('failed')
  })
})
