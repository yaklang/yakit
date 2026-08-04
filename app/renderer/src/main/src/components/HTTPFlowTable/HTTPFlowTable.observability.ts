import type { HTTPFlow, HTTPFlowSystemTiming, TimingNumber, YakQueryHTTPFlowResponse } from './HTTPFlowTable.constants'
import { areMITMDebugHooksEnabled } from '@/utils/mitmDebugHooks'
import {
  HTTP_FLOW_LIVE_DIRECT_MIN_INTERVAL_MS,
  HTTP_FLOW_LIVE_DIRECT_SUSTAINED_INTERVAL_MS,
  HTTP_FLOW_LIVE_DIRECT_SUSTAINED_PENDING_ROWS,
  MITM_FLOW_TABLE_OVERSCAN,
} from './HTTPFlowTable.performance'

const MAX_QUERY_SAMPLES = 256
const MAX_FLOW_SAMPLES = 1024
const MAX_DUPLEX_SAMPLES = 256
const MAX_PENDING_QUERIES = 128
const MAX_PENDING_FLOWS = 4096
const MAX_QUERY_VISIBLE_IDS = 64
const MAX_LIVE_CYCLES = 128
const MAX_REPORTED_QUERY_SAMPLES = 32
const MAX_COMMITTED_SHADOW_SAMPLES = 4096
const MAX_REPORTED_COMMITTED_SHADOW_SAMPLES = 64
const MAX_PENDING_COMMITTED_SHADOW = 4096
const MAX_COMMITTED_SHADOW_PROJECTS = 16
const MAX_HTTP_FLOW_LIVE_STREAM_SAMPLES = 2048
const MAX_REPORTED_HTTP_FLOW_LIVE_STREAM_SAMPLES = 64
const MAX_HTTP_FLOW_LIVE_GAP_REASONS = 16
export const HTTP_FLOW_LIVE_REFRESH_MIN_INTERVAL_MS = 700

type Clock = () => number

export interface MITMQueryToken {
  id: number
  epoch: number
  startedAtUnixMs: number
  startedAtPerformanceMs: number
  liveCycleId?: number
  cursorBefore?: number
  requestedRows?: number
}

export type MITMLiveTriggerSource =
  | 'duplex'
  | 'flow-committed'
  | 'httpflow-live-stream'
  | 'poll'
  | 'continuation'
  | 'initial'
  | 'manual'
export type MITMFlowCommittedMode = 'off' | 'shadow' | 'canary'
export type HTTPFlowLiveStreamFault =
  | 'invalid-envelope'
  | 'invalid-event'
  | 'sequence-gap'
  | 'duplicate'
  | 'out-of-order'
  | 'unavailable'
  | 'ended'

export interface MITMLiveCycleToken {
  id: number
}

interface PendingLiveTrigger {
  id: number
  source: MITMLiveTriggerSource
  count: number
  serverSentAtUnixMs?: number
  firstReceivedAtUnixMs: number
  firstReceivedAtPerformanceMs: number
  lastReceivedAtUnixMs: number
}

interface QuerySample {
  id: number
  startedAtUnixMs: number
  liveCycleId?: number
  cursorBefore?: number
  requestedRows?: number
  rows: number
  failed: boolean
  rendererRoundTripMs: number
  rendererToMainMs?: number
  mainDispatchMs?: number
  backendQueryMs?: number
  backendCountMs?: number
  backendDataQueryMs?: number
  countExecuted?: boolean
  backendConversionMs?: number
  backendServerTotalMs?: number
  mainGrpcMs?: number
  mainToBackendMs?: number
  backendToMainMs?: number
  mainToRendererMs?: number
  responseToReactCommitMs?: number
  queueDepth?: number
  highWaterDetectionMs?: number
  requestPacketBytes: number
  responsePacketBytes: number
  declaredRequestBytes: number
  declaredResponseBodyBytes: number
}

interface LiveCycleSample {
  id: number
  triggerId?: number
  triggerSource: MITMLiveTriggerSource
  coalescedTriggers: number
  triggerReceivedAtUnixMs?: number
  triggerServerSentAtUnixMs?: number
  startedAtUnixMs: number
  startedAtPerformanceMs: number
  cursorBefore: number
  cursorAfter: number
  requestedRows: number
  returnedRows: number
  queryCount: number
  failed: boolean
  hasMore?: boolean
  stopReason?: string
  estimatedPayloadBytes?: number
  backendHighWaterBefore: number
  backendHighWaterAfter: number
  visibleHighWaterBefore: number
  visibleHighWaterAfter?: number
  approximateBacklogBefore: number
  approximateBacklogAfterQuery?: number
  approximateBacklogAfterCommit?: number
  triggerToQueryStartMs?: number
  queryExecutionMs?: number
  queryCompleteToReactCommitMs?: number
  triggerToReactCommitMs?: number
  nextQueryDelayMs?: number
  requestPacketBytes: number
  responsePacketBytes: number
  declaredRequestBytes: number
  declaredResponseBodyBytes: number
  completedAtUnixMs?: number
  completedAtPerformanceMs?: number
  committedAtUnixMs?: number
  visibleCandidateIds: number[]
}

interface FlowSample {
  id: number
  requestToReactCommitMs?: number
  responseToReactCommitMs?: number
  flowBuildToReactCommitMs?: number
  persistQueueWaitMs?: number
  persistWriteMs?: number
  databaseChangeDetectionMs?: number
  persistToReactCommitMs?: number
}

interface PendingFlow {
  timing: HTTPFlowSystemTiming
}

interface PendingQuery {
  sample: QuerySample
  responseAtPerformanceMs: number
  visibleCandidateIds: number[]
}

export interface HTTPFlowCommittedShadowEvent {
  version?: TimingNumber
  id?: TimingNumber
  project_generation?: TimingNumber
  database_identity?: string
  committed_at_unix_ms?: TimingNumber
  high_water_id?: TimingNumber
}

export interface HTTPFlowCommittedSignal {
  id: number
  projectGeneration: number
  databaseIdentity: string
  committedAtUnixMs: number
  highWaterId: number
  serverSentAtUnixMs?: number
}

interface FlowCommittedShadowSample {
  id: number
  projectGeneration: number
  databaseIdentity: string
  committedAtUnixMs: number
  highWaterId: number
  serverSentAtUnixMs?: number
  receivedAtUnixMs: number
  deliveryMs?: number
  committedToReceiveMs?: number
  queryObservedAtUnixMs?: number
  committedToQueryObservedMs?: number
  shadowToQueryObservedMs?: number
  directObservedAtUnixMs?: number
  committedToDirectObservedMs?: number
  shadowToDirectObservedMs?: number
  initialSnapshotOmitted?: boolean
}

interface HTTPFlowLiveStreamSample {
  sequence: number
  id: number
  highWaterId: number
  replayed: boolean
  receivedAtUnixMs: number
  serverToReceiveMs?: number
  committedToReceiveMs?: number
}

export interface MetricDistribution {
  count: number
  min?: number
  p50?: number
  p95?: number
  p99?: number
  max?: number
}

const asNumber = (value: TimingNumber | undefined): number => {
  const result = Number(value ?? 0)
  return Number.isFinite(result) ? result : 0
}

const positiveDuration = (end: number, start: number): number | undefined => {
  if (end <= 0 || start <= 0 || end < start) return undefined
  return end - start
}

const appendBounded = <T>(target: T[], value: T, max: number) => {
  target.push(value)
  if (target.length > max) target.splice(0, target.length - max)
}

const trimMap = <K, V>(target: Map<K, V>, max: number) => {
  while (target.size > max) {
    const oldest = target.keys().next().value
    if (oldest === undefined) break
    target.delete(oldest)
  }
}

const percentile = (sorted: number[], ratio: number): number | undefined => {
  if (!sorted.length) return undefined
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))
  return sorted[index]
}

const distribution = (values: Array<number | undefined>): MetricDistribution => {
  const sorted = values
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b)
  if (!sorted.length) return { count: 0 }
  return {
    count: sorted.length,
    min: sorted[0],
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1],
  }
}

const packetByteLength = (value: unknown): number => {
  if (typeof value === 'string') return value.length
  if (value instanceof ArrayBuffer) return value.byteLength
  if (ArrayBuffer.isView(value)) return value.byteLength
  if (Array.isArray(value)) return value.length
  return 0
}

const sumFlowBytes = (flows: HTTPFlow[]) =>
  flows.reduce(
    (total, flow) => {
      total.requestPacketBytes += packetByteLength(flow.Request)
      total.responsePacketBytes += packetByteLength(flow.Response)
      total.declaredRequestBytes += Math.max(0, asNumber(flow.RequestLength))
      total.declaredResponseBodyBytes += Math.max(0, asNumber(flow.BodyLength))
      return total
    },
    {
      requestPacketBytes: 0,
      responsePacketBytes: 0,
      declaredRequestBytes: 0,
      declaredResponseBodyBytes: 0,
    },
  )

export const grpcTimestampToUnixMs = (value: TimingNumber | undefined): number => {
  if (value === undefined) return 0
  try {
    const raw = BigInt(String(value))
    // Duplex timestamps are Unix nanoseconds. Keep this tolerant for tests or
    // future callers that already supply milliseconds.
    return Number(raw > BigInt('10000000000000') ? raw / BigInt(1_000_000) : raw)
  } catch {
    return 0
  }
}

export class MITMFlowObservability {
  private observationEpoch = 0
  private sequence = 0
  private liveSequence = 0
  private triggerSequence = 0
  private querySamples: QuerySample[] = []
  private flowSamples: FlowSample[] = []
  private duplexDeliverySamples: number[] = []
  private liveCycles: LiveCycleSample[] = []
  private pendingLiveTrigger?: PendingLiveTrigger
  private pendingFlows = new Map<number, PendingFlow>()
  private pendingQueries = new Map<number, PendingQuery>()
  private activeQueries = new Set<number>()
  private latestBackendPersistedId = 0
  private latestQueryPersistedId = 0
  private latestBackendDetectedId = 0
  private latestVisibleId = 0
  private latestQueueDepth = 0
  private latestQueueCapacity = 0
  private latestBackendObservationAtUnixMs = 0
  private latestBackendObservationQueryId = 0
  private databaseIdentity = ''
  private projectGeneration = 0
  private backendSystemTimingEnabled = true
  private skipLiveExactTotalEnabled = true
  private flowCommittedShadowEnabled = true
  private flowCommittedMode: MITMFlowCommittedMode = 'shadow'
  private flowCommittedShadowSubscriptionAtUnixMs = 0
  private flowCommittedShadowSamples: FlowCommittedShadowSample[] = []
  private pendingFlowCommittedShadow = new Map<string, FlowCommittedShadowSample>()
  private seenFlowCommittedShadow = new Map<string, true>()
  private queryObservedFlowCommittedShadow = new Map<string, number>()
  private directObservedFlowCommittedShadow = new Map<string, number>()
  private lastFlowCommittedIdByProject = new Map<string, number>()
  private flowCommittedShadowInvalid = 0
  private flowCommittedShadowDuplicates = 0
  private flowCommittedShadowOutOfOrder = 0
  private flowCommittedShadowQueryMatches = 0
  private flowCommittedShadowDirectMatches = 0
  private flowCommittedShadowInitialSnapshotOmitted = 0
  private flowCommittedShadowInitialSnapshots = new Map<string, true>()
  private flowCommittedQueryRowsWithoutEvent = new Map<string, true>()
  private httpFlowLiveStreamMode: MITMFlowCommittedMode = 'canary'
  private httpFlowLiveStreamStatus: 'idle' | 'active' | 'recovering' | 'unavailable' | 'ended' = 'idle'
  private httpFlowLiveStreamDatabaseIdentity = ''
  private httpFlowLiveStreamProjectGeneration = 0
  private httpFlowLiveStreamSubscriptions = 0
  private httpFlowLiveStreamReceived = 0
  private httpFlowLiveStreamCommitted = 0
  private httpFlowLiveStreamHeartbeats = 0
  private httpFlowLiveStreamGaps = 0
  private httpFlowLiveStreamReplayed = 0
  private httpFlowLiveStreamInvalidEnvelopes = 0
  private httpFlowLiveStreamInvalidEvents = 0
  private httpFlowLiveStreamSequenceGaps = 0
  private httpFlowLiveStreamDuplicates = 0
  private httpFlowLiveStreamOutOfOrder = 0
  private httpFlowLiveStreamUnavailable = 0
  private httpFlowLiveStreamEnded = 0
  private httpFlowLiveStreamLatestSequence = 0
  private httpFlowLiveStreamHighWaterId = 0
  private httpFlowLiveStreamDirectBatches = 0
  private httpFlowLiveStreamDirectRows = 0
  private httpFlowLiveStreamDirectFallbackRows = 0
  private httpFlowLiveStreamDirectRecoveryRequired = false
  private httpFlowLiveStreamDirectRecoveryHighWaterId = 0
  private httpFlowLiveStreamDirectRecoveryEntries = 0
  private httpFlowLiveStreamDirectRecoveryCompletions = 0
  private httpFlowLiveStreamDirectBatchRows: number[] = []
  private httpFlowLiveStreamGapReasons = new Map<string, number>()
  private httpFlowLiveStreamSamples: HTTPFlowLiveStreamSample[] = []

  constructor(
    private readonly nowUnixMs: Clock = () => Date.now(),
    private readonly nowPerformanceMs: Clock = () => performance.now(),
  ) {}

  setBackendSystemTimingEnabled(enabled: boolean) {
    this.backendSystemTimingEnabled = enabled === true
  }

  isBackendSystemTimingEnabled() {
    return this.backendSystemTimingEnabled
  }

  setSkipLiveExactTotalEnabled(enabled: boolean) {
    this.skipLiveExactTotalEnabled = enabled === true
  }

  isSkipLiveExactTotalEnabled() {
    return this.skipLiveExactTotalEnabled
  }

  setFlowCommittedShadowEnabled(enabled: boolean) {
    this.setFlowCommittedMode(enabled ? 'shadow' : 'off')
  }

  setFlowCommittedMode(mode: MITMFlowCommittedMode) {
    this.flowCommittedMode = mode
    this.flowCommittedShadowEnabled = mode !== 'off'
    this.flowCommittedShadowSubscriptionAtUnixMs = this.flowCommittedShadowEnabled ? this.nowUnixMs() : 0
  }

  getFlowCommittedMode() {
    return this.flowCommittedMode
  }

  isFlowCommittedShadowEnabled() {
    return this.flowCommittedShadowEnabled
  }

  setHTTPFlowLiveStreamMode(mode: MITMFlowCommittedMode) {
    this.httpFlowLiveStreamMode = mode
    if (mode === 'off') this.httpFlowLiveStreamStatus = 'idle'
  }

  getHTTPFlowLiveStreamMode() {
    return this.httpFlowLiveStreamMode
  }

  recordHTTPFlowLiveStreamSubscription(databaseIdentity: string, projectGeneration: number) {
    this.httpFlowLiveStreamSubscriptions += 1
    this.httpFlowLiveStreamStatus = 'active'
    if (
      databaseIdentity !== this.httpFlowLiveStreamDatabaseIdentity ||
      projectGeneration !== this.httpFlowLiveStreamProjectGeneration
    ) {
      this.httpFlowLiveStreamLatestSequence = 0
      this.httpFlowLiveStreamHighWaterId = 0
    }
    this.httpFlowLiveStreamDatabaseIdentity = databaseIdentity
    this.httpFlowLiveStreamProjectGeneration = projectGeneration
  }

  recordHTTPFlowLiveStreamEvent(event: HTTPFlowLiveEvent) {
    this.httpFlowLiveStreamReceived += 1
    const eventType = event.Type || ''
    const sequence = Math.max(0, asNumber(event.Sequence))
    const highWaterId = Math.max(0, asNumber(event.HighWaterId))
    this.httpFlowLiveStreamLatestSequence = Math.max(this.httpFlowLiveStreamLatestSequence, sequence)
    this.httpFlowLiveStreamHighWaterId = Math.max(this.httpFlowLiveStreamHighWaterId, highWaterId)

    if (eventType === 'HTTP_FLOW_LIVE_EVENT_TYPE_HEARTBEAT') {
      this.httpFlowLiveStreamHeartbeats += 1
      return
    }
    if (eventType === 'HTTP_FLOW_LIVE_EVENT_TYPE_GAP') {
      this.httpFlowLiveStreamGaps += 1
      this.httpFlowLiveStreamStatus = 'recovering'
      this.recordHTTPFlowLiveGapReason(event.Gap?.Reason)
      return
    }
    if (eventType !== 'HTTP_FLOW_LIVE_EVENT_TYPE_COMMITTED') return

    this.httpFlowLiveStreamCommitted += 1
    if (event.Replayed) this.httpFlowLiveStreamReplayed += 1
    const receivedAtUnixMs = this.nowUnixMs()
    const serverAtUnixMs = asNumber(event.ServerAtUnixMs)
    const committedAtUnixMs = asNumber(event.CommittedAtUnixMs)
    const flowId = Math.max(0, asNumber(event.Flow?.Id))
    appendBounded(
      this.httpFlowLiveStreamSamples,
      {
        sequence,
        id: flowId,
        highWaterId,
        replayed: event.Replayed === true,
        receivedAtUnixMs,
        serverToReceiveMs: positiveDuration(receivedAtUnixMs, serverAtUnixMs),
        committedToReceiveMs: positiveDuration(receivedAtUnixMs, committedAtUnixMs),
      },
      MAX_HTTP_FLOW_LIVE_STREAM_SAMPLES,
    )
    if (flowId > 0 && committedAtUnixMs > 0) {
      this.latestBackendPersistedId = Math.max(this.latestBackendPersistedId, highWaterId, flowId)
      this.pendingFlows.set(flowId, {
        timing: {
          Id: flowId,
          RequestHijackAtUnixMs: asNumber(event.RequestHijackAtUnixMs),
          ResponseMirrorAtUnixMs: asNumber(event.ResponseMirrorAtUnixMs),
          FlowBuiltAtUnixMs: asNumber(event.FlowBuiltAtUnixMs),
          PersistEnqueuedAtUnixMs: asNumber(event.PersistEnqueuedAtUnixMs),
          PersistStartedAtUnixMs: asNumber(event.PersistStartedAtUnixMs),
          PersistedAtUnixMs: committedAtUnixMs,
          DatabaseChangeDetectedAtUnixMs: 0,
          ProjectGeneration: asNumber(event.ProjectGeneration),
        },
      })
      trimMap(this.pendingFlows, MAX_PENDING_FLOWS)
    }
  }

  recordHTTPFlowLiveDirectBatch(rows: number, events: HTTPFlowLiveEvent[] = []) {
    const normalizedRows = Math.max(0, Math.floor(Number(rows) || 0))
    if (normalizedRows) {
      this.httpFlowLiveStreamDirectBatches += 1
      this.httpFlowLiveStreamDirectRows += normalizedRows
      appendBounded(this.httpFlowLiveStreamDirectBatchRows, normalizedRows, MAX_HTTP_FLOW_LIVE_STREAM_SAMPLES)
    }
    this.reconcileFlowCommittedShadowDirect(events, this.nowUnixMs())
  }

  recordHTTPFlowLiveDirectFallback(rows: number) {
    this.httpFlowLiveStreamDirectFallbackRows += Math.max(0, Math.floor(Number(rows) || 0))
  }

  recordHTTPFlowLiveDirectRecovery(required: boolean, highWaterId: number) {
    if (required && !this.httpFlowLiveStreamDirectRecoveryRequired) {
      this.httpFlowLiveStreamDirectRecoveryEntries += 1
    } else if (!required && this.httpFlowLiveStreamDirectRecoveryRequired) {
      this.httpFlowLiveStreamDirectRecoveryCompletions += 1
    }
    this.httpFlowLiveStreamDirectRecoveryRequired = required
    this.httpFlowLiveStreamDirectRecoveryHighWaterId = required ? Math.max(0, asNumber(highWaterId)) : 0
  }

  recordHTTPFlowLiveStreamFault(fault: HTTPFlowLiveStreamFault, reason?: string) {
    switch (fault) {
      case 'invalid-envelope':
        this.httpFlowLiveStreamInvalidEnvelopes += 1
        this.httpFlowLiveStreamStatus = 'recovering'
        break
      case 'invalid-event':
        this.httpFlowLiveStreamInvalidEvents += 1
        this.httpFlowLiveStreamStatus = 'recovering'
        break
      case 'sequence-gap':
        this.httpFlowLiveStreamSequenceGaps += 1
        this.httpFlowLiveStreamStatus = 'recovering'
        break
      case 'duplicate':
        this.httpFlowLiveStreamDuplicates += 1
        break
      case 'out-of-order':
        this.httpFlowLiveStreamOutOfOrder += 1
        break
      case 'unavailable':
        this.httpFlowLiveStreamUnavailable += 1
        this.httpFlowLiveStreamStatus = 'unavailable'
        break
      case 'ended':
        this.httpFlowLiveStreamEnded += 1
        this.httpFlowLiveStreamStatus = 'ended'
        break
    }
    if (reason) this.recordHTTPFlowLiveGapReason(reason)
  }

  recordHTTPFlowLiveStreamStopped() {
    this.httpFlowLiveStreamStatus = 'idle'
  }

  private recordHTTPFlowLiveGapReason(reason?: string) {
    let key = (reason || 'unspecified').trim().slice(0, 80) || 'unspecified'
    if (
      !this.httpFlowLiveStreamGapReasons.has(key) &&
      this.httpFlowLiveStreamGapReasons.size >= MAX_HTTP_FLOW_LIVE_GAP_REASONS
    ) {
      key = 'other'
    }
    this.httpFlowLiveStreamGapReasons.set(key, (this.httpFlowLiveStreamGapReasons.get(key) || 0) + 1)
  }

  recordHTTPFlowCommitted(
    event: HTTPFlowCommittedShadowEvent,
    timestamp: TimingNumber | undefined,
  ): HTTPFlowCommittedSignal | undefined {
    if (!this.flowCommittedShadowEnabled) return
    const version = asNumber(event?.version)
    const id = asNumber(event?.id)
    const projectGeneration = asNumber(event?.project_generation)
    const databaseIdentity = typeof event?.database_identity === 'string' ? event.database_identity : ''
    const committedAtUnixMs = asNumber(event?.committed_at_unix_ms)
    const highWaterId = asNumber(event?.high_water_id)
    if (
      version !== 1 ||
      id <= 0 ||
      projectGeneration <= 0 ||
      !databaseIdentity ||
      committedAtUnixMs <= 0 ||
      highWaterId < id
    ) {
      this.flowCommittedShadowInvalid += 1
      return
    }

    const key = this.flowCommittedShadowKey(databaseIdentity, projectGeneration, id)
    if (this.seenFlowCommittedShadow.has(key)) {
      this.flowCommittedShadowDuplicates += 1
      return
    }
    this.seenFlowCommittedShadow.set(key, true)
    trimMap(this.seenFlowCommittedShadow, MAX_COMMITTED_SHADOW_SAMPLES)

    const projectKey = this.flowCommittedShadowProjectKey(databaseIdentity, projectGeneration)
    const previousId = this.lastFlowCommittedIdByProject.get(projectKey) || 0
    if (previousId > 0 && id < previousId) this.flowCommittedShadowOutOfOrder += 1
    if (id > previousId) this.lastFlowCommittedIdByProject.set(projectKey, id)
    trimMap(this.lastFlowCommittedIdByProject, MAX_COMMITTED_SHADOW_PROJECTS)

    const receivedAtUnixMs = this.nowUnixMs()
    const serverSentAtUnixMs = grpcTimestampToUnixMs(timestamp) || undefined
    const sample: FlowCommittedShadowSample = {
      id,
      projectGeneration,
      databaseIdentity,
      committedAtUnixMs,
      highWaterId,
      serverSentAtUnixMs,
      receivedAtUnixMs,
      deliveryMs: serverSentAtUnixMs ? positiveDuration(receivedAtUnixMs, serverSentAtUnixMs) : undefined,
      committedToReceiveMs: positiveDuration(receivedAtUnixMs, committedAtUnixMs),
    }
    appendBounded(this.flowCommittedShadowSamples, sample, MAX_COMMITTED_SHADOW_SAMPLES)
    const queryObservedAtUnixMs = this.queryObservedFlowCommittedShadow.get(key)
    const directObservedAtUnixMs = this.directObservedFlowCommittedShadow.get(key)
    if (queryObservedAtUnixMs !== undefined) {
      this.completeFlowCommittedShadowSample(sample, queryObservedAtUnixMs)
      this.queryObservedFlowCommittedShadow.delete(key)
      this.directObservedFlowCommittedShadow.delete(key)
      this.flowCommittedQueryRowsWithoutEvent.delete(key)
    } else if (directObservedAtUnixMs !== undefined) {
      this.completeFlowCommittedShadowDirectSample(sample, directObservedAtUnixMs)
      this.directObservedFlowCommittedShadow.delete(key)
    } else {
      this.pendingFlowCommittedShadow.set(key, sample)
      trimMap(this.pendingFlowCommittedShadow, MAX_PENDING_COMMITTED_SHADOW)
    }
    return {
      id,
      projectGeneration,
      databaseIdentity,
      committedAtUnixMs,
      highWaterId,
      serverSentAtUnixMs,
    }
  }

  private flowCommittedShadowProjectKey(databaseIdentity: string, projectGeneration: number) {
    return `${databaseIdentity}:${projectGeneration}`
  }

  private flowCommittedShadowKey(databaseIdentity: string, projectGeneration: number, id: number) {
    return `${this.flowCommittedShadowProjectKey(databaseIdentity, projectGeneration)}:${id}`
  }

  private completeFlowCommittedShadowSample(sample: FlowCommittedShadowSample, queryObservedAtUnixMs: number) {
    if (sample.queryObservedAtUnixMs !== undefined) return
    sample.queryObservedAtUnixMs = queryObservedAtUnixMs
    sample.committedToQueryObservedMs = positiveDuration(queryObservedAtUnixMs, sample.committedAtUnixMs)
    sample.shadowToQueryObservedMs = positiveDuration(queryObservedAtUnixMs, sample.receivedAtUnixMs)
    this.flowCommittedShadowQueryMatches += 1
  }

  private completeFlowCommittedShadowDirectSample(sample: FlowCommittedShadowSample, directObservedAtUnixMs: number) {
    if (sample.directObservedAtUnixMs !== undefined) return
    sample.directObservedAtUnixMs = directObservedAtUnixMs
    sample.committedToDirectObservedMs = positiveDuration(directObservedAtUnixMs, sample.committedAtUnixMs)
    sample.shadowToDirectObservedMs = positiveDuration(directObservedAtUnixMs, sample.receivedAtUnixMs)
    this.flowCommittedShadowDirectMatches += 1
  }

  private reconcileFlowCommittedShadowDirect(events: HTTPFlowLiveEvent[], directObservedAtUnixMs: number) {
    if (!this.flowCommittedShadowEnabled || this.httpFlowLiveStreamMode !== 'canary') return
    for (const event of events) {
      const id = asNumber(event.Flow?.Id)
      const projectGeneration = asNumber(event.ProjectGeneration)
      const databaseIdentity = typeof event.DatabaseIdentity === 'string' ? event.DatabaseIdentity : ''
      if (id <= 0 || projectGeneration <= 0 || !databaseIdentity) continue
      const key = this.flowCommittedShadowKey(databaseIdentity, projectGeneration, id)
      const pending = this.pendingFlowCommittedShadow.get(key)
      if (pending) {
        this.completeFlowCommittedShadowDirectSample(pending, directObservedAtUnixMs)
        this.pendingFlowCommittedShadow.delete(key)
        continue
      }
      if (!this.seenFlowCommittedShadow.has(key)) {
        this.directObservedFlowCommittedShadow.set(key, directObservedAtUnixMs)
        trimMap(this.directObservedFlowCommittedShadow, MAX_PENDING_COMMITTED_SHADOW)
      }
    }
  }

  private reconcileFlowCommittedShadow(
    timing: HTTPFlowSystemTiming[] | undefined,
    flows: HTTPFlow[],
    databaseIdentity: string,
    projectGeneration: number,
    queryObservedAtUnixMs: number,
  ) {
    if (!this.flowCommittedShadowEnabled || !databaseIdentity || projectGeneration <= 0) return

    // SQLite makes the row visible at commit before the writer publishes its
    // runtime timing and FlowCommitted event. Remember every returned ID so an
    // event arriving in that narrow window can still be reconciled.
    for (const flow of flows) {
      const id = asNumber(flow.Id)
      if (id <= 0) continue
      const key = this.flowCommittedShadowKey(databaseIdentity, projectGeneration, id)
      const pending = this.pendingFlowCommittedShadow.get(key)
      if (pending) {
        this.completeFlowCommittedShadowSample(pending, queryObservedAtUnixMs)
        this.pendingFlowCommittedShadow.delete(key)
        this.flowCommittedQueryRowsWithoutEvent.delete(key)
        continue
      }
      if (!this.seenFlowCommittedShadow.has(key)) {
        this.queryObservedFlowCommittedShadow.set(key, queryObservedAtUnixMs)
        trimMap(this.queryObservedFlowCommittedShadow, MAX_PENDING_COMMITTED_SHADOW)
      }
    }

    for (const flowTiming of timing || []) {
      const id = asNumber(flowTiming.Id)
      const persistedAtUnixMs = asNumber(flowTiming.PersistedAtUnixMs)
      const timingGeneration = asNumber(flowTiming.ProjectGeneration) || projectGeneration
      if (id <= 0 || timingGeneration !== projectGeneration) continue
      const key = this.flowCommittedShadowKey(databaseIdentity, projectGeneration, id)
      const pending = this.pendingFlowCommittedShadow.get(key)
      if (pending) {
        this.completeFlowCommittedShadowSample(pending, queryObservedAtUnixMs)
        this.pendingFlowCommittedShadow.delete(key)
        this.flowCommittedQueryRowsWithoutEvent.delete(key)
        continue
      }
      if (
        persistedAtUnixMs >= this.flowCommittedShadowSubscriptionAtUnixMs &&
        this.flowCommittedShadowSubscriptionAtUnixMs > 0 &&
        !this.seenFlowCommittedShadow.has(key)
      ) {
        this.queryObservedFlowCommittedShadow.set(key, queryObservedAtUnixMs)
        trimMap(this.queryObservedFlowCommittedShadow, MAX_PENDING_COMMITTED_SHADOW)
        this.flowCommittedQueryRowsWithoutEvent.set(key, true)
        trimMap(this.flowCommittedQueryRowsWithoutEvent, MAX_PENDING_COMMITTED_SHADOW)
      }
    }
  }

  private reconcileFlowCommittedInitialSnapshot(
    token: MITMQueryToken,
    response: YakQueryHTTPFlowResponse,
    flows: HTTPFlow[],
    databaseIdentity: string,
    projectGeneration: number,
    latestPersistedId: number,
  ) {
    if (
      !this.flowCommittedShadowEnabled ||
      token.liveCycleId !== undefined ||
      asNumber(token.cursorBefore) !== 0 ||
      !databaseIdentity ||
      projectGeneration <= 0 ||
      flows.length === 0
    ) {
      return
    }

    const projectKey = this.flowCommittedShadowProjectKey(databaseIdentity, projectGeneration)
    if (this.flowCommittedShadowInitialSnapshots.has(projectKey)) return
    this.flowCommittedShadowInitialSnapshots.set(projectKey, true)
    trimMap(this.flowCommittedShadowInitialSnapshots, MAX_COMMITTED_SHADOW_PROJECTS)

    const ids = flows.map((flow) => asNumber(flow.Id)).filter((id) => id > 0)
    if (!ids.length || asNumber(response.Total) <= ids.length) return
    const minimumReturnedId = Math.min(...ids)
    const maximumReturnedId = Math.max(...ids)
    // An initial MITM table query intentionally returns the newest viewport.
    // Only classify its omitted prefix when the page reaches the database
    // high-water; otherwise a missing middle/tail remains a true pending event.
    if (latestPersistedId > 0 && maximumReturnedId < latestPersistedId) return

    for (const [key, sample] of this.pendingFlowCommittedShadow) {
      if (
        sample.databaseIdentity !== databaseIdentity ||
        sample.projectGeneration !== projectGeneration ||
        sample.id >= minimumReturnedId
      ) {
        continue
      }
      sample.initialSnapshotOmitted = true
      this.pendingFlowCommittedShadow.delete(key)
      this.flowCommittedShadowInitialSnapshotOmitted += 1
    }
  }

  recordLiveTrigger(source: MITMLiveTriggerSource, serverSentAtUnixMs?: number) {
    const receivedAtUnixMs = this.nowUnixMs()
    const receivedAtPerformanceMs = this.nowPerformanceMs()
    if (this.pendingLiveTrigger) {
      this.pendingLiveTrigger.count += 1
      this.pendingLiveTrigger.lastReceivedAtUnixMs = receivedAtUnixMs
      if (!this.pendingLiveTrigger.serverSentAtUnixMs && serverSentAtUnixMs) {
        this.pendingLiveTrigger.serverSentAtUnixMs = serverSentAtUnixMs
      }
      return
    }

    this.triggerSequence += 1
    this.pendingLiveTrigger = {
      id: this.triggerSequence,
      source,
      count: 1,
      serverSentAtUnixMs,
      firstReceivedAtUnixMs: receivedAtUnixMs,
      firstReceivedAtPerformanceMs: receivedAtPerformanceMs,
      lastReceivedAtUnixMs: receivedAtUnixMs,
    }
  }

  beginLiveCycle(
    cursorBefore: number,
    requestedRows: number,
    fallbackSource: MITMLiveTriggerSource = 'poll',
  ): MITMLiveCycleToken {
    const startedAtUnixMs = this.nowUnixMs()
    const startedAtPerformanceMs = this.nowPerformanceMs()
    const trigger = this.pendingLiveTrigger
    this.pendingLiveTrigger = undefined
    this.liveSequence += 1

    const previousCycle = this.liveCycles[this.liveCycles.length - 1]
    if (previousCycle?.completedAtPerformanceMs !== undefined) {
      previousCycle.nextQueryDelayMs = Math.max(0, startedAtPerformanceMs - previousCycle.completedAtPerformanceMs)
    }

    const normalizedCursor = Number.isFinite(cursorBefore) ? Math.max(0, cursorBefore) : 0
    const backendHighWaterBefore = this.latestBackendPersistedId
    const visibleHighWaterBefore = this.latestVisibleId
    appendBounded(
      this.liveCycles,
      {
        id: this.liveSequence,
        triggerId: trigger?.id,
        triggerSource: trigger?.source || fallbackSource,
        coalescedTriggers: trigger?.count || 0,
        triggerReceivedAtUnixMs: trigger?.firstReceivedAtUnixMs,
        triggerServerSentAtUnixMs: trigger?.serverSentAtUnixMs,
        startedAtUnixMs,
        startedAtPerformanceMs,
        cursorBefore: normalizedCursor,
        cursorAfter: normalizedCursor,
        requestedRows: Math.max(0, requestedRows),
        returnedRows: 0,
        queryCount: 0,
        failed: false,
        backendHighWaterBefore,
        backendHighWaterAfter: backendHighWaterBefore,
        visibleHighWaterBefore,
        approximateBacklogBefore: Math.max(0, backendHighWaterBefore - visibleHighWaterBefore),
        triggerToQueryStartMs: trigger
          ? Math.max(0, startedAtPerformanceMs - trigger.firstReceivedAtPerformanceMs)
          : undefined,
        requestPacketBytes: 0,
        responsePacketBytes: 0,
        declaredRequestBytes: 0,
        declaredResponseBodyBytes: 0,
        visibleCandidateIds: [],
      },
      MAX_LIVE_CYCLES,
    )
    return { id: this.liveSequence }
  }

  beginQuery(context: { liveCycleId?: number; cursorBefore?: number; requestedRows?: number } = {}): MITMQueryToken {
    this.sequence += 1
    const token = {
      id: this.sequence,
      epoch: this.observationEpoch,
      startedAtUnixMs: this.nowUnixMs(),
      startedAtPerformanceMs: this.nowPerformanceMs(),
      liveCycleId: context.liveCycleId,
      cursorBefore: context.cursorBefore,
      requestedRows: context.requestedRows,
    }
    this.activeQueries.add(token.id)
    return token
  }

  completeQuery(token: MITMQueryToken, response: YakQueryHTTPFlowResponse) {
    if (token.epoch !== this.observationEpoch) return
    this.activeQueries.delete(token.id)
    const timing = response.SystemTiming
    const responseIdentity = timing?.DatabaseIdentity
    const responseGeneration = asNumber(timing?.ProjectGeneration)
    const backendObservationAtUnixMs = timing ? asNumber(timing.ServerReceivedAtUnixMs) : 0
    const updatesBackendState =
      !!timing &&
      (backendObservationAtUnixMs > this.latestBackendObservationAtUnixMs ||
        (backendObservationAtUnixMs === this.latestBackendObservationAtUnixMs &&
          token.id >= this.latestBackendObservationQueryId))
    const responseProjectChanged =
      !!responseIdentity &&
      !!this.databaseIdentity &&
      (responseIdentity !== this.databaseIdentity ||
        (responseGeneration > 0 && this.projectGeneration > 0 && responseGeneration !== this.projectGeneration))
    if (updatesBackendState && responseProjectChanged) {
      // IDs are database-local. Never mix project samples or calculate a
      // cross-project backlog after the user switches project.
      this.resetPipelineState()
    }
    if (!updatesBackendState && responseProjectChanged) {
      // A slow query from the previous project completed after a newer one.
      // Ignore it rather than contaminating the active project's distributions.
      return
    }

    const responseAtPerformanceMs = this.nowPerformanceMs()
    const responseAtUnixMs = this.nowUnixMs()
    const mainTiming = response.YakitMainProcessTiming
    const latestPersistedId = timing ? asNumber(timing.LatestPersistedId) : 0
    const latestDetectedId = timing ? asNumber(timing.LatestDetectedId) : 0
    const hasBackendQueryBreakdown =
      !!timing &&
      (timing.CountExecuted === true ||
        asNumber(timing.CountDurationUs) > 0 ||
        asNumber(timing.DataQueryDurationUs) > 0)
    const returnedFlows = response.Data || []
    const flowBytes = sumFlowBytes(returnedFlows)
    this.reconcileFlowCommittedShadow(
      timing?.FlowTimings,
      returnedFlows,
      responseIdentity || '',
      responseGeneration,
      responseAtUnixMs,
    )
    this.reconcileFlowCommittedInitialSnapshot(
      token,
      response,
      returnedFlows,
      responseIdentity || '',
      responseGeneration,
      latestPersistedId,
    )
    const sample: QuerySample = {
      id: token.id,
      startedAtUnixMs: token.startedAtUnixMs,
      liveCycleId: token.liveCycleId,
      cursorBefore: token.cursorBefore,
      requestedRows: token.requestedRows,
      rows: returnedFlows.length,
      failed: false,
      rendererRoundTripMs: Math.max(0, responseAtPerformanceMs - token.startedAtPerformanceMs),
      rendererToMainMs: mainTiming
        ? positiveDuration(mainTiming.MainReceivedAtUnixMs, token.startedAtUnixMs)
        : undefined,
      mainDispatchMs: mainTiming
        ? positiveDuration(mainTiming.GRPCStartedAtUnixMs, mainTiming.MainReceivedAtUnixMs)
        : undefined,
      backendQueryMs: timing ? asNumber(timing.QueryDurationUs) / 1000 : undefined,
      backendCountMs:
        hasBackendQueryBreakdown && timing.CountExecuted ? asNumber(timing.CountDurationUs) / 1000 : undefined,
      backendDataQueryMs: hasBackendQueryBreakdown ? asNumber(timing.DataQueryDurationUs) / 1000 : undefined,
      countExecuted: hasBackendQueryBreakdown ? timing.CountExecuted === true : undefined,
      backendConversionMs: timing ? asNumber(timing.ConversionDurationUs) / 1000 : undefined,
      backendServerTotalMs: timing
        ? positiveDuration(asNumber(timing.ResponseReadyAtUnixMs), asNumber(timing.ServerReceivedAtUnixMs))
        : undefined,
      mainGrpcMs: mainTiming ? mainTiming.GRPCElapsedUs / 1000 : undefined,
      mainToBackendMs:
        mainTiming && timing
          ? positiveDuration(asNumber(timing.ServerReceivedAtUnixMs), mainTiming.GRPCStartedAtUnixMs)
          : undefined,
      backendToMainMs:
        mainTiming && timing
          ? positiveDuration(mainTiming.GRPCFinishedAtUnixMs, asNumber(timing.ResponseReadyAtUnixMs))
          : undefined,
      mainToRendererMs: mainTiming ? positiveDuration(responseAtUnixMs, mainTiming.GRPCFinishedAtUnixMs) : undefined,
      queueDepth: timing ? asNumber(timing.AsyncWriteQueueDepth) : undefined,
      highWaterDetectionMs:
        timing && latestPersistedId > 0 && latestPersistedId === latestDetectedId
          ? positiveDuration(asNumber(timing.LatestDetectedAtUnixMs), asNumber(timing.LatestPersistedAtUnixMs))
          : undefined,
      ...flowBytes,
    }
    appendBounded(this.querySamples, sample, MAX_QUERY_SAMPLES)

    const visibleCandidateIds = returnedFlows
      .slice(0, MAX_QUERY_VISIBLE_IDS)
      .map((flow) => Number(flow.Id))
      .filter((id) => Number.isFinite(id) && id > 0)
    if (visibleCandidateIds.length) {
      this.pendingQueries.set(token.id, { sample, responseAtPerformanceMs, visibleCandidateIds })
      trimMap(this.pendingQueries, MAX_PENDING_QUERIES)
    }

    const liveCycle =
      token.liveCycleId === undefined ? undefined : this.liveCycles.find((cycle) => cycle.id === token.liveCycleId)
    if (liveCycle) {
      liveCycle.queryCount += 1
      liveCycle.returnedRows += returnedFlows.length
      liveCycle.requestPacketBytes += flowBytes.requestPacketBytes
      liveCycle.responsePacketBytes += flowBytes.responsePacketBytes
      liveCycle.declaredRequestBytes += flowBytes.declaredRequestBytes
      liveCycle.declaredResponseBodyBytes += flowBytes.declaredResponseBodyBytes
      const lastId = Number(returnedFlows[returnedFlows.length - 1]?.Id)
      if (Number.isFinite(lastId) && lastId > liveCycle.cursorAfter) liveCycle.cursorAfter = lastId
    }

    if (!timing) return
    if (updatesBackendState) {
      this.databaseIdentity = responseIdentity || this.databaseIdentity
      this.projectGeneration = responseGeneration || this.projectGeneration
      if (latestPersistedId < this.latestQueryPersistedId) {
        // The same database may be cleared and recreated, resetting SQLite IDs.
        this.latestVisibleId = 0
        this.pendingFlows.clear()
        this.pendingQueries.clear()
        this.latestBackendPersistedId = latestPersistedId
      } else {
        // The live stream can legitimately be ahead of an earlier query. Do
        // not treat that query lag as a database reset.
        this.latestBackendPersistedId = Math.max(this.latestBackendPersistedId, latestPersistedId)
      }
      this.latestQueryPersistedId = latestPersistedId
      this.latestBackendDetectedId = latestDetectedId
      this.latestQueueDepth = asNumber(timing.AsyncWriteQueueDepth)
      this.latestQueueCapacity = asNumber(timing.AsyncWriteQueueCapacity)
      this.latestBackendObservationAtUnixMs = backendObservationAtUnixMs
      this.latestBackendObservationQueryId = token.id
    }
    for (const flowTiming of timing.FlowTimings || []) {
      const id = asNumber(flowTiming.Id)
      if (id <= 0) continue
      this.pendingFlows.set(id, { timing: flowTiming })
    }
    trimMap(this.pendingFlows, MAX_PENDING_FLOWS)
    if (liveCycle) liveCycle.backendHighWaterAfter = Math.max(liveCycle.backendHighWaterAfter, latestPersistedId)
  }

  failQuery(token: MITMQueryToken) {
    if (token.epoch !== this.observationEpoch) return
    this.activeQueries.delete(token.id)
    appendBounded(
      this.querySamples,
      {
        id: token.id,
        startedAtUnixMs: token.startedAtUnixMs,
        liveCycleId: token.liveCycleId,
        cursorBefore: token.cursorBefore,
        requestedRows: token.requestedRows,
        rows: 0,
        failed: true,
        rendererRoundTripMs: Math.max(0, this.nowPerformanceMs() - token.startedAtPerformanceMs),
        requestPacketBytes: 0,
        responsePacketBytes: 0,
        declaredRequestBytes: 0,
        declaredResponseBodyBytes: 0,
      },
      MAX_QUERY_SAMPLES,
    )
    if (token.liveCycleId !== undefined) {
      const liveCycle = this.liveCycles.find((cycle) => cycle.id === token.liveCycleId)
      if (liveCycle) {
        liveCycle.queryCount += 1
        liveCycle.failed = true
      }
    }
  }

  recordDuplexNotification(timestamp: TimingNumber | undefined, options: { recordLiveTrigger?: boolean } = {}) {
    const sentAtUnixMs = grpcTimestampToUnixMs(timestamp)
    const elapsed = positiveDuration(this.nowUnixMs(), sentAtUnixMs)
    if (elapsed !== undefined) appendBounded(this.duplexDeliverySamples, elapsed, MAX_DUPLEX_SAMPLES)
    if (options.recordLiveTrigger !== false) this.recordLiveTrigger('duplex', sentAtUnixMs || undefined)
    return sentAtUnixMs || undefined
  }

  completeLiveCycle(
    token: MITMLiveCycleToken,
    flows: Pick<HTTPFlow, 'Id'>[],
    outcome: { hasMore?: boolean; stopReason?: string; payloadBytes?: number } = {},
  ) {
    const cycle = this.liveCycles.find((sample) => sample.id === token.id)
    if (!cycle) return
    const completedAtUnixMs = this.nowUnixMs()
    const completedAtPerformanceMs = this.nowPerformanceMs()
    cycle.completedAtUnixMs = completedAtUnixMs
    cycle.completedAtPerformanceMs = completedAtPerformanceMs
    cycle.queryExecutionMs = Math.max(0, completedAtPerformanceMs - cycle.startedAtPerformanceMs)
    cycle.backendHighWaterAfter = Math.max(cycle.backendHighWaterAfter, this.latestBackendPersistedId)
    cycle.approximateBacklogAfterQuery = Math.max(0, cycle.backendHighWaterAfter - cycle.cursorAfter)
    cycle.hasMore = outcome.hasMore
    cycle.stopReason = outcome.stopReason
    cycle.estimatedPayloadBytes = outcome.payloadBytes
    const candidateFlows = [...flows.slice(0, MAX_QUERY_VISIBLE_IDS / 2), ...flows.slice(-MAX_QUERY_VISIBLE_IDS / 2)]
    cycle.visibleCandidateIds = candidateFlows
      .map((flow) => Number(flow.Id))
      .filter((id) => Number.isFinite(id) && id > 0)
  }

  failLiveCycle(token: MITMLiveCycleToken) {
    const cycle = this.liveCycles.find((sample) => sample.id === token.id)
    if (!cycle) return
    cycle.failed = true
    cycle.completedAtUnixMs = this.nowUnixMs()
    cycle.completedAtPerformanceMs = this.nowPerformanceMs()
    cycle.queryExecutionMs = Math.max(0, cycle.completedAtPerformanceMs - cycle.startedAtPerformanceMs)
  }

  markVisible(flows: Pick<HTTPFlow, 'Id'>[]) {
    const committedAtUnixMs = this.nowUnixMs()
    const committedAtPerformanceMs = this.nowPerformanceMs()
    const visibleIds = new Set<number>()
    for (const flow of flows) {
      const id = Number(flow.Id)
      if (!Number.isFinite(id) || id <= 0) continue
      visibleIds.add(id)
      if (id > this.latestVisibleId) this.latestVisibleId = id

      const pending = this.pendingFlows.get(id)
      if (!pending) continue
      const timing = pending.timing
      const requestAt = asNumber(timing.RequestHijackAtUnixMs)
      const responseAt = asNumber(timing.ResponseMirrorAtUnixMs)
      const flowBuiltAt = asNumber(timing.FlowBuiltAtUnixMs)
      const enqueuedAt = asNumber(timing.PersistEnqueuedAtUnixMs)
      const persistStartedAt = asNumber(timing.PersistStartedAtUnixMs)
      const persistedAt = asNumber(timing.PersistedAtUnixMs)
      const databaseChangeDetectedAt = asNumber(timing.DatabaseChangeDetectedAtUnixMs)
      appendBounded(
        this.flowSamples,
        {
          id,
          requestToReactCommitMs: positiveDuration(committedAtUnixMs, requestAt),
          responseToReactCommitMs: positiveDuration(committedAtUnixMs, responseAt),
          flowBuildToReactCommitMs: positiveDuration(committedAtUnixMs, flowBuiltAt),
          persistQueueWaitMs: positiveDuration(persistStartedAt, enqueuedAt),
          persistWriteMs: positiveDuration(persistedAt, persistStartedAt),
          databaseChangeDetectionMs: positiveDuration(databaseChangeDetectedAt, persistedAt),
          persistToReactCommitMs: positiveDuration(committedAtUnixMs, persistedAt),
        },
        MAX_FLOW_SAMPLES,
      )
      this.pendingFlows.delete(id)
    }

    for (const [queryId, pending] of this.pendingQueries) {
      if (!pending.visibleCandidateIds.some((id) => visibleIds.has(id))) continue
      pending.sample.responseToReactCommitMs = Math.max(0, committedAtPerformanceMs - pending.responseAtPerformanceMs)
      this.pendingQueries.delete(queryId)
    }

    for (const cycle of this.liveCycles) {
      if (cycle.committedAtUnixMs || !cycle.completedAtPerformanceMs || !cycle.visibleCandidateIds.length) continue
      if (!cycle.visibleCandidateIds.some((id) => visibleIds.has(id))) continue
      cycle.committedAtUnixMs = committedAtUnixMs
      cycle.visibleHighWaterAfter = this.latestVisibleId
      cycle.approximateBacklogAfterCommit = Math.max(0, cycle.backendHighWaterAfter - this.latestVisibleId)
      cycle.queryCompleteToReactCommitMs = Math.max(0, committedAtPerformanceMs - cycle.completedAtPerformanceMs)
      cycle.triggerToReactCommitMs =
        cycle.triggerReceivedAtUnixMs === undefined
          ? undefined
          : Math.max(0, committedAtUnixMs - cycle.triggerReceivedAtUnixMs)
    }
  }

  private resetPipelineState() {
    this.querySamples = []
    this.flowSamples = []
    this.duplexDeliverySamples = []
    this.liveCycles = []
    this.pendingLiveTrigger = undefined
    this.pendingFlows.clear()
    this.pendingQueries.clear()
    this.latestBackendPersistedId = 0
    this.latestQueryPersistedId = 0
    this.latestBackendDetectedId = 0
    this.latestVisibleId = 0
    this.latestQueueDepth = 0
    this.latestQueueCapacity = 0
    this.latestBackendObservationAtUnixMs = 0
    this.latestBackendObservationQueryId = 0
    this.databaseIdentity = ''
    this.projectGeneration = 0
  }

  reset() {
    this.observationEpoch += 1
    this.activeQueries.clear()
    this.resetPipelineState()
    this.flowCommittedShadowSamples = []
    this.pendingFlowCommittedShadow.clear()
    this.seenFlowCommittedShadow.clear()
    this.queryObservedFlowCommittedShadow.clear()
    this.directObservedFlowCommittedShadow.clear()
    this.lastFlowCommittedIdByProject.clear()
    this.flowCommittedQueryRowsWithoutEvent.clear()
    this.flowCommittedShadowInvalid = 0
    this.flowCommittedShadowDuplicates = 0
    this.flowCommittedShadowOutOfOrder = 0
    this.flowCommittedShadowQueryMatches = 0
    this.flowCommittedShadowDirectMatches = 0
    this.flowCommittedShadowInitialSnapshotOmitted = 0
    this.flowCommittedShadowInitialSnapshots.clear()
    this.flowCommittedShadowSubscriptionAtUnixMs = this.flowCommittedShadowEnabled ? this.nowUnixMs() : 0
    this.httpFlowLiveStreamStatus = 'idle'
    this.httpFlowLiveStreamDatabaseIdentity = ''
    this.httpFlowLiveStreamProjectGeneration = 0
    this.httpFlowLiveStreamSubscriptions = 0
    this.httpFlowLiveStreamReceived = 0
    this.httpFlowLiveStreamCommitted = 0
    this.httpFlowLiveStreamHeartbeats = 0
    this.httpFlowLiveStreamGaps = 0
    this.httpFlowLiveStreamReplayed = 0
    this.httpFlowLiveStreamInvalidEnvelopes = 0
    this.httpFlowLiveStreamInvalidEvents = 0
    this.httpFlowLiveStreamSequenceGaps = 0
    this.httpFlowLiveStreamDuplicates = 0
    this.httpFlowLiveStreamOutOfOrder = 0
    this.httpFlowLiveStreamUnavailable = 0
    this.httpFlowLiveStreamEnded = 0
    this.httpFlowLiveStreamLatestSequence = 0
    this.httpFlowLiveStreamHighWaterId = 0
    this.httpFlowLiveStreamDirectBatches = 0
    this.httpFlowLiveStreamDirectRows = 0
    this.httpFlowLiveStreamDirectFallbackRows = 0
    this.httpFlowLiveStreamDirectRecoveryRequired = false
    this.httpFlowLiveStreamDirectRecoveryHighWaterId = 0
    this.httpFlowLiveStreamDirectRecoveryEntries = 0
    this.httpFlowLiveStreamDirectRecoveryCompletions = 0
    this.httpFlowLiveStreamDirectBatchRows = []
    this.httpFlowLiveStreamGapReasons.clear()
    this.httpFlowLiveStreamSamples = []
  }

  resetIfIdle() {
    if (this.activeQueries.size > 0 || this.pendingQueries.size > 0) return false
    this.reset()
    return true
  }

  pipelineSnapshot() {
    const approximateIdBacklog = Math.max(0, this.latestBackendPersistedId - this.latestVisibleId)
    const streamVisibleIdBacklog = Math.max(0, this.httpFlowLiveStreamHighWaterId - this.latestVisibleId)
    return {
      version: 1,
      generatedAtUnixMs: this.nowUnixMs(),
      state: {
        databaseIdentity: this.databaseIdentity,
        projectGeneration: this.projectGeneration,
        latestBackendPersistedId: this.latestBackendPersistedId,
        latestBackendDetectedId: this.latestBackendDetectedId,
        latestVisibleId: this.latestVisibleId,
        approximateIdBacklog,
        streamVisibleIdBacklog,
        asyncWriteQueueDepth: this.latestQueueDepth,
        asyncWriteQueueCapacity: this.latestQueueCapacity,
        asyncWriteQueueUtilization:
          this.latestQueueCapacity > 0 ? this.latestQueueDepth / this.latestQueueCapacity : undefined,
        pendingQueries: this.pendingQueries.size,
        activeQueries: this.activeQueries.size,
        pendingFlows: this.pendingFlows.size,
        pendingLiveTriggers: this.pendingLiveTrigger?.count || 0,
        pendingFlowCommittedShadow: this.pendingFlowCommittedShadow.size,
        initialSnapshotOmittedFlowCommittedShadow: this.flowCommittedShadowInitialSnapshotOmitted,
        querySamples: this.querySamples.length,
        flowSamples: this.flowSamples.length,
        liveCycles: this.liveCycles.length,
      },
      httpFlowLiveStream: {
        mode: this.httpFlowLiveStreamMode,
        status: this.httpFlowLiveStreamStatus,
        subscriptions: this.httpFlowLiveStreamSubscriptions,
        received: this.httpFlowLiveStreamReceived,
        committed: this.httpFlowLiveStreamCommitted,
        heartbeats: this.httpFlowLiveStreamHeartbeats,
        gaps: this.httpFlowLiveStreamGaps,
        replayed: this.httpFlowLiveStreamReplayed,
        invalidEnvelopes: this.httpFlowLiveStreamInvalidEnvelopes,
        invalidEvents: this.httpFlowLiveStreamInvalidEvents,
        sequenceGaps: this.httpFlowLiveStreamSequenceGaps,
        duplicates: this.httpFlowLiveStreamDuplicates,
        outOfOrder: this.httpFlowLiveStreamOutOfOrder,
        unavailable: this.httpFlowLiveStreamUnavailable,
        ended: this.httpFlowLiveStreamEnded,
        latestSequence: this.httpFlowLiveStreamLatestSequence,
        highWaterId: this.httpFlowLiveStreamHighWaterId,
        directBatches: this.httpFlowLiveStreamDirectBatches,
        directRows: this.httpFlowLiveStreamDirectRows,
        directFallbackRows: this.httpFlowLiveStreamDirectFallbackRows,
        directRecoveryRequired: this.httpFlowLiveStreamDirectRecoveryRequired,
        directRecoveryHighWaterId: this.httpFlowLiveStreamDirectRecoveryHighWaterId,
        directRecoveryEntries: this.httpFlowLiveStreamDirectRecoveryEntries,
        directRecoveryCompletions: this.httpFlowLiveStreamDirectRecoveryCompletions,
      },
    }
  }

  snapshot() {
    const pipeline = this.pipelineSnapshot()
    const queryStartedAt = this.querySamples.map((sample) => sample.startedAtUnixMs)
    const queryWindowMs = queryStartedAt.length ? Math.max(...queryStartedAt) - Math.min(...queryStartedAt) : 0
    const queryRatePerSecond =
      this.querySamples.length > 1 && queryWindowMs > 0
        ? ((this.querySamples.length - 1) * 1000) / queryWindowMs
        : undefined
    const queryPhaseSamples = this.querySamples.filter((sample) => sample.countExecuted !== undefined)
    const countExecutions = queryPhaseSamples.filter((sample) => sample.countExecuted).length
    return {
      version: 5,
      generatedAtUnixMs: pipeline.generatedAtUnixMs,
      config: {
        backendSystemTimingEnabled: this.backendSystemTimingEnabled,
        skipLiveExactTotalEnabled: this.skipLiveExactTotalEnabled,
        flowCommittedShadowEnabled: this.flowCommittedShadowEnabled,
        flowCommittedMode: this.flowCommittedMode,
        httpFlowLiveStreamMode: this.httpFlowLiveStreamMode,
        httpFlowLiveRefreshMinIntervalMs: HTTP_FLOW_LIVE_REFRESH_MIN_INTERVAL_MS,
        httpFlowLiveDirectMinIntervalMs: HTTP_FLOW_LIVE_DIRECT_MIN_INTERVAL_MS,
        httpFlowLiveDirectSustainedIntervalMs: HTTP_FLOW_LIVE_DIRECT_SUSTAINED_INTERVAL_MS,
        httpFlowLiveDirectSustainedPendingRows: HTTP_FLOW_LIVE_DIRECT_SUSTAINED_PENDING_ROWS,
        mitmFlowTableOverscan: MITM_FLOW_TABLE_OVERSCAN,
      },
      bounds: {
        querySamples: MAX_QUERY_SAMPLES,
        flowSamples: MAX_FLOW_SAMPLES,
        duplexSamples: MAX_DUPLEX_SAMPLES,
        pendingQueries: MAX_PENDING_QUERIES,
        pendingFlows: MAX_PENDING_FLOWS,
        liveCycles: MAX_LIVE_CYCLES,
        reportedQuerySamples: MAX_REPORTED_QUERY_SAMPLES,
        flowCommittedShadowSamples: MAX_COMMITTED_SHADOW_SAMPLES,
        reportedFlowCommittedShadowSamples: MAX_REPORTED_COMMITTED_SHADOW_SAMPLES,
        pendingFlowCommittedShadow: MAX_PENDING_COMMITTED_SHADOW,
        httpFlowLiveStreamSamples: MAX_HTTP_FLOW_LIVE_STREAM_SAMPLES,
        reportedHTTPFlowLiveStreamSamples: MAX_REPORTED_HTTP_FLOW_LIVE_STREAM_SAMPLES,
        httpFlowLiveGapReasons: MAX_HTTP_FLOW_LIVE_GAP_REASONS,
      },
      state: pipeline.state,
      query: {
        count: this.querySamples.length,
        failures: this.querySamples.filter((sample) => sample.failed).length,
        sampleWindowMs: queryWindowMs,
        ratePerSecond: queryRatePerSecond,
        rows: distribution(this.querySamples.map((sample) => sample.rows)),
        rendererRoundTripMs: distribution(this.querySamples.map((sample) => sample.rendererRoundTripMs)),
        rendererToMainMs: distribution(this.querySamples.map((sample) => sample.rendererToMainMs)),
        mainDispatchMs: distribution(this.querySamples.map((sample) => sample.mainDispatchMs)),
        backendQueryMs: distribution(this.querySamples.map((sample) => sample.backendQueryMs)),
        backendCountMs: distribution(this.querySamples.map((sample) => sample.backendCountMs)),
        backendDataQueryMs: distribution(this.querySamples.map((sample) => sample.backendDataQueryMs)),
        countExecutions,
        countExecutionSamples: queryPhaseSamples.length,
        countExecutionRatio: queryPhaseSamples.length > 0 ? countExecutions / queryPhaseSamples.length : undefined,
        recentSamples: this.querySamples.slice(-MAX_REPORTED_QUERY_SAMPLES),
        backendConversionMs: distribution(this.querySamples.map((sample) => sample.backendConversionMs)),
        backendConversionUsPerFlow: distribution(
          this.querySamples.map((sample) =>
            sample.rows > 0 && sample.backendConversionMs !== undefined
              ? (sample.backendConversionMs * 1000) / sample.rows
              : undefined,
          ),
        ),
        backendServerTotalMs: distribution(this.querySamples.map((sample) => sample.backendServerTotalMs)),
        mainGrpcMs: distribution(this.querySamples.map((sample) => sample.mainGrpcMs)),
        mainToBackendMs: distribution(this.querySamples.map((sample) => sample.mainToBackendMs)),
        backendToMainMs: distribution(this.querySamples.map((sample) => sample.backendToMainMs)),
        mainToRendererMs: distribution(this.querySamples.map((sample) => sample.mainToRendererMs)),
        asyncWriteQueueDepth: distribution(this.querySamples.map((sample) => sample.queueDepth)),
        highWaterDetectionMs: distribution(this.querySamples.map((sample) => sample.highWaterDetectionMs)),
        responseToReactCommitMs: distribution(this.querySamples.map((sample) => sample.responseToReactCommitMs)),
        requestPacketBytes: distribution(this.querySamples.map((sample) => sample.requestPacketBytes)),
        responsePacketBytes: distribution(this.querySamples.map((sample) => sample.responsePacketBytes)),
        declaredRequestBytes: distribution(this.querySamples.map((sample) => sample.declaredRequestBytes)),
        declaredResponseBodyBytes: distribution(this.querySamples.map((sample) => sample.declaredResponseBodyBytes)),
      },
      flow: {
        count: this.flowSamples.length,
        requestToReactCommitMs: distribution(this.flowSamples.map((sample) => sample.requestToReactCommitMs)),
        responseToReactCommitMs: distribution(this.flowSamples.map((sample) => sample.responseToReactCommitMs)),
        flowBuildToReactCommitMs: distribution(this.flowSamples.map((sample) => sample.flowBuildToReactCommitMs)),
        persistQueueWaitMs: distribution(this.flowSamples.map((sample) => sample.persistQueueWaitMs)),
        persistWriteMs: distribution(this.flowSamples.map((sample) => sample.persistWriteMs)),
        databaseChangeDetectionMs: distribution(this.flowSamples.map((sample) => sample.databaseChangeDetectionMs)),
        persistToReactCommitMs: distribution(this.flowSamples.map((sample) => sample.persistToReactCommitMs)),
      },
      duplex: {
        deliveryMs: distribution(this.duplexDeliverySamples),
      },
      flowCommittedShadow: {
        enabled: this.flowCommittedShadowEnabled,
        mode: this.flowCommittedMode,
        subscriptionAtUnixMs: this.flowCommittedShadowSubscriptionAtUnixMs,
        received: this.flowCommittedShadowSamples.length,
        invalid: this.flowCommittedShadowInvalid,
        duplicates: this.flowCommittedShadowDuplicates,
        outOfOrder: this.flowCommittedShadowOutOfOrder,
        queryMatches: this.flowCommittedShadowQueryMatches,
        directMatches: this.flowCommittedShadowDirectMatches,
        initialSnapshotOmitted: this.flowCommittedShadowInitialSnapshotOmitted,
        queryRowsWithoutEvent: this.flowCommittedQueryRowsWithoutEvent.size,
        directRowsWithoutEvent: this.directObservedFlowCommittedShadow.size,
        pending: this.pendingFlowCommittedShadow.size,
        deliveryMs: distribution(this.flowCommittedShadowSamples.map((sample) => sample.deliveryMs)),
        committedToReceiveMs: distribution(
          this.flowCommittedShadowSamples.map((sample) => sample.committedToReceiveMs),
        ),
        committedToQueryObservedMs: distribution(
          this.flowCommittedShadowSamples.map((sample) => sample.committedToQueryObservedMs),
        ),
        shadowToQueryObservedMs: distribution(
          this.flowCommittedShadowSamples.map((sample) => sample.shadowToQueryObservedMs),
        ),
        committedToDirectObservedMs: distribution(
          this.flowCommittedShadowSamples.map((sample) => sample.committedToDirectObservedMs),
        ),
        shadowToDirectObservedMs: distribution(
          this.flowCommittedShadowSamples.map((sample) => sample.shadowToDirectObservedMs),
        ),
        recentSamples: this.flowCommittedShadowSamples.slice(-MAX_REPORTED_COMMITTED_SHADOW_SAMPLES),
      },
      httpFlowLiveStream: {
        ...pipeline.httpFlowLiveStream,
        databaseIdentity: this.httpFlowLiveStreamDatabaseIdentity,
        projectGeneration: this.httpFlowLiveStreamProjectGeneration,
        gapReasons: Object.fromEntries(this.httpFlowLiveStreamGapReasons),
        serverToReceiveMs: distribution(this.httpFlowLiveStreamSamples.map((sample) => sample.serverToReceiveMs)),
        committedToReceiveMs: distribution(this.httpFlowLiveStreamSamples.map((sample) => sample.committedToReceiveMs)),
        directBatchRows: distribution(this.httpFlowLiveStreamDirectBatchRows),
        recentSamples: this.httpFlowLiveStreamSamples.slice(-MAX_REPORTED_HTTP_FLOW_LIVE_STREAM_SAMPLES),
      },
      live: {
        count: this.liveCycles.length,
        failures: this.liveCycles.filter((cycle) => cycle.failed).length,
        triggerToQueryStartMs: distribution(this.liveCycles.map((cycle) => cycle.triggerToQueryStartMs)),
        queryExecutionMs: distribution(this.liveCycles.map((cycle) => cycle.queryExecutionMs)),
        queryCompleteToReactCommitMs: distribution(this.liveCycles.map((cycle) => cycle.queryCompleteToReactCommitMs)),
        triggerToReactCommitMs: distribution(this.liveCycles.map((cycle) => cycle.triggerToReactCommitMs)),
        nextQueryDelayMs: distribution(this.liveCycles.map((cycle) => cycle.nextQueryDelayMs)),
        queriesPerCycle: distribution(this.liveCycles.map((cycle) => cycle.queryCount)),
        rowsPerCycle: distribution(this.liveCycles.map((cycle) => cycle.returnedRows)),
        requestPacketBytes: distribution(this.liveCycles.map((cycle) => cycle.requestPacketBytes)),
        responsePacketBytes: distribution(this.liveCycles.map((cycle) => cycle.responsePacketBytes)),
        declaredRequestBytes: distribution(this.liveCycles.map((cycle) => cycle.declaredRequestBytes)),
        declaredResponseBodyBytes: distribution(this.liveCycles.map((cycle) => cycle.declaredResponseBodyBytes)),
        maxApproximateBacklog: Math.max(
          0,
          ...this.liveCycles.flatMap((cycle) => [
            cycle.approximateBacklogBefore,
            cycle.approximateBacklogAfterQuery || 0,
            cycle.approximateBacklogAfterCommit || 0,
          ]),
        ),
        timeline: this.liveCycles.map(
          ({ startedAtPerformanceMs, completedAtPerformanceMs, visibleCandidateIds, ...cycle }) => cycle,
        ),
      },
    }
  }
}

export const mitmFlowObservability = new MITMFlowObservability()

declare global {
  interface Window {
    __YAKIT_MITM_FLOW_OBSERVABILITY__?: {
      snapshot: () => ReturnType<MITMFlowObservability['snapshot']>
      pipelineSnapshot: () => ReturnType<MITMFlowObservability['pipelineSnapshot']>
      reset: () => void
      resetIfIdle: () => boolean
      setBackendSystemTimingEnabled: (enabled: boolean) => void
      setSkipLiveExactTotalEnabled: (enabled: boolean) => void
      setHTTPFlowLiveStreamMode: (mode: MITMFlowCommittedMode) => void
    }
  }
}

if (areMITMDebugHooksEnabled()) {
  window.__YAKIT_MITM_FLOW_OBSERVABILITY__ = {
    snapshot: () => mitmFlowObservability.snapshot(),
    pipelineSnapshot: () => mitmFlowObservability.pipelineSnapshot(),
    reset: () => mitmFlowObservability.reset(),
    resetIfIdle: () => mitmFlowObservability.resetIfIdle(),
    setBackendSystemTimingEnabled: (enabled) => mitmFlowObservability.setBackendSystemTimingEnabled(enabled),
    setSkipLiveExactTotalEnabled: (enabled) => mitmFlowObservability.setSkipLiveExactTotalEnabled(enabled),
    setHTTPFlowLiveStreamMode: (mode) => mitmFlowObservability.setHTTPFlowLiveStreamMode(mode),
  }
} else if (typeof window !== 'undefined') {
  delete window.__YAKIT_MITM_FLOW_OBSERVABILITY__
}
