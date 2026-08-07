import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { getGitWorktreeIdentity } from '../fixtures/electron/git-worktree-identity.mjs'
import { RENDERER_BUILD_METADATA_SCHEMA_VERSION } from '../fixtures/electron/renderer-build-metadata.mjs'

export { getGitWorktreeIdentity }

const execFileAsync = promisify(execFile)

const distribution = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return { count: 0 }
  const at = (ratio) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))]
  return {
    count: sorted.length,
    min: sorted[0],
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    max: sorted[sorted.length - 1],
  }
}

const summarizeResourcePhase = (samples) => ({
  count: samples.length,
  electronCPUPercent: distribution(
    samples.map((sample) => sample.electron.reduce((sum, processMetric) => sum + processMetric.cpuPercent, 0)),
  ),
  electronWorkingSetMB: distribution(
    samples.map(
      (sample) => sample.electron.reduce((sum, processMetric) => sum + processMetric.workingSetSizeKB, 0) / 1024,
    ),
  ),
  yakCPUPercent: distribution(samples.map((sample) => sample.yak?.cpuPercent)),
  yakWorkingSetMB: distribution(samples.map((sample) => sample.yak?.workingSetSizeKB / 1024)),
})

export const summarizeResourceSamples = (samples) => {
  const phases = {}
  for (const phase of [...new Set(samples.map((sample) => sample.phase))]) {
    phases[phase] = summarizeResourcePhase(samples.filter((sample) => sample.phase === phase))
  }
  return phases
}

const maximumFinite = (values) => {
  const finite = values.filter(Number.isFinite)
  return finite.length ? Math.max(...finite) : undefined
}

export const summarizeMITMPipelineSamples = (samples) => {
  const validSamples = (samples || []).filter((sample) => sample && Number.isFinite(sample.atUnixMs))
  const phaseCounts = {}
  for (const sample of validSamples) phaseCounts[sample.phase] = (phaseCounts[sample.phase] || 0) + 1
  const producerStop = [...validSamples].reverse().find((sample) => sample.phase === 'producer-stop')
  const selectBacklog = (sample) =>
    sample
      ? {
          atUnixMs: sample.atUnixMs,
          producerReceivedRequests: sample.producerReceivedRequests,
          producerPersistenceBacklog: sample.producerPersistenceBacklog,
          streamVisibleIdBacklog: sample.streamVisibleIdBacklog,
          approximateIdBacklog: sample.approximateIdBacklog,
          asyncWriteQueueDepth: sample.asyncWriteQueueDepth,
          asyncWriteQueueUtilization: sample.asyncWriteQueueUtilization,
          pendingQueries: sample.pendingQueries,
          activeQueries: sample.activeQueries,
          pendingFlows: sample.pendingFlows,
          pendingLiveTriggers: sample.pendingLiveTriggers,
          pendingFlowCommittedShadow: sample.pendingFlowCommittedShadow,
          directRecoveryRequired: sample.directRecoveryRequired,
          directRecoveryHighWaterId: sample.directRecoveryHighWaterId,
          directRecoveryEntries: sample.directRecoveryEntries,
          directRecoveryCompletions: sample.directRecoveryCompletions,
        }
      : undefined
  return {
    count: validSamples.length,
    phaseCounts,
    maxima: {
      producerPersistenceBacklog: maximumFinite(validSamples.map((sample) => sample.producerPersistenceBacklog)),
      streamVisibleIdBacklog: maximumFinite(validSamples.map((sample) => sample.streamVisibleIdBacklog)),
      approximateIdBacklog: maximumFinite(validSamples.map((sample) => sample.approximateIdBacklog)),
      asyncWriteQueueDepth: maximumFinite(validSamples.map((sample) => sample.asyncWriteQueueDepth)),
      asyncWriteQueueUtilization: maximumFinite(validSamples.map((sample) => sample.asyncWriteQueueUtilization)),
      pendingQueries: maximumFinite(validSamples.map((sample) => sample.pendingQueries)),
      activeQueries: maximumFinite(validSamples.map((sample) => sample.activeQueries)),
      pendingFlows: maximumFinite(validSamples.map((sample) => sample.pendingFlows)),
      pendingLiveTriggers: maximumFinite(validSamples.map((sample) => sample.pendingLiveTriggers)),
      pendingFlowCommittedShadow: maximumFinite(validSamples.map((sample) => sample.pendingFlowCommittedShadow)),
    },
    producerStop: selectBacklog(producerStop),
  }
}

const readLinuxProcessStat = async (pid) => {
  const [stat, status] = await Promise.all([
    readFile(`/proc/${pid}/stat`, 'utf8'),
    readFile(`/proc/${pid}/status`, 'utf8'),
  ])
  const fields = stat
    .slice(stat.lastIndexOf(')') + 2)
    .trim()
    .split(/\s+/)
  const userTicks = Number(fields[11])
  const systemTicks = Number(fields[12])
  const rssMatch = /^VmRSS:\s+(\d+)\s+kB$/m.exec(status)
  if (!Number.isFinite(userTicks) || !Number.isFinite(systemTicks) || !rssMatch) {
    throw new Error(`Cannot parse Linux process metrics for PID ${pid}`)
  }
  return {
    measuredAtNs: process.hrtime.bigint(),
    cpuTicks: userTicks + systemTicks,
    workingSetSizeKB: Number(rssMatch[1]),
  }
}

export const createYakProcessSampler = async (pid) => {
  if (process.platform !== 'linux') {
    return { supported: false, reason: `unsupported platform ${process.platform}`, sample: async () => undefined }
  }
  if (!Number.isInteger(pid) || pid < 1) {
    throw new Error(`Invalid Yak PID for resource sampling: ${pid}`)
  }
  const { stdout } = await execFileAsync('getconf', ['CLK_TCK'])
  const clockTicksPerSecond = Number(stdout.trim())
  if (!Number.isFinite(clockTicksPerSecond) || clockTicksPerSecond < 1) {
    throw new Error(`Invalid CLK_TCK: ${stdout.trim()}`)
  }

  let previous
  return {
    supported: true,
    clockTicksPerSecond,
    sample: async () => {
      const current = await readLinuxProcessStat(pid)
      let cpuPercent
      if (previous) {
        const elapsedSeconds = Number(current.measuredAtNs - previous.measuredAtNs) / 1_000_000_000
        const busySeconds = (current.cpuTicks - previous.cpuTicks) / clockTicksPerSecond
        if (elapsedSeconds > 0) cpuPercent = (busySeconds / elapsedSeconds) * 100
      }
      previous = current
      return {
        pid,
        cpuPercent,
        workingSetSizeKB: current.workingSetSizeKB,
      }
    },
  }
}

const addMetric = (metrics, name, value, unit, direction, area) => {
  if (!Number.isFinite(value)) return
  metrics.push({ name, value, unit, direction, area })
}

export const buildComparableMetrics = (report) => {
  const metrics = []
  const load = report.load || {}
  const timing = report.timing || {}
  const flow = report.observability?.flow || {}
  const query = report.observability?.query || {}
  const live = report.observability?.live || {}
  const flowCommittedShadow = report.observability?.flowCommittedShadow || {}
  const httpFlowLiveStream = report.observability?.httpFlowLiveStream || {}
  const pipeline = report.pipeline?.summary || {}
  const resources = report.resources?.summary || {}
  const longTasks = report.renderer?.longTasks || {}
  const firstScenarioRow = report.renderer?.firstScenarioRow || {}

  addMetric(
    metrics,
    'electron_mitm_http.load.requests_per_second',
    load.requestsPerSecond,
    'requests/s',
    'higher',
    'load',
  )
  addMetric(
    metrics,
    'electron_mitm_http.load.dispatch_requests_per_second',
    load.dispatchRequestsPerSecond,
    'requests/s',
    'higher',
    'load',
  )
  addMetric(metrics, 'electron_mitm_http.load.schedule_lag_p95_ms', load.scheduleLagMs?.p95, 'ms', 'lower', 'load')
  addMetric(metrics, 'electron_mitm_http.load.request_latency_p95_ms', load.latencyMs?.p95, 'ms', 'lower', 'load')
  addMetric(metrics, 'electron_mitm_http.load.request_latency_p99_ms', load.latencyMs?.p99, 'ms', 'lower', 'load')
  addMetric(metrics, 'electron_mitm_http.drain.database_ms', timing.databaseDrainMs, 'ms', 'lower', 'drain')
  addMetric(metrics, 'electron_mitm_http.drain.database_catch_up_ms', timing.databaseCatchUpMs, 'ms', 'lower', 'drain')
  addMetric(metrics, 'electron_mitm_http.drain.renderer_ms', timing.rendererDrainMs, 'ms', 'lower', 'drain')
  addMetric(
    metrics,
    'electron_mitm_http.renderer.first_visible_ms',
    firstScenarioRow.latencyFromLoadStartMs,
    'ms',
    'lower',
    'renderer',
  )
  addMetric(metrics, 'electron_mitm_http.recovery.cpu_ms', timing.cpuRecoveryMs, 'ms', 'lower', 'resource')
  addMetric(
    metrics,
    'electron_mitm_http.recovery.producer_stop_to_cpu_ms',
    timing.producerStopToCPURecoveryMs,
    'ms',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.consumer.resume_to_renderer_drain_ms',
    timing.consumerResumeToRendererDrainMs,
    'ms',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.consumer.pause_window_ms',
    timing.consumerPauseWindowMs,
    'ms',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.consumer.pause_end_visible_id_backlog',
    report.consumer?.pauseEnd?.pipeline?.streamVisibleIdBacklog,
    'count',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.consumer.pause_end_persistence_backlog',
    report.consumer?.pauseEnd?.pipeline?.producerPersistenceBacklog,
    'count',
    'lower',
    'live-consumer',
  )
  for (const [name, value] of [
    ['producer_stop.persistence_backlog', pipeline.producerStop?.producerPersistenceBacklog],
    ['producer_stop.visible_id_backlog', pipeline.producerStop?.streamVisibleIdBacklog],
    ['max.persistence_backlog', pipeline.maxima?.producerPersistenceBacklog],
    ['max.visible_id_backlog', pipeline.maxima?.streamVisibleIdBacklog],
    ['max.observed_id_backlog', pipeline.maxima?.approximateIdBacklog],
    ['max.async_write_queue_depth', pipeline.maxima?.asyncWriteQueueDepth],
    ['max.pending_queries', pipeline.maxima?.pendingQueries],
    ['max.active_queries', pipeline.maxima?.activeQueries],
    ['max.pending_flows', pipeline.maxima?.pendingFlows],
    ['max.pending_live_triggers', pipeline.maxima?.pendingLiveTriggers],
    ['max.pending_flow_committed_shadow', pipeline.maxima?.pendingFlowCommittedShadow],
  ]) {
    addMetric(metrics, `electron_mitm_http.backlog.${name}`, value, 'count', 'lower', 'backlog')
  }
  addMetric(
    metrics,
    'electron_mitm_http.backlog.max.async_write_queue_utilization',
    pipeline.maxima?.asyncWriteQueueUtilization,
    'ratio',
    'lower',
    'backlog',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow.request_to_react_p95_ms',
    flow.requestToReactCommitMs?.p95,
    'ms',
    'lower',
    'renderer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow.response_to_react_p95_ms',
    flow.responseToReactCommitMs?.p95,
    'ms',
    'lower',
    'renderer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow.persist_to_react_p95_ms',
    flow.persistToReactCommitMs?.p95,
    'ms',
    'lower',
    'renderer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.query.round_trip_p95_ms',
    query.rendererRoundTripMs?.p95,
    'ms',
    'lower',
    'query',
  )
  addMetric(
    metrics,
    'electron_mitm_http.query.backend_conversion_per_flow_p95_us',
    query.backendConversionUsPerFlow?.p95,
    'us/flow',
    'lower',
    'query',
  )
  addMetric(metrics, 'electron_mitm_http.query.count', query.count, 'count', 'lower', 'query')
  addMetric(metrics, 'electron_mitm_http.query.rate_per_second', query.ratePerSecond, 'queries/s', 'lower', 'query')
  addMetric(
    metrics,
    'electron_mitm_http.query.react_commit_p95_ms',
    query.responseToReactCommitMs?.p95,
    'ms',
    'lower',
    'renderer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.live.trigger_to_query_start_p95_ms',
    live.triggerToQueryStartMs?.p95,
    'ms',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow_committed_shadow.delivery_p95_ms',
    flowCommittedShadow.deliveryMs?.p95,
    'ms',
    'lower',
    'flow-committed-shadow',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow_committed_shadow.commit_to_receive_p95_ms',
    flowCommittedShadow.committedToReceiveMs?.p95,
    'ms',
    'lower',
    'flow-committed-shadow',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow_committed_shadow.commit_to_query_p95_ms',
    flowCommittedShadow.committedToQueryObservedMs?.p95,
    'ms',
    'lower',
    'flow-committed-shadow',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow_committed_shadow.shadow_to_query_p95_ms',
    flowCommittedShadow.shadowToQueryObservedMs?.p95,
    'ms',
    'lower',
    'flow-committed-shadow',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow_committed_shadow.commit_to_direct_p95_ms',
    flowCommittedShadow.committedToDirectObservedMs?.p95,
    'ms',
    'lower',
    'flow-committed-shadow',
  )
  addMetric(
    metrics,
    'electron_mitm_http.flow_committed_shadow.shadow_to_direct_p95_ms',
    flowCommittedShadow.shadowToDirectObservedMs?.p95,
    'ms',
    'lower',
    'flow-committed-shadow',
  )
  for (const [name, value] of [
    ['received', flowCommittedShadow.received],
    ['invalid', flowCommittedShadow.invalid],
    ['duplicates', flowCommittedShadow.duplicates],
    ['out_of_order', flowCommittedShadow.outOfOrder],
    ['query_matches', flowCommittedShadow.queryMatches],
    ['direct_matches', flowCommittedShadow.directMatches],
    ['initial_snapshot_omitted', flowCommittedShadow.initialSnapshotOmitted],
    ['query_rows_without_event', flowCommittedShadow.queryRowsWithoutEvent],
    ['direct_rows_without_event', flowCommittedShadow.directRowsWithoutEvent],
    ['pending', flowCommittedShadow.pending],
  ]) {
    addMetric(
      metrics,
      `electron_mitm_http.flow_committed_shadow.${name}`,
      value,
      'count',
      name === 'received' || name === 'query_matches' || name === 'direct_matches' ? 'higher' : 'lower',
      'flow-committed-shadow',
    )
  }
  const flowCommittedCycles = (live.timeline || []).filter((cycle) => cycle.triggerSource === 'flow-committed')
  addMetric(
    metrics,
    'electron_mitm_http.live.flow_committed_trigger_cycles',
    flowCommittedCycles.length,
    'count',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.live.flow_committed_coalesced_triggers',
    flowCommittedCycles.reduce((total, cycle) => total + (Number(cycle.coalescedTriggers) || 0), 0),
    'count',
    'lower',
    'live-consumer',
  )
  const httpFlowLiveStreamCycles = (live.timeline || []).filter(
    (cycle) => cycle.triggerSource === 'httpflow-live-stream',
  )
  addMetric(
    metrics,
    'electron_mitm_http.live.httpflow_live_stream_trigger_cycles',
    httpFlowLiveStreamCycles.length,
    'count',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.live.httpflow_live_stream_coalesced_triggers',
    httpFlowLiveStreamCycles.reduce((total, cycle) => total + (Number(cycle.coalescedTriggers) || 0), 0),
    'count',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.httpflow_live_stream.server_to_receive_p95_ms',
    httpFlowLiveStream.serverToReceiveMs?.p95,
    'ms',
    'lower',
    'httpflow-live-stream',
  )
  addMetric(
    metrics,
    'electron_mitm_http.httpflow_live_stream.commit_to_receive_p95_ms',
    httpFlowLiveStream.committedToReceiveMs?.p95,
    'ms',
    'lower',
    'httpflow-live-stream',
  )
  for (const [name, value] of [
    ['subscriptions', httpFlowLiveStream.subscriptions],
    ['received', httpFlowLiveStream.received],
    ['committed', httpFlowLiveStream.committed],
    ['heartbeats', httpFlowLiveStream.heartbeats],
    ['gaps', httpFlowLiveStream.gaps],
    ['replayed', httpFlowLiveStream.replayed],
    ['invalid_envelopes', httpFlowLiveStream.invalidEnvelopes],
    ['invalid_events', httpFlowLiveStream.invalidEvents],
    ['sequence_gaps', httpFlowLiveStream.sequenceGaps],
    ['duplicates', httpFlowLiveStream.duplicates],
    ['out_of_order', httpFlowLiveStream.outOfOrder],
    ['unavailable', httpFlowLiveStream.unavailable],
    ['ended', httpFlowLiveStream.ended],
    ['direct_rows', httpFlowLiveStream.directRows],
    ['direct_fallback_rows', httpFlowLiveStream.directFallbackRows],
    ['direct_recovery_entries', httpFlowLiveStream.directRecoveryEntries],
    ['direct_recovery_completions', httpFlowLiveStream.directRecoveryCompletions],
  ]) {
    addMetric(
      metrics,
      `electron_mitm_http.httpflow_live_stream.${name}`,
      value,
      'count',
      name === 'received' || name === 'committed' || name === 'direct_rows' ? 'higher' : 'lower',
      'httpflow-live-stream',
    )
  }
  addMetric(
    metrics,
    'electron_mitm_http.live.query_execution_p95_ms',
    live.queryExecutionMs?.p95,
    'ms',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.live.query_complete_to_react_p95_ms',
    live.queryCompleteToReactCommitMs?.p95,
    'ms',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.live.trigger_to_react_p95_ms',
    live.triggerToReactCommitMs?.p95,
    'ms',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.live.next_query_delay_p95_ms',
    live.nextQueryDelayMs?.p95,
    'ms',
    'lower',
    'live-consumer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.query.response_packet_bytes_p95',
    query.responsePacketBytes?.p95,
    'bytes',
    'lower',
    'query-payload',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.electron_load_cpu_p50_percent',
    resources.load?.electronCPUPercent?.p50,
    'percent',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.electron_load_cpu_p95_percent',
    resources.load?.electronCPUPercent?.p95,
    'percent',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.electron_peak_working_set_mb',
    resources.load?.electronWorkingSetMB?.max,
    'MB',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.yak_load_cpu_p50_percent',
    resources.load?.yakCPUPercent?.p50,
    'percent',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.yak_load_cpu_p95_percent',
    resources.load?.yakCPUPercent?.p95,
    'percent',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.yak_peak_working_set_mb',
    resources.load?.yakWorkingSetMB?.max,
    'MB',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.electron_drain_cpu_p95_percent',
    resources.drain?.electronCPUPercent?.p95,
    'percent',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.yak_drain_cpu_p95_percent',
    resources.drain?.yakCPUPercent?.p95,
    'percent',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.electron_drain_peak_working_set_mb',
    resources.drain?.electronWorkingSetMB?.max,
    'MB',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.yak_drain_peak_working_set_mb',
    resources.drain?.yakWorkingSetMB?.max,
    'MB',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.electron_recovery_cpu_p95_percent',
    resources.recovery?.electronCPUPercent?.p95,
    'percent',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.resource.yak_recovery_cpu_p95_percent',
    resources.recovery?.yakCPUPercent?.p95,
    'percent',
    'lower',
    'resource',
  )
  addMetric(
    metrics,
    'electron_mitm_http.renderer.long_task_count',
    longTasks.durationMs?.count,
    'count',
    'lower',
    'renderer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.renderer.long_task_total_ms',
    longTasks.totalDurationMs,
    'ms',
    'lower',
    'renderer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.renderer.long_task_blocking_ratio_percent',
    Number.isFinite(longTasks.totalDurationMs) &&
      Number.isFinite(longTasks.observationDurationMs) &&
      longTasks.observationDurationMs > 0
      ? (longTasks.totalDurationMs / longTasks.observationDurationMs) * 100
      : undefined,
    'percent',
    'lower',
    'renderer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.renderer.long_task_p95_ms',
    longTasks.durationMs?.p95,
    'ms',
    'lower',
    'renderer',
  )
  addMetric(
    metrics,
    'electron_mitm_http.renderer.long_task_max_ms',
    longTasks.durationMs?.max,
    'ms',
    'lower',
    'renderer',
  )
  return metrics.sort((left, right) => left.name.localeCompare(right.name))
}

export const readE2ERunMetadata = async (artifactsDirectory) => {
  try {
    return JSON.parse(await readFile(path.join(artifactsDirectory, 'run-metadata.json'), 'utf8'))
  } catch {
    return undefined
  }
}

export const readRendererBuildMetadata = async (repoRoot) => {
  const metadataPath = path.join(repoRoot, 'app/renderer/pages/main/yakit-e2e-build.json')
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  if (
    metadata?.schemaVersion !== RENDERER_BUILD_METADATA_SCHEMA_VERSION ||
    !['production-unminified', 'production-minified'].includes(metadata?.mode) ||
    !metadata?.source?.stateFingerprint
  ) {
    throw new Error(`Unsupported Renderer E2E build metadata at ${metadataPath}`)
  }
  return metadata
}

export const writeMITMPerformanceReport = async (artifactsDirectory, report) => {
  await mkdir(artifactsDirectory, { recursive: true })
  report.metrics = buildComparableMetrics(report)
  const outputPath = path.join(artifactsDirectory, 'mitm-performance.json')
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  return outputPath
}
