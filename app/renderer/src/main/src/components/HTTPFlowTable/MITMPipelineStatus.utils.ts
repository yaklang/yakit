import type { MITMDiagnosticsSummary, RawMITMDiagnostics } from './MITMDiagnostics.types'

export type MITMPipelineMetricValue = number | string | undefined | null

export interface RawMITMPipelineStats {
  Diagnostics?: RawMITMDiagnostics | null
  Version?: MITMPipelineMetricValue
  SessionId?: string
  SessionStartedAtUnixMs?: MITMPipelineMetricValue
  GeneratedAtUnixMs?: MITMPipelineMetricValue
  RequestTotal?: MITMPipelineMetricValue
  DispatchTotal?: MITMPipelineMetricValue
  UpstreamCompletedTotal?: MITMPipelineMetricValue
  ResponseMirroredTotal?: MITMPipelineMetricValue
  DroppedTotal?: MITMPipelineMetricValue
  FlowBuiltTotal?: MITMPipelineMetricValue
  PersistEnqueuedTotal?: MITMPipelineMetricValue
  PersistedTotal?: MITMPipelineMetricValue
  PersistFailedTotal?: MITMPipelineMetricValue
  ActiveTotal?: MITMPipelineMetricValue
  PreDispatchActive?: MITMPipelineMetricValue
  ManualActive?: MITMPipelineMetricValue
  UpstreamActive?: MITMPipelineMetricValue
  ResponseProcessingActive?: MITMPipelineMetricValue
  PersistActive?: MITMPipelineMetricValue
  OldestPreDispatchAgeMs?: MITMPipelineMetricValue
  OldestManualAgeMs?: MITMPipelineMetricValue
  OldestUpstreamAgeMs?: MITMPipelineMetricValue
  OldestResponseProcessingAgeMs?: MITMPipelineMetricValue
  OldestPersistAgeMs?: MITMPipelineMetricValue
  DatabaseWriteQueueDepth?: MITMPipelineMetricValue
  DatabaseWriteQueueCapacity?: MITMPipelineMetricValue
}

export interface MITMPipelineStats {
  Diagnostics?: MITMDiagnosticsSummary
  Version: number
  SessionId: string
  SessionStartedAtUnixMs: number
  GeneratedAtUnixMs: number
  RequestTotal: number
  DispatchTotal: number
  UpstreamCompletedTotal: number
  ResponseMirroredTotal: number
  DroppedTotal: number
  FlowBuiltTotal: number
  PersistEnqueuedTotal: number
  PersistedTotal: number
  PersistFailedTotal: number
  ActiveTotal: number
  PreDispatchActive: number
  ManualActive: number
  UpstreamActive: number
  ResponseProcessingActive: number
  PersistActive: number
  OldestPreDispatchAgeMs: number
  OldestManualAgeMs: number
  OldestUpstreamAgeMs: number
  OldestResponseProcessingAgeMs: number
  OldestPersistAgeMs: number
  DatabaseWriteQueueDepth: number
  DatabaseWriteQueueCapacity: number
}

export interface MITMPipelineRates {
  request: number
  dispatch: number
  upstreamCompleted: number
  responseMirrored: number
  flowBuilt: number
  persistEnqueued: number
  persisted: number
  persistFailed: number
  pendingDelta?: number
}

const numericFields: Array<Exclude<keyof MITMPipelineStats, 'SessionId' | 'Diagnostics'>> = [
  'Version',
  'SessionStartedAtUnixMs',
  'GeneratedAtUnixMs',
  'RequestTotal',
  'DispatchTotal',
  'UpstreamCompletedTotal',
  'ResponseMirroredTotal',
  'DroppedTotal',
  'FlowBuiltTotal',
  'PersistEnqueuedTotal',
  'PersistedTotal',
  'PersistFailedTotal',
  'ActiveTotal',
  'PreDispatchActive',
  'ManualActive',
  'UpstreamActive',
  'ResponseProcessingActive',
  'PersistActive',
  'OldestPreDispatchAgeMs',
  'OldestManualAgeMs',
  'OldestUpstreamAgeMs',
  'OldestResponseProcessingAgeMs',
  'OldestPersistAgeMs',
  'DatabaseWriteQueueDepth',
  'DatabaseWriteQueueCapacity',
]

const toNonNegativeNumber = (value: MITMPipelineMetricValue): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

export const normalizeMITMPipelineStats = (raw: RawMITMPipelineStats): MITMPipelineStats => {
  const normalized = { SessionId: typeof raw.SessionId === 'string' ? raw.SessionId : '' } as MITMPipelineStats
  numericFields.forEach((field) => {
    normalized[field] = toNonNegativeNumber(raw[field])
  })
  const d = raw.Diagnostics
  if (d) {
    normalized.Diagnostics = {
      stages: (d.HTTPStages ?? []).map((stage) => {
        const count = toNonNegativeNumber(stage.Count)
        const oldest = toNonNegativeNumber(stage.OldestAgeMs)
        const browserCount = Math.min(count, toNonNegativeNumber(stage.BrowserBackgroundCount))
        return {
          stage: stage.Stage,
          count,
          oldest,
          browserCount,
          browserOldest: toNonNegativeNumber(stage.OldestBrowserBackgroundAgeMs),
          otherOldest: browserCount ? toNonNegativeNumber(stage.OldestOtherAgeMs) : oldest,
        }
      }),
      wsHandshaking: toNonNegativeNumber(d.WebSocketHandshaking),
      wsOnline: toNonNegativeNumber(d.WebSocketOnline),
      oldestWSHandshake: toNonNegativeNumber(d.OldestWebSocketHandshakeAgeMs),
      wsFailed: toNonNegativeNumber(d.WebSocketHandshakeFailedLastMinute),
      persistBlocked: toNonNegativeNumber(d.PersistBlocked),
      oldestBlocked: toNonNegativeNumber(d.OldestPersistBlockedAgeMs),
      databaseTaken: toNonNegativeNumber(d.DatabaseWriteTakenUnfinished),
      submitToStartP95: toNonNegativeNumber(d.PersistSubmitToStartSamples)
        ? toNonNegativeNumber(d.PersistSubmitToStartP95Ms)
        : undefined,
      writeP95: toNonNegativeNumber(d.PersistWriteSamples) ? toNonNegativeNumber(d.PersistWriteP95Ms) : undefined,
      queueWaitP95: toNonNegativeNumber(d.PersistQueueWaitSamples)
        ? toNonNegativeNumber(d.PersistQueueWaitP95Ms)
        : undefined,
    }
  }
  return normalized
}

const emptyRates = (): MITMPipelineRates => ({
  request: 0,
  dispatch: 0,
  upstreamCompleted: 0,
  responseMirrored: 0,
  flowBuilt: 0,
  persistEnqueued: 0,
  persisted: 0,
  persistFailed: 0,
})

const counterRate = (previous: number, current: number, elapsedSeconds: number): number => {
  if (current < previous || elapsedSeconds <= 0) return 0
  return (current - previous) / elapsedSeconds
}

export const deriveMITMPipelineRates = (
  previous: MITMPipelineStats | undefined,
  current: MITMPipelineStats,
): MITMPipelineRates => {
  if (!previous || previous.SessionId !== current.SessionId) return emptyRates()
  const elapsedSeconds = (current.GeneratedAtUnixMs - previous.GeneratedAtUnixMs) / 1000
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0 || elapsedSeconds > 10) return emptyRates()
  return {
    request: counterRate(previous.RequestTotal, current.RequestTotal, elapsedSeconds),
    dispatch: counterRate(previous.DispatchTotal, current.DispatchTotal, elapsedSeconds),
    upstreamCompleted: counterRate(previous.UpstreamCompletedTotal, current.UpstreamCompletedTotal, elapsedSeconds),
    responseMirrored: counterRate(previous.ResponseMirroredTotal, current.ResponseMirroredTotal, elapsedSeconds),
    flowBuilt: counterRate(previous.FlowBuiltTotal, current.FlowBuiltTotal, elapsedSeconds),
    persistEnqueued: counterRate(previous.PersistEnqueuedTotal, current.PersistEnqueuedTotal, elapsedSeconds),
    persisted: counterRate(previous.PersistedTotal, current.PersistedTotal, elapsedSeconds),
    persistFailed: counterRate(previous.PersistFailedTotal, current.PersistFailedTotal, elapsedSeconds),
    pendingDelta: current.PersistActive - previous.PersistActive,
  }
}

export const formatMITMPipelineRate = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value >= 100) return Math.round(value).toString()
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, '')
  return value.toFixed(1).replace(/\.0$/, '')
}

export const formatMITMPipelineDuration = (milliseconds?: number): string => {
  if (!milliseconds || milliseconds <= 0) return '0ms'
  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`
  if (milliseconds < 10_000) return `${(milliseconds / 1000).toFixed(1).replace(/\.0$/, '')}s`
  return `${Math.round(milliseconds / 1000)}s`
}
