import type { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import type { HTTPFlow, YakQueryHTTPFlowResponse } from './HTTPFlowTable.constants'
import { hasHTTPFlowFilterCriteria } from './HTTPFlowTable.utils'
import {
  HTTP_FLOW_LIVE_REFRESH_MIN_INTERVAL_MS,
  type HTTPFlowLiveStreamFault,
  type MITMFlowCommittedMode,
} from './HTTPFlowTable.observability'
import {
  HTTP_FLOW_LIVE_DIRECT_MIN_INTERVAL_MS,
  HTTP_FLOW_LIVE_DIRECT_SUSTAINED_INTERVAL_MS,
  HTTP_FLOW_LIVE_DIRECT_SUSTAINED_PENDING_ROWS,
} from './HTTPFlowTable.performance'

export const HTTP_FLOW_LIVE_PROTOCOL_VERSION = 1
export const HTTP_FLOW_LIVE_DIRECT_MAX_BATCH_ROWS = 256
export const HTTP_FLOW_LIVE_DIRECT_MAX_PENDING_ROWS = 2048

const EVENT_COMMITTED = 'HTTP_FLOW_LIVE_EVENT_TYPE_COMMITTED'
const EVENT_GAP = 'HTTP_FLOW_LIVE_EVENT_TYPE_GAP'
const EVENT_HEARTBEAT = 'HTTP_FLOW_LIVE_EVENT_TYPE_HEARTBEAT'
const GAP_SEQUENCE_DISCONTINUITY = 'HTTP_FLOW_LIVE_GAP_REASON_SEQUENCE_DISCONTINUITY'

const asSafeNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0
}

const asFiniteNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

export const httpFlowLiveSummaryToHTTPFlow = (summary?: HTTPFlowLiveSummary): HTTPFlow | undefined => {
  const Id = asSafeNumber(summary?.Id)
  if (!Id) return
  const Url = asString(summary?.Url)
  return {
    Id,
    Method: asString(summary?.Method),
    Path: asString(summary?.Path),
    Hash: asString(summary?.Hash),
    IsHTTPS: summary?.IsHTTPS === true,
    Url,
    URL: Url,
    Request: new Uint8Array(),
    Response: new Uint8Array(),
    StatusCode: asFiniteNumber(summary?.StatusCode),
    BodyLength: asFiniteNumber(summary?.BodyLength),
    BodySizeVerbose: asString(summary?.BodySizeVerbose),
    RequestLength: asFiniteNumber(summary?.RequestLength),
    RequestSizeVerbose: asString(summary?.RequestSizeVerbose),
    ContentType: asString(summary?.ContentType),
    SourceType: asString(summary?.SourceType),
    RequestHeader: [],
    ResponseHeader: [],
    GetParamsTotal: asFiniteNumber(summary?.GetParamsTotal),
    PostParamsTotal: asFiniteNumber(summary?.PostParamsTotal),
    CookieParamsTotal: asFiniteNumber(summary?.CookieParamsTotal),
    CreatedAt: asFiniteNumber(summary?.CreatedAt),
    UpdatedAt: asFiniteNumber(summary?.UpdatedAt),
    HostPort: asString(summary?.HostPort),
    Host: asString(summary?.Host),
    IPAddress: asString(summary?.IPAddress),
    HtmlTitle: asString(summary?.HtmlTitle),
    PathSuffix: asString(summary?.PathSuffix),
    GetParams: [],
    PostParams: [],
    CookieParams: [],
    Tags: asString(summary?.Tags),
    IsWebsocket: summary?.IsWebsocket === true,
    WebsocketHash: asString(summary?.WebsocketHash),
    NoFixContentLength: summary?.NoFixContentLength === true,
    IsReadTooSlowResponse: summary?.IsReadTooSlowResponse === true,
    IsTooLargeResponse: summary?.IsTooLargeResponse === true,
    TooLargeResponseHeaderFile: asString(summary?.TooLargeResponseHeaderFile),
    TooLargeResponseBodyFile: asString(summary?.TooLargeResponseBodyFile),
    IsTooLargeRequest: summary?.IsTooLargeRequest === true,
    TooLargeRequestHeaderFile: asString(summary?.TooLargeRequestHeaderFile),
    TooLargeRequestBodyFile: asString(summary?.TooLargeRequestBodyFile),
    IsRequestOversize: summary?.IsRequestOversize === true,
    DurationMs: asFiniteNumber(summary?.DurationMs),
    DisableRenderStyles: false,
    RequestString: '',
    ResponseString: '',
    HiddenIndex: asString(summary?.HiddenIndex),
    FromPlugin: asString(summary?.FromPlugin),
  }
}

interface HTTPFlowLiveDirectBatcherOptions {
  onFlush: (events: HTTPFlowLiveEvent[]) => void
  minIntervalMs?: number
  sustainedIntervalMs?: number
  sustainedPendingRows?: number
  maxBatchRows?: number
  maxPendingRows?: number
  now?: () => number
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

/**
 * The first row is delivered immediately. Sparse traffic keeps a short update
 * interval, while a growing queue postpones the pending flush to the sustained
 * interval so table rendering cannot monopolize the main thread. An emergency
 * high-water flush still prevents an unbounded renderer queue.
 */
export const createHTTPFlowLiveDirectBatcher = (options: HTTPFlowLiveDirectBatcherOptions) => {
  const minIntervalMs = Math.max(1, Math.floor(Number(options.minIntervalMs) || HTTP_FLOW_LIVE_DIRECT_MIN_INTERVAL_MS))
  const sustainedIntervalMs = Math.max(
    minIntervalMs,
    Math.floor(Number(options.sustainedIntervalMs) || HTTP_FLOW_LIVE_DIRECT_SUSTAINED_INTERVAL_MS),
  )
  const sustainedPendingRows = Math.max(
    1,
    Math.floor(Number(options.sustainedPendingRows) || HTTP_FLOW_LIVE_DIRECT_SUSTAINED_PENDING_ROWS),
  )
  const maxBatchRows = Math.max(1, Math.floor(Number(options.maxBatchRows) || HTTP_FLOW_LIVE_DIRECT_MAX_BATCH_ROWS))
  const maxPendingRows = Math.max(
    maxBatchRows,
    Math.floor(Number(options.maxPendingRows) || HTTP_FLOW_LIVE_DIRECT_MAX_PENDING_ROWS),
  )
  const now = options.now || (() => performance.now())
  const setTimer = options.setTimer || ((callback, delayMs) => setTimeout(callback, delayMs))
  const clearTimer = options.clearTimer || ((timer) => clearTimeout(timer))
  const pending = new Map<number, HTTPFlowLiveEvent>()
  let lastFlushAt: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let timerDueAt: number | undefined

  const schedule = () => {
    if (pending.size === 0) return
    if (lastFlushAt === undefined) {
      flush()
      return
    }
    const intervalMs = pending.size >= sustainedPendingRows ? sustainedIntervalMs : minIntervalMs
    const dueAt = lastFlushAt + intervalMs
    if (timer !== undefined && timerDueAt === dueAt) return
    if (timer !== undefined) clearTimer(timer)
    timer = undefined
    timerDueAt = undefined
    const delayMs = Math.max(0, dueAt - now())
    if (delayMs === 0) {
      flush()
      return
    }
    timerDueAt = dueAt
    timer = setTimer(flush, delayMs)
  }

  const flush = () => {
    timer = undefined
    timerDueAt = undefined
    if (pending.size === 0) return
    const batch = Array.from(pending.entries()).slice(0, maxBatchRows)
    batch.forEach(([sequence]) => pending.delete(sequence))
    lastFlushAt = now()
    options.onFlush(batch.map(([, event]) => event))
    schedule()
  }

  const enqueue = (event: HTTPFlowLiveEvent) => {
    const sequence = asSafeNumber(event.Sequence)
    if (!sequence) return false
    pending.set(sequence, event)
    if (pending.size >= maxPendingRows) {
      if (timer !== undefined) clearTimer(timer)
      timer = undefined
      timerDueAt = undefined
      flush()
    } else {
      schedule()
    }
    return true
  }

  const cancel = () => {
    if (timer !== undefined) clearTimer(timer)
    timer = undefined
    timerDueAt = undefined
    pending.clear()
    lastFlushAt = undefined
  }

  return { enqueue, cancel, pendingCount: () => pending.size }
}

export interface HTTPFlowLiveDirectRecoverySnapshot {
  required: boolean
  fallbackHighWaterId: number
  catchUpCandidateId: number
}

interface HTTPFlowLiveDirectRecoveryGateOptions {
  onChange?: (snapshot: HTTPFlowLiveDirectRecoverySnapshot) => void
}

/**
 * Once direct insertion falls back to a cursor query, newer direct rows must
 * not jump over that unresolved interval. The gate reopens only after an
 * exhausted query and its React commit have both caught the stream cursor.
 */
export const createHTTPFlowLiveDirectRecoveryGate = (options: HTTPFlowLiveDirectRecoveryGateOptions = {}) => {
  let required = false
  let fallbackHighWaterId = 0
  let catchUpCandidateId = 0

  const snapshot = (): HTTPFlowLiveDirectRecoverySnapshot => ({
    required,
    fallbackHighWaterId,
    catchUpCandidateId,
  })

  const notify = () => options.onChange?.(snapshot())

  const requireRecovery = (highWaterId = 0) => {
    const normalizedHighWaterId = asSafeNumber(highWaterId)
    const changed = !required || normalizedHighWaterId > fallbackHighWaterId || catchUpCandidateId > 0
    required = true
    fallbackHighWaterId = Math.max(fallbackHighWaterId, normalizedHighWaterId)
    catchUpCandidateId = 0
    if (changed) notify()
  }

  const markFallback = (events: HTTPFlowLiveEvent[]) => {
    let highWaterId = 0
    for (const event of events) {
      highWaterId = Math.max(highWaterId, asSafeNumber(event.Flow?.Id), asSafeNumber(event.HighWaterId))
    }
    requireRecovery(highWaterId)
  }

  const observeQuery = (cursorAfter: number, streamLastSeenId: number, exhausted: boolean) => {
    if (!required || !exhausted) return false
    const normalizedCursorAfter = asSafeNumber(cursorAfter)
    const requiredHighWaterId = Math.max(fallbackHighWaterId, asSafeNumber(streamLastSeenId))
    if (normalizedCursorAfter < requiredHighWaterId) return false
    if (catchUpCandidateId !== normalizedCursorAfter) {
      catchUpCandidateId = normalizedCursorAfter
      notify()
    }
    return true
  }

  const commitVisible = (visibleHighWaterId: number, streamLastSeenId: number) => {
    if (
      !required ||
      catchUpCandidateId === 0 ||
      catchUpCandidateId < fallbackHighWaterId ||
      catchUpCandidateId < asSafeNumber(streamLastSeenId) ||
      asSafeNumber(visibleHighWaterId) < catchUpCandidateId
    ) {
      return false
    }
    required = false
    fallbackHighWaterId = 0
    catchUpCandidateId = 0
    notify()
    return true
  }

  const reset = () => {
    if (!required && fallbackHighWaterId === 0 && catchUpCandidateId === 0) return
    required = false
    fallbackHighWaterId = 0
    catchUpCandidateId = 0
    notify()
  }

  return { markFallback, requireRecovery, observeQuery, commitVisible, reset, snapshot }
}

interface HTTPFlowLiveRefreshSchedulerOptions {
  onFlush: () => void
  minIntervalMs?: number
  now?: () => number
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

/**
 * Keep the first live event responsive while bounding QueryHTTPFlows churn
 * during a sustained commit burst. A pending trailing refresh is never lost.
 */
export const createHTTPFlowLiveRefreshScheduler = (options: HTTPFlowLiveRefreshSchedulerOptions) => {
  const minIntervalMs = Math.max(1, Math.floor(Number(options.minIntervalMs) || HTTP_FLOW_LIVE_REFRESH_MIN_INTERVAL_MS))
  const now = options.now || (() => performance.now())
  const setTimer = options.setTimer || ((callback, delayMs) => setTimeout(callback, delayMs))
  const clearTimer = options.clearTimer || ((timer) => clearTimeout(timer))
  let lastFlushAt: number | undefined
  let pending = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    timer = undefined
    if (!pending) return
    pending = false
    lastFlushAt = now()
    options.onFlush()
  }

  const request = () => {
    pending = true
    if (timer !== undefined) return
    const elapsed = lastFlushAt === undefined ? minIntervalMs : Math.max(0, now() - lastFlushAt)
    const delayMs = Math.max(0, minIntervalMs - elapsed)
    if (delayMs === 0) {
      flush()
      return
    }
    timer = setTimer(flush, delayMs)
  }

  const cancel = () => {
    if (timer !== undefined) clearTimer(timer)
    timer = undefined
    pending = false
    lastFlushAt = undefined
  }

  return { request, cancel }
}

export interface HTTPFlowLiveStreamTransport {
  start: (request: SubscribeHTTPFlowsRequest, token: string) => Promise<unknown> | unknown
  cancel: (token: string) => Promise<unknown> | unknown
  onData: (token: string, callback: (event: HTTPFlowLiveEvent) => void) => () => void
  onError: (token: string, callback: (error: unknown) => void) => () => void
  onEnd: (token: string, callback: () => void) => () => void
}

export interface HTTPFlowLiveStreamControllerOptions {
  transport: HTTPFlowLiveStreamTransport
  createToken: () => string
  getMode: () => MITMFlowCommittedMode
  onCommitted?: (event: HTTPFlowLiveEvent, mode: MITMFlowCommittedMode) => void
  onGap?: (event: HTTPFlowLiveEvent) => void
  onUnavailable?: (error: unknown) => void
  onReset?: () => void
  observer?: {
    recordHTTPFlowLiveStreamSubscription: (databaseIdentity: string, projectGeneration: number) => void
    recordHTTPFlowLiveStreamEvent: (event: HTTPFlowLiveEvent) => void
    recordHTTPFlowLiveStreamFault: (fault: HTTPFlowLiveStreamFault, reason?: string) => void
    recordHTTPFlowLiveStreamStopped: () => void
  }
}

export interface HTTPFlowLiveStreamSnapshot {
  active: boolean
  projectKey: string
  lastSeenSequence: number
  lastSeenId: number
  recovering: boolean
  unavailableForProject: boolean
}

export const shouldPreferHTTPFlowLiveRefresh = (
  pageType: string | undefined,
  inViewport: boolean,
  mode: MITMFlowCommittedMode,
  snapshot: HTTPFlowLiveStreamSnapshot,
) =>
  pageType === 'MITM' &&
  inViewport &&
  mode === 'canary' &&
  snapshot.active &&
  !snapshot.recovering &&
  !snapshot.unavailableForProject

const responseMaxID = (response: YakQueryHTTPFlowResponse): number => {
  let maxID = 0
  for (const flow of response.Data || []) {
    maxID = Math.max(maxID, asSafeNumber(flow.Id))
  }
  return maxID
}

const projectKeyOf = (databaseIdentity: string, projectGeneration: number) => `${databaseIdentity}:${projectGeneration}`

export const createHTTPFlowLiveStreamController = (options: HTTPFlowLiveStreamControllerOptions) => {
  let activeToken = ''
  let activeProjectKey = ''
  let databaseIdentity = ''
  let projectGeneration = 0
  let lastSeenSequence = 0
  let lastSeenId = 0
  let haveSequenceBaseline = false
  let recovering = false
  let unavailableProjectKey = ''
  let cleanups: Array<() => void> = []

  const cleanupListeners = () => {
    cleanups.forEach((cleanup) => cleanup())
    cleanups = []
  }

  const stopTransport = (cancel = true) => {
    const token = activeToken
    activeToken = ''
    cleanupListeners()
    if (cancel && token) {
      Promise.resolve(options.transport.cancel(token)).catch(() => {})
    }
  }

  const buildGapEvent = (reason: string, event?: HTTPFlowLiveEvent): HTTPFlowLiveEvent => ({
    ProtocolVersion: HTTP_FLOW_LIVE_PROTOCOL_VERSION,
    Type: EVENT_GAP,
    Sequence: event?.Sequence ?? lastSeenSequence,
    ProjectGeneration: event?.ProjectGeneration ?? projectGeneration,
    DatabaseIdentity: event?.DatabaseIdentity ?? databaseIdentity,
    ServerAtUnixMs: event?.ServerAtUnixMs,
    HighWaterId: event?.HighWaterId,
    SessionId: event?.SessionId ?? activeToken,
    Gap: event?.Gap || {
      Reason: reason,
      RequestedSequence: lastSeenSequence,
      LatestSequence: event?.Sequence ?? lastSeenSequence,
      HighWaterId: event?.HighWaterId,
    },
  })

  const enterRecovery = (event: HTTPFlowLiveEvent) => {
    if (recovering) return
    recovering = true
    lastSeenSequence = 0
    haveSequenceBaseline = false
    options.onGap?.(event)
    stopTransport()
  }

  const validateEnvelope = (event: HTTPFlowLiveEvent, token: string) =>
    asSafeNumber(event.ProtocolVersion) === HTTP_FLOW_LIVE_PROTOCOL_VERSION &&
    event.SessionId === token &&
    event.DatabaseIdentity === databaseIdentity &&
    asSafeNumber(event.ProjectGeneration) === projectGeneration

  const handleData = (event: HTTPFlowLiveEvent, token: string) => {
    if (!activeToken || token !== activeToken) return
    if (!validateEnvelope(event, token)) {
      options.observer?.recordHTTPFlowLiveStreamFault('invalid-envelope', GAP_SEQUENCE_DISCONTINUITY)
      enterRecovery(buildGapEvent(GAP_SEQUENCE_DISCONTINUITY, event))
      return
    }
    options.observer?.recordHTTPFlowLiveStreamEvent(event)
    if (options.getMode() === 'off') {
      options.onReset?.()
      options.observer?.recordHTTPFlowLiveStreamStopped()
      stopTransport()
      return
    }
    const eventType = event.Type || ''
    const sequence = asSafeNumber(event.Sequence)
    if (eventType === EVENT_GAP) {
      enterRecovery(event)
      return
    }
    if (eventType === EVENT_HEARTBEAT) {
      if (!haveSequenceBaseline) {
        lastSeenSequence = sequence
        haveSequenceBaseline = true
        return
      }
      if (sequence > lastSeenSequence) {
        options.observer?.recordHTTPFlowLiveStreamFault('sequence-gap', GAP_SEQUENCE_DISCONTINUITY)
        enterRecovery(buildGapEvent(GAP_SEQUENCE_DISCONTINUITY, event))
      }
      return
    }
    if (eventType !== EVENT_COMMITTED) {
      options.observer?.recordHTTPFlowLiveStreamFault('invalid-event', eventType || 'unspecified')
      enterRecovery(buildGapEvent(GAP_SEQUENCE_DISCONTINUITY, event))
      return
    }

    const flowID = asSafeNumber(event.Flow?.Id)
    if (sequence === 0 || flowID === 0) {
      options.observer?.recordHTTPFlowLiveStreamFault('invalid-event', GAP_SEQUENCE_DISCONTINUITY)
      enterRecovery(buildGapEvent(GAP_SEQUENCE_DISCONTINUITY, event))
      return
    }
    if (haveSequenceBaseline && sequence > lastSeenSequence + 1) {
      options.observer?.recordHTTPFlowLiveStreamFault('sequence-gap', GAP_SEQUENCE_DISCONTINUITY)
      enterRecovery(buildGapEvent(GAP_SEQUENCE_DISCONTINUITY, event))
      return
    }
    if (haveSequenceBaseline && sequence <= lastSeenSequence) {
      options.observer?.recordHTTPFlowLiveStreamFault(sequence === lastSeenSequence ? 'duplicate' : 'out-of-order')
      return
    }

    lastSeenSequence = sequence
    lastSeenId = Math.max(lastSeenId, flowID)
    haveSequenceBaseline = true
    const mode = options.getMode()
    options.onCommitted?.(event, mode)
  }

  const start = () => {
    if (!activeProjectKey || activeToken || unavailableProjectKey === activeProjectKey) return
    const mode = options.getMode()
    if (mode === 'off') return

    const token = options.createToken()
    activeToken = token
    const request: SubscribeHTTPFlowsRequest = {
      ProtocolVersion: HTTP_FLOW_LIVE_PROTOCOL_VERSION,
      LastSeenSequence: lastSeenSequence,
      LastSeenId: lastSeenId,
      ProjectGeneration: projectGeneration,
      DatabaseIdentity: databaseIdentity,
      SessionId: token,
      Filter: { SourceType: 'mitm' },
    }
    cleanups = [
      options.transport.onData(token, (event) => handleData(event, token)),
      options.transport.onError(token, (error) => {
        if (activeToken !== token) return
        unavailableProjectKey = activeProjectKey
        options.observer?.recordHTTPFlowLiveStreamFault('unavailable')
        stopTransport(false)
        options.onUnavailable?.(error)
      }),
      options.transport.onEnd(token, () => {
        if (activeToken !== token) return
        const gapEvent = buildGapEvent(GAP_SEQUENCE_DISCONTINUITY)
        options.observer?.recordHTTPFlowLiveStreamFault('ended', GAP_SEQUENCE_DISCONTINUITY)
        stopTransport(false)
        if (!recovering) options.onGap?.(gapEvent)
      }),
    ]
    options.observer?.recordHTTPFlowLiveStreamSubscription(databaseIdentity, projectGeneration)
    Promise.resolve(options.transport.start(request, token)).catch((error) => {
      if (activeToken !== token) return
      unavailableProjectKey = activeProjectKey
      options.observer?.recordHTTPFlowLiveStreamFault('unavailable')
      stopTransport(false)
      options.onUnavailable?.(error)
    })
  }

  const observeQuery = (response: YakQueryHTTPFlowResponse, filter?: YakQueryHTTPFlowRequest) => {
    if (options.getMode() === 'off' || hasHTTPFlowFilterCriteria(filter)) {
      options.onReset?.()
      stopTransport()
      options.observer?.recordHTTPFlowLiveStreamStopped()
      return
    }
    const identity = response.SystemTiming?.DatabaseIdentity || ''
    const generation = asSafeNumber(response.SystemTiming?.ProjectGeneration)
    if (!identity || generation === 0) {
      stopTransport()
      return
    }

    const nextProjectKey = projectKeyOf(identity, generation)
    // An empty query after MITM "reset" still has a valid resume boundary in
    // Filter.AfterId. Losing it here makes a recovering/new subscription start
    // from ID 0, which can repeatedly hit the replay-window GAP and never
    // deliver post-reset rows.
    const queryResumeID = Math.max(responseMaxID(response), asSafeNumber(filter?.AfterId))
    if (nextProjectKey !== activeProjectKey) {
      options.onReset?.()
      stopTransport()
      activeProjectKey = nextProjectKey
      databaseIdentity = identity
      projectGeneration = generation
      lastSeenSequence = 0
      lastSeenId = queryResumeID
      haveSequenceBaseline = false
      recovering = false
      unavailableProjectKey = ''
    } else {
      if (recovering) {
        // A gap invalidates every direct row that was received but not yet
        // rendered. Resume from the database recovery result, not the old
        // receive cursor, or those cancelled rows could be skipped forever.
        lastSeenId = queryResumeID
        recovering = false
        lastSeenSequence = 0
        haveSequenceBaseline = false
      } else {
        lastSeenId = Math.max(lastSeenId, queryResumeID)
      }
    }
    start()
  }

  const stop = () => {
    options.onReset?.()
    stopTransport()
    options.observer?.recordHTTPFlowLiveStreamStopped()
    activeProjectKey = ''
    databaseIdentity = ''
    projectGeneration = 0
    lastSeenSequence = 0
    lastSeenId = 0
    haveSequenceBaseline = false
    recovering = false
    unavailableProjectKey = ''
  }

  const snapshot = (): HTTPFlowLiveStreamSnapshot => ({
    active: !!activeToken,
    projectKey: activeProjectKey,
    lastSeenSequence,
    lastSeenId,
    recovering,
    unavailableForProject: !!activeProjectKey && unavailableProjectKey === activeProjectKey,
  })

  return { observeQuery, stop, snapshot }
}
