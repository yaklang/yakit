import type { MITMPipelineMetricValue } from './MITMPipelineStatus.utils'

type Metric = MITMPipelineMetricValue

export interface RawMITMDiagnostics {
  HTTPStages?: Array<{
    Stage: string
    Count: Metric
    OldestAgeMs: Metric
    BrowserBackgroundCount?: Metric
    OldestBrowserBackgroundAgeMs?: Metric
    OldestOtherAgeMs?: Metric
    FilteredCount?: Metric
    InScopeOtherCount?: Metric
    OldestInScopeOtherAgeMs?: Metric
  }>
  WebSocketHandshaking?: Metric
  WebSocketOnline?: Metric
  OldestWebSocketHandshakeAgeMs?: Metric
  InScopeWebSocketHandshaking?: Metric
  OldestInScopeWebSocketHandshakeAgeMs?: Metric
  WebSocketHandshakeFailedLastMinute?: Metric
  PersistBlocked?: Metric
  OldestPersistBlockedAgeMs?: Metric
  DatabaseWriteTakenUnfinished?: Metric
  PersistSubmitToStartP95Ms?: Metric
  PersistSubmitToStartSamples?: Metric
  PersistWriteP95Ms?: Metric
  PersistWriteSamples?: Metric
  PersistQueueWaitP95Ms?: Metric
  PersistQueueWaitSamples?: Metric
}

export interface MITMStageSummary {
  stage: string
  count: number
  oldest: number
  browserCount: number
  browserOldest: number
  otherOldest: number
  filteredCount: number
  inScopeOtherCount: number
  inScopeOtherOldest: number
}

export interface MITMDiagnosticsSummary {
  stages: MITMStageSummary[]
  wsHandshaking: number
  wsOnline: number
  oldestWSHandshake: number
  inScopeWSHandshaking: number
  oldestInScopeWSHandshake: number
  wsFailed: number
  persistBlocked: number
  oldestBlocked: number
  databaseTaken: number
  submitToStartP95?: number
  writeP95?: number
  queueWaitP95?: number
}

export type MITMTraceView = 'active' | 'slow' | 'failed' | 'websocket' | 'range'
export type MITMTrafficScope = 'focus' | 'browser' | 'all' | 'capture'

export interface MITMDiagnosticsQuery {
  SessionId: string
  View: 'storage' | 'detail' | MITMTraceView
  Limit?: number
  Offset?: number
  FromUnixMs?: number
  ToUnixMs?: number
  TraceId?: string
  ConnectionId?: string
  TrafficScope?: MITMTrafficScope
  Stage?: string
}

export interface MITMTraceSpan {
  Stage: string
  StartedAtUnixMs: Metric
  FinishedAtUnixMs: Metric
  Attempt: number
  Protocol: string
}

export interface MITMTraceRow {
  TraceId: string
  Host: string
  Method: string
  Protocol: string
  ConnectionId: string
  Stage: string
  Outcome: string
  ErrorCode: string
  StatusCode: number
  StartedAtUnixMs: Metric
  StageAtUnixMs: Metric
  FinishedAtUnixMs: Metric
  FlowId: string
  Attempts: number
  Spans: MITMTraceSpan[]
  SpansTruncated: boolean
  BrowserService?: string
  FilterDecision?: string
}

export interface MITMStoragePoint {
  AtUnixMs: Metric
  PersistPending: Metric
  PersistBlocked?: Metric
  RequestTotal?: Metric
  DispatchTotal?: Metric
  UpstreamCompletedTotal?: Metric
  PersistEnqueuedTotal?: Metric
  PersistedTotal?: Metric
  PersistFailedTotal?: Metric
}

export interface MITMDiagnosticsResponse {
  SessionId?: string
  GeneratedAtUnixMs?: Metric
  Storage?: MITMStoragePoint[]
  Traces?: MITMTraceRow[]
  Total?: number
  BrowserBackgroundTotal?: number
  Detail?: MITMTraceRow | null
  Ended?: boolean
  Unsupported?: boolean
  Missing?: boolean
}
