const MATRIX_KIND = 'yakit-electron-mitm-http-body-matrix'

const METRIC_DIRECTIONS = {
  requestsPerSecond: 'higher',
  dispatchRequestsPerSecond: 'higher',
  scheduleLagP95Ms: 'lower',
  requestLatencyP95Ms: 'lower',
  databaseCatchUpMs: 'lower',
  databaseDrainMs: 'lower',
  rendererDrainMs: 'lower',
  cpuRecoveryMs: 'lower',
  producerStopToCPURecoveryMs: 'lower',
  consumerResumeToRendererDrainMs: 'lower',
  producerStopPersistenceBacklog: 'lower',
  producerStopVisibleIdBacklog: 'lower',
  maxPersistenceBacklog: 'lower',
  maxVisibleIdBacklog: 'lower',
  maxObservedIdBacklog: 'lower',
  maxAsyncWriteQueueDepth: 'lower',
  maxAsyncWriteQueueUtilization: 'lower',
  maxPendingFlowCommittedShadow: 'lower',
  firstVisibleMs: 'lower',
  requestToReactP95Ms: 'lower',
  responseToReactP95Ms: 'lower',
  queryRoundTripP95Ms: 'lower',
  backendQueryP95Ms: 'lower',
  backendCountP95Ms: 'lower',
  backendDataQueryP95Ms: 'lower',
  backendConversionP95Ms: 'lower',
  backendConversionPerFlowP95Us: 'lower',
  mainToBackendP95Ms: 'lower',
  backendToMainP95Ms: 'lower',
  persistQueueWaitP50Ms: 'lower',
  persistQueueWaitP95Ms: 'lower',
  persistWriteP95Ms: 'lower',
  databaseChangeDetectionP95Ms: 'lower',
  duplexDeliveryP95Ms: 'lower',
  triggerToQueryStartP95Ms: 'lower',
  persistToReactP95Ms: 'lower',
  flowCommittedShadowDeliveryP95Ms: 'lower',
  flowCommittedShadowCommittedToReceiveP95Ms: 'lower',
  flowCommittedShadowCommittedToQueryP95Ms: 'lower',
  flowCommittedShadowToQueryP95Ms: 'lower',
  electronCPUP50Percent: 'lower',
  electronCPUP95Percent: 'lower',
  yakCPUP50Percent: 'lower',
  yakCPUP95Percent: 'lower',
  electronDrainCPUP95Percent: 'lower',
  yakDrainCPUP95Percent: 'lower',
  electronPeakWorkingSetMB: 'lower',
  yakPeakWorkingSetMB: 'lower',
  longTaskTotalMs: 'lower',
  longTaskBlockingRatioPercent: 'lower',
}

const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const validateMatrix = (matrix, label, minimumRepeats) => {
  if (matrix?.schemaVersion !== 1 || matrix?.kind !== MATRIX_KIND) {
    throw new Error(`${label} is not a supported MITM body matrix`)
  }
  if (matrix.status !== 'passed') throw new Error(`${label} matrix status is ${matrix.status}`)
  if (
    matrix.diagnostics?.yakCPUProfileEnabled === true ||
    matrix.diagnostics?.yakHeapProfileEnabled === true ||
    matrix.diagnostics?.rendererTraceEnabled === true
  ) {
    throw new Error(`${label} is diagnostic-only and cannot be used for matrix A/B`)
  }
  if (!Number.isInteger(matrix.repeatCount) || matrix.repeatCount < minimumRepeats) {
    throw new Error(`${label} requires at least ${minimumRepeats} sequential repetitions`)
  }
}

const findCase = (matrix, caseName, label) => {
  const matches = matrix.cases?.filter((entry) => !caseName || entry.name === caseName) || []
  if (matches.length !== 1) {
    throw new Error(`${label} must contain exactly one ${caseName ? JSON.stringify(caseName) : 'selected'} case`)
  }
  const entry = matches[0]
  if (
    entry.status !== 'passed' ||
    entry.correctness?.allCompleted !== true ||
    entry.correctness?.allPassed !== true ||
    entry.repetitions?.sequential !== true
  ) {
    throw new Error(`${label} case ${entry.name} did not satisfy repeat/correctness checks`)
  }
  return entry
}

export const compareMITMBodyMatrices = (
  baseline,
  candidate,
  { caseName, allowedDiagnosticDifferences = [], allowedCaseConfigDifferences = [], minimumRepeats = 3 } = {},
) => {
  if (!Number.isInteger(minimumRepeats) || minimumRepeats < 1) {
    throw new Error(`minimumRepeats must be a positive integer: ${minimumRepeats}`)
  }
  validateMatrix(baseline, 'baseline', minimumRepeats)
  validateMatrix(candidate, 'candidate', minimumRepeats)
  if (baseline.baseProfile !== candidate.baseProfile) {
    throw new Error(`Base profile mismatch: ${baseline.baseProfile} != ${candidate.baseProfile}`)
  }

  const allowed = new Set(allowedDiagnosticDifferences)
  const diagnosticFields = new Set([
    ...Object.keys(baseline.diagnostics || {}),
    ...Object.keys(candidate.diagnostics || {}),
  ])
  const diagnosticDifferences = [...diagnosticFields]
    .filter((field) => !sameValue(baseline.diagnostics?.[field], candidate.diagnostics?.[field]))
    .map((field) => ({ field, baseline: baseline.diagnostics?.[field], candidate: candidate.diagnostics?.[field] }))
  const unexpected = diagnosticDifferences.filter(({ field }) => !allowed.has(field))
  if (unexpected.length) {
    throw new Error(`Unexpected diagnostic config differences: ${unexpected.map(({ field }) => field).join(', ')}`)
  }

  const resolvedCaseName = caseName || baseline.selectedCase || candidate.selectedCase
  const baselineCase = findCase(baseline, resolvedCaseName, 'baseline')
  const candidateCase = findCase(candidate, resolvedCaseName || baselineCase.name, 'candidate')
  if (baselineCase.name !== candidateCase.name) {
    throw new Error(`Case mismatch: ${baselineCase.name} != ${candidateCase.name}`)
  }
  const allowedCaseConfig = new Set(allowedCaseConfigDifferences)
  const caseConfigFields = new Set([
    ...Object.keys(baselineCase.config || {}),
    ...Object.keys(candidateCase.config || {}),
  ])
  const caseConfigDifferences = [...caseConfigFields]
    .filter((field) => !sameValue(baselineCase.config?.[field], candidateCase.config?.[field]))
    .map((field) => ({
      field,
      baseline: baselineCase.config?.[field],
      candidate: candidateCase.config?.[field],
    }))
  const unexpectedCaseConfig = caseConfigDifferences.filter(({ field }) => !allowedCaseConfig.has(field))
  if (unexpectedCaseConfig.length) {
    throw new Error(
      `Unexpected case config differences for ${baselineCase.name}: ${unexpectedCaseConfig
        .map(({ field }) => field)
        .join(', ')}`,
    )
  }
  if (baselineCase.repetitions.completed !== candidateCase.repetitions.completed) {
    throw new Error(
      `Repeat count mismatch: ${baselineCase.repetitions.completed} != ${candidateCase.repetitions.completed}`,
    )
  }

  const baselineMetrics = Object.keys(baselineCase.measurementDistributions || {})
  const candidateMetrics = Object.keys(candidateCase.measurementDistributions || {})
  const metricNames = [...new Set([...baselineMetrics, ...candidateMetrics])].sort()

  const comparisons = metricNames.map((metric) => {
    const baselineDistribution = baselineCase.measurementDistributions[metric]
    const candidateDistribution = candidateCase.measurementDistributions[metric]
    const configuredDirection = METRIC_DIRECTIONS[metric] || 'diagnostic'
    const metricCoverageMismatch =
      configuredDirection !== 'diagnostic' && (!baselineDistribution || !candidateDistribution)
    const hasComparableSamples =
      baselineDistribution?.count >= minimumRepeats &&
      candidateDistribution?.count >= minimumRepeats &&
      Number.isFinite(baselineDistribution?.p50) &&
      Number.isFinite(candidateDistribution?.p50)
    // Optional per-flow timings can legitimately be absent in one repetition.
    // Preserve them in the report, but never turn two samples into a formal
    // three-run claim or abort every other fully comparable metric.
    const insufficientSamples = configuredDirection !== 'diagnostic' && !metricCoverageMismatch && !hasComparableSamples
    const direction = metricCoverageMismatch || insufficientSamples ? 'diagnostic' : configuredDirection
    const baselineMedian = baselineDistribution?.p50
    const candidateMedian = candidateDistribution?.p50
    const changePercent =
      !Number.isFinite(baselineMedian) || !Number.isFinite(candidateMedian) || baselineMedian === 0
        ? undefined
        : ((candidateMedian - baselineMedian) / Math.abs(baselineMedian)) * 100
    const improvementPercent =
      direction === 'diagnostic' || changePercent === undefined
        ? undefined
        : direction === 'higher'
          ? changePercent
          : -changePercent
    return {
      metric,
      direction,
      configuredDirection,
      comparisonStatus: metricCoverageMismatch
        ? 'metric-coverage-mismatch'
        : insufficientSamples
          ? 'insufficient-samples'
          : direction === 'diagnostic'
            ? 'diagnostic'
            : 'comparable',
      sampleCoverage: {
        required: minimumRepeats,
        baseline: baselineDistribution?.count || 0,
        candidate: candidateDistribution?.count || 0,
      },
      baselineMedian,
      candidateMedian,
      changePercent,
      improvementPercent,
      baselineDistribution,
      candidateDistribution,
    }
  })

  return {
    schemaVersion: 1,
    kind: 'yakit-electron-mitm-http-body-matrix-comparison',
    status: 'passed',
    evidenceOnly: true,
    caseName: baselineCase.name,
    minimumRepeats,
    repeats: baselineCase.repetitions.completed,
    baselineMatrixId: baseline.matrixId,
    candidateMatrixId: candidate.matrixId,
    baselineRevision: baseline.revisions,
    candidateRevision: candidate.revisions,
    diagnosticDifferences,
    caseConfigDifferences,
    missingMetricCoverageMetrics: comparisons
      .filter((entry) => entry.comparisonStatus === 'metric-coverage-mismatch')
      .map((entry) => entry.metric),
    insufficientSampleMetrics: comparisons
      .filter((entry) => entry.comparisonStatus === 'insufficient-samples')
      .map((entry) => entry.metric),
    comparisons,
  }
}

const fixed = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '-')
const range = (distribution) => `${fixed(distribution?.p50)} [${fixed(distribution?.min)}..${fixed(distribution?.max)}]`

export const renderMITMBodyMatrixComparisonMarkdown = (comparison) =>
  `${[
    '# MITM V2 Matrix Comparison',
    '',
    `- Baseline: \`${comparison.baselineMatrixId}\``,
    `- Candidate: \`${comparison.candidateMatrixId}\``,
    `- Case: \`${comparison.caseName}\``,
    `- Repeats: \`${comparison.repeats}\` per group (strictly sequential)`,
    `- Insufficient-sample metrics: ${
      comparison.insufficientSampleMetrics?.length
        ? comparison.insufficientSampleMetrics.map((metric) => `\`${metric}\``).join(', ')
        : 'none'
    }`,
    `- Historical metric-coverage differences: ${
      comparison.missingMetricCoverageMetrics?.length
        ? comparison.missingMetricCoverageMetrics.map((metric) => `\`${metric}\``).join(', ')
        : 'none'
    }`,
    `- Experimental differences: ${
      comparison.diagnosticDifferences.length || comparison.caseConfigDifferences.length
        ? [
            ...comparison.diagnosticDifferences,
            ...comparison.caseConfigDifferences.map((entry) => ({
              ...entry,
              field: `case.${entry.field}`,
            })),
          ]
            .map(({ field, baseline, candidate }) => `\`${field}: ${baseline} -> ${candidate}\``)
            .join(', ')
        : 'none'
    }`,
    '',
    '| Metric | Direction | Baseline p50 [min..max] | Candidate p50 [min..max] | Change | Improvement |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...comparison.comparisons.map(
      (entry) =>
        `| ${entry.metric} | ${entry.direction} | ${range(entry.baselineDistribution)} | ${range(entry.candidateDistribution)} | ${fixed(entry.changePercent)}% | ${fixed(entry.improvementPercent)}% |`,
    ),
    '',
    'This comparison validates repeat count, correctness, case shape and configuration identity. It is evidence-only: WSL and short-run variance still require engineering review before a product default changes.',
    '',
  ].join('\n')}\n`
