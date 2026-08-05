// @vitest-environment node

import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { compareMITMBodyMatrices, renderMITMBodyMatrixComparisonMarkdown } from '../mitm-matrix-compare.mjs'

const execFileAsync = promisify(execFile)

const matrix = (id, sqliteProjectMaxOpenConns, measurements) => ({
  schemaVersion: 1,
  kind: 'yakit-electron-mitm-http-body-matrix',
  matrixId: id,
  status: 'passed',
  baseProfile: 'standard',
  selectedCase: 'bidirectional-64k-256k',
  repeatCount: 3,
  diagnostics: {
    yakCPUProfileEnabled: false,
    yakHeapProfileEnabled: false,
    rendererTraceEnabled: false,
    flowCommittedMode: 'canary',
    httpFlowLiveStreamMode: 'shadow',
    sqliteProjectMaxOpenConns,
  },
  cases: [
    {
      name: 'bidirectional-64k-256k',
      status: 'passed',
      config: {
        requests: 120,
        concurrency: 8,
        requestBodyBytes: 65536,
        responseBodyBytes: 262144,
        responseContentEncoding: 'identity',
      },
      repetitions: { completed: 3, sequential: true },
      correctness: { allCompleted: true, allPassed: true },
      measurementDistributions: Object.fromEntries(
        Object.entries(measurements).map(([name, values]) => [
          name,
          { count: 3, min: Math.min(...values), p50: values[1], p95: Math.max(...values), max: Math.max(...values) },
        ]),
      ),
    },
  ],
})

describe('MITM matrix comparison', () => {
  it('requires experimental differences to be explicit and compares distributions', () => {
    const baseline = matrix('max1', 1, {
      backendQueryP95Ms: [20, 30, 180],
      persistWriteP95Ms: [20, 30, 40],
    })
    const candidate = matrix('max2', 2, {
      backendQueryP95Ms: [6, 10, 35],
      persistWriteP95Ms: [38, 52, 59],
    })

    expect(() => compareMITMBodyMatrices(baseline, candidate)).toThrow(/sqliteProjectMaxOpenConns/)
    const comparison = compareMITMBodyMatrices(baseline, candidate, {
      allowedDiagnosticDifferences: ['sqliteProjectMaxOpenConns'],
    })
    expect(comparison).toMatchObject({
      status: 'passed',
      evidenceOnly: true,
      repeats: 3,
      diagnosticDifferences: [{ field: 'sqliteProjectMaxOpenConns', baseline: 1, candidate: 2 }],
    })
    expect(comparison.comparisons.find(({ metric }) => metric === 'backendQueryP95Ms')).toMatchObject({
      baselineMedian: 30,
      candidateMedian: 10,
      improvementPercent: 66.66666666666666,
    })
    expect(comparison.comparisons.find(({ metric }) => metric === 'persistWriteP95Ms')).toMatchObject({
      baselineMedian: 30,
      candidateMedian: 52,
      improvementPercent: -73.33333333333333,
    })
    expect(renderMITMBodyMatrixComparisonMarkdown(comparison)).toContain('max1')
  })

  it('rejects single-run evidence', () => {
    const baseline = matrix('baseline', 1, { backendQueryP95Ms: [1, 2, 3] })
    baseline.repeatCount = 1
    expect(() => compareMITMBodyMatrices(baseline, baseline)).toThrow(/at least 3/)
  })

  it('allows an explicit live-stream experiment and candidate-only diagnostic timing', () => {
    const baseline = matrix('stream-off', 1, { backendQueryP95Ms: [20, 21, 22] })
    baseline.diagnostics.httpFlowLiveStreamMode = 'off'
    const candidate = matrix('stream-canary', 1, {
      backendQueryP95Ms: [18, 19, 20],
      httpFlowLiveStreamCommitToReceiveP95Ms: [3, 4, 5],
    })
    candidate.diagnostics.httpFlowLiveStreamMode = 'canary'

    const comparison = compareMITMBodyMatrices(baseline, candidate, {
      allowedDiagnosticDifferences: ['httpFlowLiveStreamMode'],
    })
    expect(comparison.diagnosticDifferences).toEqual([
      { field: 'httpFlowLiveStreamMode', baseline: 'off', candidate: 'canary' },
    ])
    expect(
      comparison.comparisons.find(({ metric }) => metric === 'httpFlowLiveStreamCommitToReceiveP95Ms'),
    ).toMatchObject({ direction: 'diagnostic', baselineMedian: undefined, candidateMedian: 4 })
  })

  it('requires historical case config metadata differences to be explicit', () => {
    const baseline = matrix('without-scheduler-metadata', 1, { backendQueryP95Ms: [20, 21, 22] })
    const candidate = matrix('with-scheduler-metadata', 1, { backendQueryP95Ms: [18, 19, 20] })
    candidate.cases[0].config.httpFlowLiveRefreshMinIntervalMs = 700

    expect(() => compareMITMBodyMatrices(baseline, candidate)).toThrow(/httpFlowLiveRefreshMinIntervalMs/)
    const comparison = compareMITMBodyMatrices(baseline, candidate, {
      allowedCaseConfigDifferences: ['httpFlowLiveRefreshMinIntervalMs'],
    })
    expect(comparison.caseConfigDifferences).toEqual([
      { field: 'httpFlowLiveRefreshMinIntervalMs', baseline: undefined, candidate: 700 },
    ])
    expect(renderMITMBodyMatrixComparisonMarkdown(comparison)).toContain(
      'case.httpFlowLiveRefreshMinIntervalMs: undefined -> 700',
    )
  })

  it('keeps an optional timing with incomplete repeat coverage diagnostic', () => {
    const baseline = matrix('baseline', 1, {
      backendQueryP95Ms: [20, 21, 22],
      databaseChangeDetectionP95Ms: [10, 20, 30],
    })
    baseline.cases[0].measurementDistributions.databaseChangeDetectionP95Ms.count = 2
    const candidate = matrix('candidate', 1, {
      backendQueryP95Ms: [18, 19, 20],
      databaseChangeDetectionP95Ms: [8, 9, 10],
    })

    const comparison = compareMITMBodyMatrices(baseline, candidate)
    expect(comparison.insufficientSampleMetrics).toEqual(['databaseChangeDetectionP95Ms'])
    expect(comparison.comparisons.find(({ metric }) => metric === 'databaseChangeDetectionP95Ms')).toMatchObject({
      direction: 'diagnostic',
      configuredDirection: 'lower',
      comparisonStatus: 'insufficient-samples',
      sampleCoverage: { required: 3, baseline: 2, candidate: 3 },
      improvementPercent: undefined,
    })
    expect(comparison.comparisons.find(({ metric }) => metric === 'backendQueryP95Ms')).toMatchObject({
      comparisonStatus: 'comparable',
      improvementPercent: 9.523809523809524,
    })
    expect(renderMITMBodyMatrixComparisonMarkdown(comparison)).toContain('`databaseChangeDetectionP95Ms`')
  })

  it('keeps a newly added comparable metric diagnostic when the historical matrix has no coverage', () => {
    const baseline = matrix('baseline', 1, { backendQueryP95Ms: [20, 21, 22] })
    const candidate = matrix('candidate', 1, {
      backendQueryP95Ms: [18, 19, 20],
      yakCPUP50Percent: [120, 130, 140],
    })

    const comparison = compareMITMBodyMatrices(baseline, candidate)
    expect(comparison.missingMetricCoverageMetrics).toEqual(['yakCPUP50Percent'])
    expect(comparison.comparisons.find(({ metric }) => metric === 'yakCPUP50Percent')).toMatchObject({
      direction: 'diagnostic',
      configuredDirection: 'lower',
      comparisonStatus: 'metric-coverage-mismatch',
      sampleCoverage: { required: 3, baseline: 0, candidate: 3 },
      baselineMedian: undefined,
      candidateMedian: 130,
      improvementPercent: undefined,
    })
    expect(comparison.comparisons.find(({ metric }) => metric === 'backendQueryP95Ms')).toMatchObject({
      comparisonStatus: 'comparable',
      improvementPercent: 9.523809523809524,
    })
    expect(renderMITMBodyMatrixComparisonMarkdown(comparison)).toContain('`yakCPUP50Percent`')
  })

  it('prints an explicit zero-baseline message instead of NaN', async () => {
    const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'yakit-mitm-matrix-compare-test-'))
    const baselinePath = path.join(temporaryDirectory, 'baseline.json')
    const candidatePath = path.join(temporaryDirectory, 'candidate.json')
    try {
      await Promise.all([
        writeFile(baselinePath, JSON.stringify(matrix('baseline', 1, { producerStopVisibleIdBacklog: [0, 0, 0] }))),
        writeFile(candidatePath, JSON.stringify(matrix('candidate', 1, { producerStopVisibleIdBacklog: [1, 1, 1] }))),
      ])

      const { stdout } = await execFileAsync(process.execPath, [
        path.resolve('scripts/compare-electron-mitm-matrices.mjs'),
        '--baseline',
        baselinePath,
        '--candidate',
        candidatePath,
        '--case',
        'bidirectional-64k-256k',
      ])

      expect(stdout).toContain('percent unavailable: zero baseline')
      expect(stdout).not.toContain('NaN')
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true })
    }
  })
})
