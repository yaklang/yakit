const COMPARABLE_CONFIG_FIELDS = [
  'harnessVersion',
  'protocol',
  'loopbackOnly',
  'requests',
  'concurrency',
  'targetRequestsPerSecond',
  'requestBodyBytes',
  'responseBodyBytes',
  'responseContentEncoding',
  'requestTimeoutMs',
  'resourceSampleIntervalMs',
  'resourceIdleCPUThresholdPercent',
  'resourceIdleStableSamples',
  'resourceIdleTimeoutMs',
  'resourceBaselineSamples',
  'resourceRecoveryTimeoutMs',
  'resourceRecoveryStableSamples',
  'requireCPURecovery',
  'pipelineSampleIntervalMs',
  'engineMaxProcs',
  'engineMemoryLimit',
  'rendererBuildMode',
  'rendererReactMode',
  'backendSystemTimingEnabled',
  'skipLiveExactTotalEnabled',
  'flowCommittedShadowEnabled',
  'flowCommittedMode',
  'httpFlowLiveStreamMode',
  'consumerMode',
  'consumerPauseAtTargetPercent',
  'consumerResumeAtTargetPercent',
  'consumerPauseAfterRequests',
  'consumerResumeAfterRequests',
  'sqliteProjectMaxOpenConns',
  'sqliteProjectReadPoolConns',
]

const DIAGNOSTIC_METRICS = new Set([
  'electron_mitm_http.live.next_query_delay_p95_ms',
  'electron_mitm_http.renderer.long_task_count',
  // The observer stops when renderer drain completes, so a faster candidate
  // shortens this metric's denominator. Gate the absolute total/p95/max
  // instead; keep the ratio visible as a density diagnostic.
  'electron_mitm_http.renderer.long_task_blocking_ratio_percent',
  'electron_mitm_http.query.count',
  'electron_mitm_http.query.rate_per_second',
  'electron_mitm_http.live.flow_committed_trigger_cycles',
  'electron_mitm_http.live.flow_committed_coalesced_triggers',
  'electron_mitm_http.flow_committed_shadow.delivery_p95_ms',
  'electron_mitm_http.flow_committed_shadow.commit_to_receive_p95_ms',
  'electron_mitm_http.flow_committed_shadow.commit_to_query_p95_ms',
  'electron_mitm_http.flow_committed_shadow.shadow_to_query_p95_ms',
  'electron_mitm_http.flow_committed_shadow.received',
  'electron_mitm_http.flow_committed_shadow.invalid',
  'electron_mitm_http.flow_committed_shadow.duplicates',
  'electron_mitm_http.flow_committed_shadow.out_of_order',
  'electron_mitm_http.flow_committed_shadow.query_matches',
  'electron_mitm_http.flow_committed_shadow.initial_snapshot_omitted',
  'electron_mitm_http.flow_committed_shadow.query_rows_without_event',
  'electron_mitm_http.flow_committed_shadow.pending',
  'electron_mitm_http.consumer.pause_window_ms',
  'electron_mitm_http.consumer.pause_end_visible_id_backlog',
  'electron_mitm_http.consumer.pause_end_persistence_backlog',
])

const isDiagnosticMetric = (name) =>
  DIAGNOSTIC_METRICS.has(name) ||
  name.startsWith('electron_mitm_http.httpflow_live_stream.') ||
  name.startsWith('electron_mitm_http.live.httpflow_live_stream_')

const appendDerivedLongTaskMetrics = (report, metrics) => {
  const existing = new Set(metrics.map((metric) => metric.name))
  const longTasks = report.renderer?.longTasks
  if (!longTasks) return metrics

  if (!existing.has('electron_mitm_http.renderer.long_task_total_ms') && Number.isFinite(longTasks.totalDurationMs)) {
    metrics.push({
      name: 'electron_mitm_http.renderer.long_task_total_ms',
      value: longTasks.totalDurationMs,
      unit: 'ms',
      direction: 'lower',
      area: 'renderer',
    })
  }
  if (
    !existing.has('electron_mitm_http.renderer.long_task_blocking_ratio_percent') &&
    Number.isFinite(longTasks.totalDurationMs) &&
    Number.isFinite(longTasks.observationDurationMs) &&
    longTasks.observationDurationMs > 0
  ) {
    metrics.push({
      name: 'electron_mitm_http.renderer.long_task_blocking_ratio_percent',
      value: (longTasks.totalDurationMs / longTasks.observationDurationMs) * 100,
      unit: 'percent',
      direction: 'lower',
      area: 'renderer',
    })
  }
  return metrics
}

const comparableMetrics = (report) => appendDerivedLongTaskMetrics(report, [...(report.metrics || [])])

const noiseFloorFor = (metric) => {
  if (metric.name.endsWith('requests_per_second')) return 1
  if (metric.name.endsWith('long_task_blocking_ratio_percent')) return 1
  if (metric.unit === 'ms') return metric.name.includes('drain.') ? 50 : 10
  if (metric.unit === 'percent') return 10
  if (metric.unit === 'MB') return 10
  if (metric.unit === 'count') return 1
  return 0
}

const validateReport = (report, label) => {
  if (report?.schemaVersion !== 1 || report?.kind !== 'yakit-electron-mitm-http-performance') {
    throw new Error(`${label} is not a supported MITM Electron performance report`)
  }
  if (report.status !== 'passed') throw new Error(`${label} report status is ${report.status}`)
  const expected = report.config?.requests
  if (
    report.correctness?.producer?.failed !== 0 ||
    report.correctness?.target?.receivedRequests !== expected ||
    report.correctness?.target?.duplicateSequences?.length !== 0 ||
    report.correctness?.database?.total !== expected ||
    report.correctness?.database?.uniqueIds !== expected ||
    report.correctness?.database?.allStatus200 !== true ||
    report.correctness?.database?.allMITM !== true
  ) {
    throw new Error(`${label} did not satisfy the traffic correctness contract`)
  }
  if (
    report.config?.consumerMode === 'scroll-away' &&
    (report.correctness?.consumer?.paused !== true ||
      report.correctness?.consumer?.resumed !== true ||
      report.correctness?.consumer?.remainedAway !== true ||
      report.correctness?.consumer?.restoredToTop !== true ||
      report.correctness?.consumer?.backlogObserved !== true ||
      report.correctness?.consumer?.caughtUp !== true)
  ) {
    throw new Error(`${label} did not satisfy the consumer pause/recovery contract`)
  }
  if (
    report.cleanup?.mitmStopped !== true ||
    report.cleanup?.targetStopped !== true ||
    report.cleanup?.errors?.length
  ) {
    throw new Error(`${label} did not satisfy the cleanup contract`)
  }
}

export const compareMITMPerformanceReports = (baseline, candidate, { maxRegressionPercent = 15 } = {}) => {
  validateReport(baseline, 'baseline')
  validateReport(candidate, 'candidate')
  if (
    baseline.config?.yakCPUProfileEnabled === true ||
    candidate.config?.yakCPUProfileEnabled === true ||
    baseline.config?.yakHeapProfileEnabled === true ||
    candidate.config?.yakHeapProfileEnabled === true ||
    baseline.config?.rendererTraceEnabled === true ||
    candidate.config?.rendererTraceEnabled === true
  ) {
    throw new Error('Profiled MITM reports are diagnostic-only and cannot be used for performance A/B')
  }
  if (baseline.profile !== candidate.profile) {
    throw new Error(`Profile mismatch: ${baseline.profile} != ${candidate.profile}`)
  }
  for (const field of COMPARABLE_CONFIG_FIELDS) {
    if (baseline.config?.[field] !== candidate.config?.[field]) {
      throw new Error(`Config mismatch for ${field}: ${baseline.config?.[field]} != ${candidate.config?.[field]}`)
    }
  }
  for (const field of ['platform', 'arch', 'node']) {
    if (baseline.system?.[field] !== candidate.system?.[field]) {
      throw new Error(`System mismatch for ${field}: ${baseline.system?.[field]} != ${candidate.system?.[field]}`)
    }
  }

  const baselineMetrics = new Map(comparableMetrics(baseline).map((metric) => [metric.name, metric]))
  const candidateMetrics = new Map(comparableMetrics(candidate).map((metric) => [metric.name, metric]))
  const missing = [...baselineMetrics.keys()].filter((name) => !candidateMetrics.has(name))
  const added = [...candidateMetrics.keys()].filter((name) => !baselineMetrics.has(name))
  if (missing.length || added.length) {
    throw new Error(`Metric coverage mismatch; missing=[${missing.join(', ')}], added=[${added.join(', ')}]`)
  }

  const comparisons = []
  for (const [name, baselineMetric] of baselineMetrics) {
    const candidateMetric = candidateMetrics.get(name)
    if (
      baselineMetric.unit !== candidateMetric.unit ||
      baselineMetric.direction !== candidateMetric.direction ||
      baselineMetric.area !== candidateMetric.area
    ) {
      throw new Error(`Metric contract mismatch for ${name}`)
    }
    const rawChange = candidateMetric.value - baselineMetric.value
    const unfavorableChange = baselineMetric.direction === 'higher' ? -rawChange : rawChange
    const relativeRegressionPercent =
      unfavorableChange > 0
        ? baselineMetric.value === 0
          ? Number.POSITIVE_INFINITY
          : (unfavorableChange / Math.abs(baselineMetric.value)) * 100
        : 0
    const noiseFloor = noiseFloorFor(baselineMetric)
    const diagnostic = isDiagnosticMetric(name)
    const regression =
      !diagnostic && unfavorableChange > noiseFloor && relativeRegressionPercent > Number(maxRegressionPercent)
    comparisons.push({
      name,
      unit: baselineMetric.unit,
      direction: baselineMetric.direction,
      baseline: baselineMetric.value,
      candidate: candidateMetric.value,
      rawChange,
      relativeRegressionPercent,
      noiseFloor,
      gating: !diagnostic,
      status: diagnostic ? 'diagnostic' : regression ? 'regression' : unfavorableChange > 0 ? 'noise' : 'pass',
    })
  }

  return {
    schemaVersion: 1,
    kind: 'yakit-electron-mitm-http-performance-comparison',
    status: comparisons.some((comparison) => comparison.status === 'regression') ? 'failed' : 'passed',
    profile: baseline.profile,
    maxRegressionPercent: Number(maxRegressionPercent),
    baselineRevision: baseline.revisions,
    candidateRevision: candidate.revisions,
    comparisons,
  }
}
