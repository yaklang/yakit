import { resolveMITMPerformanceProfile } from './http-performance-fixture.mjs'

const CASE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/
const CASE_OVERRIDE_FIELDS = [
  'requests',
  'concurrency',
  'targetRequestsPerSecond',
  'requestBodyBytes',
  'responseBodyBytes',
  'responseContentEncoding',
]
const CASE_FIELDS = new Set(['name', ...CASE_OVERRIDE_FIELDS, 'consumer'])
const CONSUMER_FIELDS = new Set(['mode', 'pauseAtTargetPercent', 'resumeAtTargetPercent'])
const HARNESS_FIELDS = new Set([
  'requireCPURecovery',
  'recoveryTimeoutMs',
  'recoveryStableSamples',
  'pipelineSampleIntervalMs',
])
const HARNESS_INTEGER_LIMITS = {
  recoveryTimeoutMs: { minimum: 1_000, maximum: 120_000 },
  recoveryStableSamples: { minimum: 1, maximum: 50 },
  pipelineSampleIntervalMs: { minimum: 100, maximum: 10_000 },
}

const resolveHarness = (rawHarness) => {
  if (rawHarness === undefined) return { requireCPURecovery: false }
  if (!rawHarness || typeof rawHarness !== 'object' || Array.isArray(rawHarness)) {
    throw new Error('MITM matrix harness must be an object')
  }
  for (const key of Object.keys(rawHarness)) {
    if (!HARNESS_FIELDS.has(key)) throw new Error(`Unknown MITM matrix harness field: ${key}`)
  }
  if (rawHarness.requireCPURecovery !== undefined && typeof rawHarness.requireCPURecovery !== 'boolean') {
    throw new Error(`MITM matrix requireCPURecovery must be boolean: ${rawHarness.requireCPURecovery}`)
  }
  const harness = { requireCPURecovery: rawHarness.requireCPURecovery === true }
  for (const [field, limits] of Object.entries(HARNESS_INTEGER_LIMITS)) {
    const value = rawHarness[field]
    if (value === undefined) continue
    if (!Number.isInteger(value) || value < limits.minimum || value > limits.maximum) {
      throw new Error(
        `MITM matrix ${field} must be an integer between ${limits.minimum} and ${limits.maximum}: ${value}`,
      )
    }
    harness[field] = value
  }
  return harness
}

const resolveConsumer = (rawConsumer, profile) => {
  if (rawConsumer === undefined) return { mode: 'follow' }
  if (!rawConsumer || typeof rawConsumer !== 'object' || Array.isArray(rawConsumer)) {
    throw new Error('MITM matrix consumer must be an object')
  }
  for (const key of Object.keys(rawConsumer)) {
    if (!CONSUMER_FIELDS.has(key)) throw new Error(`Unknown MITM matrix consumer field: ${key}`)
  }
  if (rawConsumer.mode !== 'scroll-away') {
    throw new Error(`MITM matrix consumer mode must be scroll-away: ${rawConsumer.mode}`)
  }
  const pauseAtTargetPercent = rawConsumer.pauseAtTargetPercent
  const resumeAtTargetPercent = rawConsumer.resumeAtTargetPercent
  for (const [field, value] of [
    ['pauseAtTargetPercent', pauseAtTargetPercent],
    ['resumeAtTargetPercent', resumeAtTargetPercent],
  ]) {
    if (!Number.isInteger(value) || value < 1 || value > 99) {
      throw new Error(`MITM matrix consumer ${field} must be an integer between 1 and 99: ${value}`)
    }
  }
  if (pauseAtTargetPercent >= resumeAtTargetPercent) {
    throw new Error(
      `MITM matrix consumer pauseAtTargetPercent must be below resumeAtTargetPercent: ${pauseAtTargetPercent} >= ${resumeAtTargetPercent}`,
    )
  }
  if (profile.targetRequestsPerSecond <= 0) {
    throw new Error('MITM matrix scroll-away consumer requires a positive targetRequestsPerSecond')
  }

  const pauseAfterRequests = Math.max(1, Math.ceil((profile.requests * pauseAtTargetPercent) / 100))
  const resumeAfterRequests = Math.min(
    profile.requests - 1,
    Math.ceil((profile.requests * resumeAtTargetPercent) / 100),
  )
  if (pauseAfterRequests >= resumeAfterRequests) {
    throw new Error(
      `MITM matrix consumer thresholds collapse for ${profile.requests} requests: ${pauseAfterRequests} >= ${resumeAfterRequests}`,
    )
  }
  const targetPauseWindowMs = ((resumeAfterRequests - pauseAfterRequests) * 1_000) / profile.targetRequestsPerSecond
  if (targetPauseWindowMs < 1_000) {
    throw new Error(
      `MITM matrix consumer target pause window must be at least 1000 ms: ${targetPauseWindowMs.toFixed(1)} ms`,
    )
  }

  return {
    mode: 'scroll-away',
    pauseAtTargetPercent,
    resumeAtTargetPercent,
    pauseAfterRequests,
    resumeAfterRequests,
    targetPauseWindowMs,
  }
}

export const resolveMITMBodyMatrix = (raw) => {
  if (raw?.schemaVersion !== 1) throw new Error(`Unsupported MITM body matrix schema: ${raw?.schemaVersion}`)
  if (!Array.isArray(raw.cases) || raw.cases.length < 1 || raw.cases.length > 16) {
    throw new Error(`MITM body matrix must contain between 1 and 16 cases: ${raw?.cases?.length}`)
  }

  const names = new Set()
  const cases = raw.cases.map((entry) => {
    if (!CASE_NAME_PATTERN.test(entry?.name || ''))
      throw new Error(`Invalid MITM body matrix case name: ${entry?.name}`)
    if (names.has(entry.name)) throw new Error(`Duplicate MITM body matrix case name: ${entry.name}`)
    names.add(entry.name)
    for (const key of Object.keys(entry)) {
      if (!CASE_FIELDS.has(key)) throw new Error(`Unknown MITM body matrix case field: ${key}`)
    }
    const overrides = Object.fromEntries(CASE_OVERRIDE_FIELDS.map((field) => [field, entry[field]]))
    const profile = resolveMITMPerformanceProfile(raw.baseProfile, overrides)
    return {
      name: entry.name,
      profile,
      consumer: resolveConsumer(entry.consumer, profile),
    }
  })

  return {
    schemaVersion: 1,
    baseProfile: raw.baseProfile,
    harness: resolveHarness(raw.harness),
    cases,
  }
}

const metricValue = (report, name) => report.metrics?.find((metric) => metric.name === name)?.value

export const summarizeMITMBodyMatrixCase = ({ matrixCase, report, reportPath, repeatIndex = 1 }) => ({
  name: matrixCase.name,
  repeatIndex,
  reportPath,
  status: report.status,
  startedAt: report.startedAt,
  finishedAt: report.finishedAt,
  config: {
    requests: report.config?.requests,
    concurrency: report.config?.concurrency,
    targetRequestsPerSecond: report.config?.targetRequestsPerSecond,
    requestBodyBytes: report.config?.requestBodyBytes,
    responseBodyBytes: report.config?.responseBodyBytes,
    responseContentEncoding: report.config?.responseContentEncoding,
    requireCPURecovery: report.config?.requireCPURecovery,
    recoveryTimeoutMs: report.config?.resourceRecoveryTimeoutMs,
    recoveryStableSamples: report.config?.resourceRecoveryStableSamples,
    pipelineSampleIntervalMs: report.config?.pipelineSampleIntervalMs,
    skipLiveExactTotalEnabled: report.config?.skipLiveExactTotalEnabled,
    flowCommittedShadowEnabled: report.config?.flowCommittedShadowEnabled,
    flowCommittedMode: report.config?.flowCommittedMode,
    httpFlowLiveStreamMode: report.config?.httpFlowLiveStreamMode,
    httpFlowLiveRefreshMinIntervalMs: report.config?.httpFlowLiveRefreshMinIntervalMs,
    httpFlowLiveDirectMinIntervalMs: report.config?.httpFlowLiveDirectMinIntervalMs,
    httpFlowLiveDirectSustainedIntervalMs: report.config?.httpFlowLiveDirectSustainedIntervalMs,
    httpFlowLiveDirectSustainedPendingRows: report.config?.httpFlowLiveDirectSustainedPendingRows,
    mitmFlowTableOverscan: report.config?.mitmFlowTableOverscan,
    sqliteProjectMaxOpenConns: report.config?.sqliteProjectMaxOpenConns,
    sqliteProjectReadPoolConns: report.config?.sqliteProjectReadPoolConns,
    consumerMode: report.config?.consumerMode,
    consumerPauseAtTargetPercent: report.config?.consumerPauseAtTargetPercent,
    consumerResumeAtTargetPercent: report.config?.consumerResumeAtTargetPercent,
    consumerPauseAfterRequests: report.config?.consumerPauseAfterRequests,
    consumerResumeAfterRequests: report.config?.consumerResumeAfterRequests,
  },
  correctness: {
    producerCompleted: report.correctness?.producer?.completed,
    producerFailed: report.correctness?.producer?.failed,
    targetRequests: report.correctness?.target?.receivedRequests,
    targetRequestBodyBytes: report.correctness?.target?.receivedRequestBodyBytes,
    databaseTotal: report.correctness?.database?.total,
    databaseUniqueIds: report.correctness?.database?.uniqueIds,
    cpuRecoveryRequired: report.correctness?.cpuRecovery?.required,
    cpuRecovered: report.correctness?.cpuRecovery?.recovered,
    consumerPaused: report.correctness?.consumer?.paused,
    consumerResumed: report.correctness?.consumer?.resumed,
    consumerRemainedAway: report.correctness?.consumer?.remainedAway,
    consumerRestoredToTop: report.correctness?.consumer?.restoredToTop,
    consumerBacklogObserved: report.correctness?.consumer?.backlogObserved,
    consumerCaughtUp: report.correctness?.consumer?.caughtUp,
    consumerDirectRecoveryEntered: report.correctness?.consumer?.directRecoveryEntered,
    consumerDirectRecoveryCompleted: report.correctness?.consumer?.directRecoveryCompleted,
    mitmStopped: report.cleanup?.mitmStopped,
    targetStopped: report.cleanup?.targetStopped,
    cleanupErrors: report.cleanup?.errors || [],
  },
  measurements: {
    requestsPerSecond: report.load?.requestsPerSecond,
    dispatchRequestsPerSecond: report.load?.dispatchRequestsPerSecond,
    scheduleLagP95Ms: report.load?.scheduleLagMs?.p95,
    requestLatencyP95Ms: report.load?.latencyMs?.p95,
    databaseCatchUpMs: report.timing?.databaseCatchUpMs,
    databaseDrainMs: report.timing?.databaseDrainMs,
    rendererDrainMs: report.timing?.rendererDrainMs,
    cpuRecoveryMs: report.timing?.cpuRecoveryMs,
    producerStopToCPURecoveryMs: report.timing?.producerStopToCPURecoveryMs,
    consumerPauseWindowMs: report.timing?.consumerPauseWindowMs,
    consumerResumeToRendererDrainMs: report.timing?.consumerResumeToRendererDrainMs,
    consumerPauseStartVisibleIdBacklog: report.consumer?.pauseStart?.pipeline?.streamVisibleIdBacklog,
    consumerPauseEndVisibleIdBacklog: report.consumer?.pauseEnd?.pipeline?.streamVisibleIdBacklog,
    consumerPauseEndPersistenceBacklog: report.consumer?.pauseEnd?.pipeline?.producerPersistenceBacklog,
    producerStopPersistenceBacklog: report.pipeline?.summary?.producerStop?.producerPersistenceBacklog,
    producerStopVisibleIdBacklog: report.pipeline?.summary?.producerStop?.streamVisibleIdBacklog,
    maxPersistenceBacklog: report.pipeline?.summary?.maxima?.producerPersistenceBacklog,
    maxVisibleIdBacklog: report.pipeline?.summary?.maxima?.streamVisibleIdBacklog,
    maxObservedIdBacklog: report.pipeline?.summary?.maxima?.approximateIdBacklog,
    maxAsyncWriteQueueDepth: report.pipeline?.summary?.maxima?.asyncWriteQueueDepth,
    maxAsyncWriteQueueUtilization: report.pipeline?.summary?.maxima?.asyncWriteQueueUtilization,
    maxPendingFlowCommittedShadow: report.pipeline?.summary?.maxima?.pendingFlowCommittedShadow,
    firstVisibleMs: metricValue(report, 'electron_mitm_http.renderer.first_visible_ms'),
    requestToReactP95Ms: metricValue(report, 'electron_mitm_http.flow.request_to_react_p95_ms'),
    responseToReactP95Ms: metricValue(report, 'electron_mitm_http.flow.response_to_react_p95_ms'),
    queryRoundTripP95Ms: metricValue(report, 'electron_mitm_http.query.round_trip_p95_ms'),
    queryCount: report.observability?.query?.count,
    queryRatePerSecond: report.observability?.query?.ratePerSecond,
    backendQueryP95Ms: report.observability?.query?.backendQueryMs?.p95,
    backendCountP95Ms: report.observability?.query?.backendCountMs?.p95,
    backendDataQueryP95Ms: report.observability?.query?.backendDataQueryMs?.p95,
    backendCountExecutionRatio: report.observability?.query?.countExecutionRatio,
    backendConversionP95Ms: report.observability?.query?.backendConversionMs?.p95,
    backendConversionPerFlowP95Us: report.observability?.query?.backendConversionUsPerFlow?.p95,
    mainToBackendP95Ms: report.observability?.query?.mainToBackendMs?.p95,
    backendToMainP95Ms: report.observability?.query?.backendToMainMs?.p95,
    persistQueueWaitP50Ms: report.observability?.flow?.persistQueueWaitMs?.p50,
    persistQueueWaitP95Ms: report.observability?.flow?.persistQueueWaitMs?.p95,
    persistWriteP95Ms: report.observability?.flow?.persistWriteMs?.p95,
    databaseChangeDetectionP95Ms: report.observability?.flow?.databaseChangeDetectionMs?.p95,
    duplexDeliveryP95Ms: report.observability?.duplex?.deliveryMs?.p95,
    triggerToQueryStartP95Ms: report.observability?.live?.triggerToQueryStartMs?.p95,
    flowCommittedTriggerCycles: report.observability?.live?.timeline?.filter(
      (cycle) => cycle.triggerSource === 'flow-committed',
    ).length,
    flowCommittedCoalescedTriggers: report.observability?.live?.timeline
      ?.filter((cycle) => cycle.triggerSource === 'flow-committed')
      .reduce((total, cycle) => total + (Number(cycle.coalescedTriggers) || 0), 0),
    httpFlowLiveStreamTriggerCycles: report.observability?.live?.timeline?.filter(
      (cycle) => cycle.triggerSource === 'httpflow-live-stream',
    ).length,
    httpFlowLiveStreamCoalescedTriggers: report.observability?.live?.timeline
      ?.filter((cycle) => cycle.triggerSource === 'httpflow-live-stream')
      .reduce((total, cycle) => total + (Number(cycle.coalescedTriggers) || 0), 0),
    persistToReactP95Ms: report.observability?.flow?.persistToReactCommitMs?.p95,
    flowCommittedShadowReceived: report.observability?.flowCommittedShadow?.received,
    flowCommittedShadowQueryMatches: report.observability?.flowCommittedShadow?.queryMatches,
    flowCommittedShadowDirectMatches: report.observability?.flowCommittedShadow?.directMatches,
    flowCommittedShadowInitialSnapshotOmitted: report.observability?.flowCommittedShadow?.initialSnapshotOmitted,
    flowCommittedShadowQueryRowsWithoutEvent: report.observability?.flowCommittedShadow?.queryRowsWithoutEvent,
    flowCommittedShadowDirectRowsWithoutEvent: report.observability?.flowCommittedShadow?.directRowsWithoutEvent,
    flowCommittedShadowPending: report.observability?.flowCommittedShadow?.pending,
    flowCommittedShadowDeliveryP95Ms: report.observability?.flowCommittedShadow?.deliveryMs?.p95,
    flowCommittedShadowCommittedToReceiveP95Ms: report.observability?.flowCommittedShadow?.committedToReceiveMs?.p95,
    flowCommittedShadowCommittedToQueryP95Ms:
      report.observability?.flowCommittedShadow?.committedToQueryObservedMs?.p95,
    flowCommittedShadowToQueryP95Ms: report.observability?.flowCommittedShadow?.shadowToQueryObservedMs?.p95,
    flowCommittedShadowCommittedToDirectP95Ms:
      report.observability?.flowCommittedShadow?.committedToDirectObservedMs?.p95,
    flowCommittedShadowToDirectP95Ms: report.observability?.flowCommittedShadow?.shadowToDirectObservedMs?.p95,
    httpFlowLiveStreamSubscriptions: report.observability?.httpFlowLiveStream?.subscriptions,
    httpFlowLiveStreamReceived: report.observability?.httpFlowLiveStream?.received,
    httpFlowLiveStreamCommitted: report.observability?.httpFlowLiveStream?.committed,
    httpFlowLiveStreamHeartbeats: report.observability?.httpFlowLiveStream?.heartbeats,
    httpFlowLiveStreamGaps: report.observability?.httpFlowLiveStream?.gaps,
    httpFlowLiveStreamReplayed: report.observability?.httpFlowLiveStream?.replayed,
    httpFlowLiveStreamInvalidEnvelopes: report.observability?.httpFlowLiveStream?.invalidEnvelopes,
    httpFlowLiveStreamInvalidEvents: report.observability?.httpFlowLiveStream?.invalidEvents,
    httpFlowLiveStreamSequenceGaps: report.observability?.httpFlowLiveStream?.sequenceGaps,
    httpFlowLiveStreamDuplicates: report.observability?.httpFlowLiveStream?.duplicates,
    httpFlowLiveStreamOutOfOrder: report.observability?.httpFlowLiveStream?.outOfOrder,
    httpFlowLiveStreamUnavailable: report.observability?.httpFlowLiveStream?.unavailable,
    httpFlowLiveStreamEnded: report.observability?.httpFlowLiveStream?.ended,
    httpFlowLiveStreamDirectBatches: report.observability?.httpFlowLiveStream?.directBatches,
    httpFlowLiveStreamDirectRows: report.observability?.httpFlowLiveStream?.directRows,
    httpFlowLiveStreamDirectFallbackRows: report.observability?.httpFlowLiveStream?.directFallbackRows,
    httpFlowLiveStreamDirectRecoveryRequired:
      report.observability?.httpFlowLiveStream?.directRecoveryRequired === true ? 1 : 0,
    httpFlowLiveStreamDirectRecoveryHighWaterId: report.observability?.httpFlowLiveStream?.directRecoveryHighWaterId,
    httpFlowLiveStreamDirectRecoveryEntries: report.observability?.httpFlowLiveStream?.directRecoveryEntries,
    httpFlowLiveStreamDirectRecoveryCompletions: report.observability?.httpFlowLiveStream?.directRecoveryCompletions,
    httpFlowLiveStreamDirectBatchRowsP95: report.observability?.httpFlowLiveStream?.directBatchRows?.p95,
    httpFlowLiveStreamServerToReceiveP95Ms: report.observability?.httpFlowLiveStream?.serverToReceiveMs?.p95,
    httpFlowLiveStreamCommitToReceiveP95Ms: report.observability?.httpFlowLiveStream?.committedToReceiveMs?.p95,
    requestPacketBytesP95: report.observability?.query?.requestPacketBytes?.p95,
    responsePacketBytesP95: report.observability?.query?.responsePacketBytes?.p95,
    electronCPUP50Percent: metricValue(report, 'electron_mitm_http.resource.electron_load_cpu_p50_percent'),
    electronCPUP95Percent: metricValue(report, 'electron_mitm_http.resource.electron_load_cpu_p95_percent'),
    yakCPUP50Percent: metricValue(report, 'electron_mitm_http.resource.yak_load_cpu_p50_percent'),
    yakCPUP95Percent: metricValue(report, 'electron_mitm_http.resource.yak_load_cpu_p95_percent'),
    electronDrainCPUP95Percent: metricValue(report, 'electron_mitm_http.resource.electron_drain_cpu_p95_percent'),
    yakDrainCPUP95Percent: metricValue(report, 'electron_mitm_http.resource.yak_drain_cpu_p95_percent'),
    electronPeakWorkingSetMB: metricValue(report, 'electron_mitm_http.resource.electron_peak_working_set_mb'),
    yakPeakWorkingSetMB: metricValue(report, 'electron_mitm_http.resource.yak_peak_working_set_mb'),
    longTaskTotalMs: metricValue(report, 'electron_mitm_http.renderer.long_task_total_ms'),
    longTaskBlockingRatioPercent: metricValue(report, 'electron_mitm_http.renderer.long_task_blocking_ratio_percent'),
  },
})

const percentile = (sorted, ratio) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))]

export const summarizeMITMBodyMatrixMeasurements = (values) => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right)
  if (!sorted.length) return { count: 0 }
  const p50 = percentile(sorted, 0.5)
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length
  const variance = sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length
  const standardDeviation = Math.sqrt(variance)
  const absoluteDeviations = sorted.map((value) => Math.abs(value - p50)).sort((left, right) => left - right)
  return {
    count: sorted.length,
    min: sorted[0],
    p50,
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1],
    mean,
    standardDeviation,
    medianAbsoluteDeviation: percentile(absoluteDeviations, 0.5),
    coefficientOfVariationPercent: mean === 0 ? undefined : (standardDeviation / Math.abs(mean)) * 100,
    relativeRangePercent: p50 === 0 ? undefined : ((sorted[sorted.length - 1] - sorted[0]) / Math.abs(p50)) * 100,
  }
}

export const aggregateMITMBodyMatrixCase = ({ matrixCase, samples, requestedRepeats }) => {
  if (!Number.isInteger(requestedRepeats) || requestedRepeats < 1) {
    throw new Error(`MITM body matrix requested repeats must be a positive integer: ${requestedRepeats}`)
  }
  const measurementNames = [...new Set(samples.flatMap((sample) => Object.keys(sample.measurements || {})))]
  const measurementDistributions = Object.fromEntries(
    measurementNames.map((name) => [
      name,
      summarizeMITMBodyMatrixMeasurements(samples.map((sample) => sample.measurements?.[name])),
    ]),
  )
  const failedSamples = samples.filter(
    (sample) =>
      sample.status !== 'passed' ||
      sample.correctness?.cleanupErrors?.length > 0 ||
      (sample.correctness?.cpuRecoveryRequired === true && sample.correctness?.cpuRecovered !== true) ||
      (sample.config?.consumerMode === 'scroll-away' &&
        (sample.correctness?.consumerPaused !== true ||
          sample.correctness?.consumerResumed !== true ||
          sample.correctness?.consumerRemainedAway !== true ||
          sample.correctness?.consumerRestoredToTop !== true ||
          sample.correctness?.consumerBacklogObserved !== true ||
          sample.correctness?.consumerCaughtUp !== true)) ||
      (sample.runnerExit && (sample.runnerExit.code !== 0 || sample.runnerExit.signal)),
  )
  const completedRepeats = samples.length
  const passedRepeats = completedRepeats - failedSamples.length
  const status = failedSamples.length > 0 ? 'failed' : completedRepeats >= requestedRepeats ? 'passed' : 'running'
  const consumer = matrixCase.consumer || { mode: 'follow' }
  return {
    name: matrixCase.name,
    status,
    config: {
      requests: matrixCase.profile.requests,
      concurrency: matrixCase.profile.concurrency,
      targetRequestsPerSecond: matrixCase.profile.targetRequestsPerSecond,
      requestBodyBytes: matrixCase.profile.requestBodyBytes,
      responseBodyBytes: matrixCase.profile.responseBodyBytes,
      responseContentEncoding: matrixCase.profile.responseContentEncoding,
      requireCPURecovery: samples[0]?.config?.requireCPURecovery,
      recoveryTimeoutMs: samples[0]?.config?.recoveryTimeoutMs,
      recoveryStableSamples: samples[0]?.config?.recoveryStableSamples,
      pipelineSampleIntervalMs: samples[0]?.config?.pipelineSampleIntervalMs,
      httpFlowLiveRefreshMinIntervalMs: samples[0]?.config?.httpFlowLiveRefreshMinIntervalMs,
      httpFlowLiveDirectMinIntervalMs: samples[0]?.config?.httpFlowLiveDirectMinIntervalMs,
      httpFlowLiveDirectSustainedIntervalMs: samples[0]?.config?.httpFlowLiveDirectSustainedIntervalMs,
      httpFlowLiveDirectSustainedPendingRows: samples[0]?.config?.httpFlowLiveDirectSustainedPendingRows,
      mitmFlowTableOverscan: samples[0]?.config?.mitmFlowTableOverscan,
      consumerMode: consumer.mode,
      consumerPauseAtTargetPercent: consumer.pauseAtTargetPercent,
      consumerResumeAtTargetPercent: consumer.resumeAtTargetPercent,
      consumerPauseAfterRequests: consumer.pauseAfterRequests,
      consumerResumeAfterRequests: consumer.resumeAfterRequests,
    },
    repetitions: {
      requested: requestedRepeats,
      completed: completedRepeats,
      passed: passedRepeats,
      failed: failedSamples.length,
      sequential: true,
    },
    correctness: {
      allCompleted: completedRepeats >= requestedRepeats,
      allPassed: completedRepeats >= requestedRepeats && failedSamples.length === 0,
      cleanupErrors: samples.flatMap((sample) =>
        (sample.correctness?.cleanupErrors || []).map((error) => ({
          repeatIndex: sample.repeatIndex,
          error,
        })),
      ),
    },
    // Preserve the original scalar contract: repeated cases expose the median.
    measurements: Object.fromEntries(
      Object.entries(measurementDistributions).map(([name, measurement]) => [name, measurement.p50]),
    ),
    measurementDistributions,
    samples,
  }
}

const fixed = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '-')
const kib = (value) => (Number.isFinite(value) ? fixed(value / 1024, 0) : '-')
const medianRange = (distribution, digits = 1) => {
  if (!distribution || !Number.isFinite(distribution.p50)) return '-'
  return `${fixed(distribution.p50, digits)} [${fixed(distribution.min, digits)}..${fixed(distribution.max, digits)}]`
}

export const renderMITMBodyMatrixMarkdown = (summary) => {
  const rows = summary.cases.map((entry) => {
    const c = entry.config
    const d =
      entry.measurementDistributions ||
      Object.fromEntries(
        Object.entries(entry.measurements || {}).map(([name, value]) => [
          name,
          summarizeMITMBodyMatrixMeasurements([value]),
        ]),
      )
    const repeats = entry.repetitions ? `${entry.repetitions.completed}/${entry.repetitions.requested}` : '1/1'
    return `| ${entry.name} | ${entry.status} | ${repeats} | ${c.requests} | ${c.targetRequestsPerSecond || 'max'} | ${kib(c.requestBodyBytes)} | ${kib(c.responseBodyBytes)} | ${c.responseContentEncoding || 'identity'} | ${medianRange(d.requestsPerSecond)} | ${medianRange(d.dispatchRequestsPerSecond)} | ${medianRange(d.scheduleLagP95Ms)} | ${medianRange(d.firstVisibleMs, 0)} | ${medianRange(d.queryRoundTripP95Ms)} | ${medianRange(d.requestToReactP95Ms, 0)} | ${medianRange(d.yakCPUP50Percent)} | ${medianRange(d.yakCPUP95Percent)} | ${medianRange(d.yakPeakWorkingSetMB)} | ${medianRange(d.longTaskTotalMs, 0)} |`
  })
  const pipelineRows = summary.cases.map((entry) => {
    const d =
      entry.measurementDistributions ||
      Object.fromEntries(
        Object.entries(entry.measurements || {}).map(([name, value]) => [
          name,
          summarizeMITMBodyMatrixMeasurements([value]),
        ]),
      )
    return `| ${entry.name} | ${medianRange(d.persistQueueWaitP50Ms)} | ${medianRange(d.persistQueueWaitP95Ms)} | ${medianRange(d.persistWriteP95Ms)} | ${medianRange(d.databaseChangeDetectionP95Ms)} | ${medianRange(d.backendConversionPerFlowP95Us)} | ${medianRange(d.duplexDeliveryP95Ms)} | ${medianRange(d.triggerToQueryStartP95Ms)} | ${medianRange(d.persistToReactP95Ms)} | ${medianRange(d.queryCount, 0)} | ${medianRange(d.queryRatePerSecond)} | ${medianRange(d.flowCommittedTriggerCycles, 0)} | ${medianRange(d.flowCommittedCoalescedTriggers, 0)} |`
  })
  const shadowRows = summary.cases.map((entry) => {
    const d =
      entry.measurementDistributions ||
      Object.fromEntries(
        Object.entries(entry.measurements || {}).map(([name, value]) => [
          name,
          summarizeMITMBodyMatrixMeasurements([value]),
        ]),
      )
    return `| ${entry.name} | ${medianRange(d.flowCommittedShadowReceived, 0)} | ${medianRange(d.flowCommittedShadowQueryMatches, 0)} | ${medianRange(d.flowCommittedShadowDirectMatches, 0)} | ${medianRange(d.flowCommittedShadowInitialSnapshotOmitted, 0)} | ${medianRange(d.flowCommittedShadowQueryRowsWithoutEvent, 0)} | ${medianRange(d.flowCommittedShadowDirectRowsWithoutEvent, 0)} | ${medianRange(d.flowCommittedShadowPending, 0)} | ${medianRange(d.flowCommittedShadowDeliveryP95Ms)} | ${medianRange(d.flowCommittedShadowCommittedToReceiveP95Ms)} | ${medianRange(d.flowCommittedShadowCommittedToQueryP95Ms)} | ${medianRange(d.flowCommittedShadowToQueryP95Ms)} | ${medianRange(d.flowCommittedShadowCommittedToDirectP95Ms)} | ${medianRange(d.flowCommittedShadowToDirectP95Ms)} |`
  })
  const liveStreamRows = summary.cases.map((entry) => {
    const d =
      entry.measurementDistributions ||
      Object.fromEntries(
        Object.entries(entry.measurements || {}).map(([name, value]) => [
          name,
          summarizeMITMBodyMatrixMeasurements([value]),
        ]),
      )
    return `| ${entry.name} | ${medianRange(d.httpFlowLiveStreamReceived, 0)} | ${medianRange(d.httpFlowLiveStreamCommitted, 0)} | ${medianRange(d.httpFlowLiveStreamDirectBatches, 0)} | ${medianRange(d.httpFlowLiveStreamDirectRows, 0)} | ${medianRange(d.httpFlowLiveStreamDirectFallbackRows, 0)} | ${medianRange(d.httpFlowLiveStreamDirectBatchRowsP95)} | ${medianRange(d.httpFlowLiveStreamGaps, 0)} | ${medianRange(d.httpFlowLiveStreamSequenceGaps, 0)} | ${medianRange(d.httpFlowLiveStreamDuplicates, 0)} | ${medianRange(d.httpFlowLiveStreamUnavailable, 0)} | ${medianRange(d.httpFlowLiveStreamTriggerCycles, 0)} | ${medianRange(d.httpFlowLiveStreamServerToReceiveP95Ms)} | ${medianRange(d.httpFlowLiveStreamCommitToReceiveP95Ms)} |`
  })
  const backlogRows = summary.cases.map((entry) => {
    const d =
      entry.measurementDistributions ||
      Object.fromEntries(
        Object.entries(entry.measurements || {}).map(([name, value]) => [
          name,
          summarizeMITMBodyMatrixMeasurements([value]),
        ]),
      )
    return `| ${entry.name} | ${medianRange(d.maxPersistenceBacklog, 0)} | ${medianRange(d.maxVisibleIdBacklog, 0)} | ${medianRange(d.maxPendingFlowCommittedShadow, 0)} | ${medianRange(d.producerStopPersistenceBacklog, 0)} | ${medianRange(d.producerStopVisibleIdBacklog, 0)} | ${medianRange(d.databaseCatchUpMs, 0)} | ${medianRange(d.rendererDrainMs, 0)} | ${medianRange(d.producerStopToCPURecoveryMs, 0)} | ${medianRange(d.electronDrainCPUP95Percent)} | ${medianRange(d.yakDrainCPUP95Percent)} |`
  })
  const consumerRows = summary.cases.map((entry) => {
    const c = entry.config
    const d =
      entry.measurementDistributions ||
      Object.fromEntries(
        Object.entries(entry.measurements || {}).map(([name, value]) => [
          name,
          summarizeMITMBodyMatrixMeasurements([value]),
        ]),
      )
    const pause = Number.isFinite(c.consumerPauseAtTargetPercent)
      ? `${c.consumerPauseAtTargetPercent}% / ${c.consumerPauseAfterRequests}`
      : '-'
    const resume = Number.isFinite(c.consumerResumeAtTargetPercent)
      ? `${c.consumerResumeAtTargetPercent}% / ${c.consumerResumeAfterRequests}`
      : '-'
    return `| ${entry.name} | ${c.consumerMode || 'follow'} | ${pause} | ${resume} | ${medianRange(d.consumerPauseWindowMs, 0)} | ${medianRange(d.consumerPauseStartVisibleIdBacklog, 0)} | ${medianRange(d.consumerPauseEndVisibleIdBacklog, 0)} | ${medianRange(d.consumerPauseEndPersistenceBacklog, 0)} | ${medianRange(d.consumerResumeToRendererDrainMs, 0)} |`
  })
  const liveRefreshInterval = Number.isFinite(summary.diagnostics?.httpFlowLiveRefreshMinIntervalMs)
    ? `\`${summary.diagnostics.httpFlowLiveRefreshMinIntervalMs} ms\``
    : '`unknown`'
  return `${[
    '# MITM V2 Body Matrix',
    '',
    `- Matrix: \`${summary.matrixId}\``,
    `- Status: \`${summary.status}\``,
    `- Base profile: \`${summary.baseProfile}\``,
    `- Started: \`${summary.startedAt}\``,
    `- Finished: \`${summary.finishedAt || 'running'}\``,
    '',
    `- Repeats: \`${summary.repeatCount || 1}\` (strictly sequential)`,
    `- SQLite project max open connections: \`${summary.diagnostics?.sqliteProjectMaxOpenConns || 1}\``,
    `- SQLite project dedicated read-pool connections: \`${summary.diagnostics?.sqliteProjectReadPoolConns || 0}\``,
    `- FlowCommitted mode: \`${summary.diagnostics?.flowCommittedMode || 'shadow'}\``,
    `- HTTPFlow live stream mode: \`${summary.diagnostics?.httpFlowLiveStreamMode || 'canary'}\``,
    `- HTTPFlow live refresh minimum interval: ${liveRefreshInterval}`,
    `- CPU recovery required: \`${summary.diagnostics?.requireCPURecovery === true}\``,
    `- CPU recovery window/stability: \`${summary.diagnostics?.recoveryTimeoutMs || 10_000} ms / ${summary.diagnostics?.recoveryStableSamples || 3} samples\``,
    `- Pipeline sample interval: \`${summary.diagnostics?.pipelineSampleIntervalMs || 1_000} ms\``,
    '',
    '| Case | Status | Runs | Requests | Target req/s | Req KiB | Rsp KiB | Encoding | Completion req/s | Dispatch req/s | Schedule lag p95 ms | First ms | Query p95 ms | Req->React p95 ms | Yak CPU p50 % | Yak CPU p95 % | Yak RSS MB | Long task total ms |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
    '## Backend And Live Pipeline',
    '',
    '| Case | Persist queue p50 ms | Persist queue p95 ms | Persist write p95 ms | DB detect p95 ms | Convert/flow p95 us | Duplex p95 ms | Trigger->Query p95 ms | Persist->React p95 ms | Queries | Query/s | FC cycles | FC triggers |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...pipelineRows,
    '',
    '## Backlog, Drain And Recovery',
    '',
    '| Case | Max persist backlog | Max visible ID backlog | Max FC shadow pending | Stop persist backlog | Stop visible ID backlog | DB catch-up ms | Renderer drain ms | Stop->CPU idle ms | Electron drain CPU p95 % | Yak drain CPU p95 % |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...backlogRows,
    '',
    '## Consumer Pause And Recovery',
    '',
    '| Case | Mode | Pause % / requests | Resume % / requests | Actual pause ms | Pause-start visible backlog | Pause-end visible backlog | Pause-end persist backlog | Resume->Renderer drain ms |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...consumerRows,
    '',
    '## FlowCommitted Shadow',
    '',
    '| Case | Received | Query matches | Direct matches | Initial snapshot omitted | Query rows without event | Direct rows without event | Pending | Delivery p95 ms | Commit->Shadow p95 ms | Commit->Query p95 ms | Shadow->Query p95 ms | Commit->Direct p95 ms | Shadow->Direct p95 ms |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...shadowRows,
    '',
    '## HTTPFlow Live Stream',
    '',
    '| Case | Received | Committed | Direct batches | Direct rows | Fallback rows | Batch rows p95 | Gaps | Sequence gaps | Duplicates | Unavailable | Query fallback cycles | Server->Renderer p95 ms | Commit->Renderer p95 ms |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...liveStreamRows,
    '',
    'Cells use `p50 [min..max]`. JSON also records p95, mean, standard deviation, median absolute deviation and relative spread. Each repetition uses a fresh Yak project database and Electron user-data directory and runs sequentially. Body-size cases are scaling diagnostics; compare before/after runs of the same case for regression decisions.',
    '',
  ].join('\n')}\n`
}
