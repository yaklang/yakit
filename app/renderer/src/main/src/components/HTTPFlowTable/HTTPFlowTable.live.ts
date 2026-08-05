export const MITM_LIVE_CYCLE_TIME_BUDGET_MS = 32
export const MITM_LIVE_CYCLE_PAYLOAD_BUDGET_BYTES = 2 * 1024 * 1024
export const MITM_LIVE_TARGET_PAGE_PAYLOAD_BYTES = 1024 * 1024
export const MITM_LIVE_CATCH_UP_PAYLOAD_BUDGET_BYTES = 4 * 1024 * 1024
export const MITM_LIVE_MAX_PAGE_ROWS = 256
// Request/Response are omitted from MITM list rows. Their persisted body
// lengths describe detail packets, not the protobuf/IPC payload of the list.
// Keep a conservative metadata estimate so adaptive batching remains bounded
// without splitting large-body traffic into tiny, unnecessary React commits.
export const MITM_LIVE_PROJECTED_ROW_ESTIMATE_BYTES = 8 * 1024
const MITM_LIVE_MAX_PAGES_SAFETY = 32

export const shouldSkipMITMLiveExactTotal = (afterId?: number, beforeId?: number): boolean =>
  Number(afterId) > 0 && !(Number(beforeId) > 0)

export interface MITMLiveRow {
  Id: number
  Request?: unknown
  Response?: unknown
  RequestLength?: number
  BodyLength?: number
}

export interface MITMLivePage<T extends MITMLiveRow> {
  Data?: T[]
  SystemTiming?: {
    LatestPersistedId?: number | string
  }
}

export type MITMLiveDrainStopReason = 'exhausted' | 'time-budget' | 'payload-budget' | 'cursor-stalled' | 'page-safety'

export interface MITMLiveDrainOptions {
  initialPageSize: number
  timeBudgetMs?: number
  payloadBudgetBytes?: number
  targetPagePayloadBytes?: number
  maxPageRows?: number
  maxPagesSafety?: number
  now?: () => number
}

export interface MITMLiveDrainResult<T extends MITMLiveRow, R extends MITMLivePage<T>> {
  data: T[]
  lastResponse?: R
  cursorAfter: number
  pages: number
  payloadBytes: number
  hasMore: boolean
  shouldContinueImmediately: boolean
  stopReason: MITMLiveDrainStopReason
}

export interface MITMLiveAdaptiveBatchState {
  bytesPerRow: number
  catchingUp: boolean
}

export const createMITMLiveAdaptiveBatchState = (): MITMLiveAdaptiveBatchState => ({
  bytesPerRow: 0,
  catchingUp: false,
})

export const selectMITMLiveInitialPageSize = (
  viewportRows: number,
  state: MITMLiveAdaptiveBatchState,
  targetPayloadBytes = state.catchingUp ? MITM_LIVE_CATCH_UP_PAYLOAD_BUDGET_BYTES : MITM_LIVE_TARGET_PAGE_PAYLOAD_BYTES,
  maxPageRows = MITM_LIVE_MAX_PAGE_ROWS,
): number => {
  const normalizedViewportRows = positiveInteger(viewportRows, 1)
  const normalizedMaxPageRows = positiveInteger(maxPageRows, MITM_LIVE_MAX_PAGE_ROWS)
  if (!Number.isFinite(state.bytesPerRow) || state.bytesPerRow <= 0) {
    return Math.min(normalizedMaxPageRows, normalizedViewportRows)
  }
  const rowsWithinPayloadBudget = Math.max(1, Math.floor(positiveInteger(targetPayloadBytes, 1) / state.bytesPerRow))
  return Math.min(normalizedMaxPageRows, rowsWithinPayloadBudget)
}

export const updateMITMLiveAdaptiveBatchState = (
  state: MITMLiveAdaptiveBatchState,
  observation: { rows: number; payloadBytes: number; hasMore: boolean },
): MITMLiveAdaptiveBatchState => {
  const rows = Math.max(0, Math.floor(Number(observation.rows) || 0))
  const payloadBytes = Math.max(0, Number(observation.payloadBytes) || 0)
  if (!rows || !payloadBytes) return { ...state, catchingUp: observation.hasMore }

  const observedBytesPerRow = payloadBytes / rows
  return {
    // Grow immediately for unexpectedly large rows, but reduce gradually so a
    // short run of tiny rows cannot make the next response packet unbounded.
    bytesPerRow: state.bytesPerRow > 0 ? Math.max(observedBytesPerRow, state.bytesPerRow / 2) : observedBytesPerRow,
    catchingUp: observation.hasMore,
  }
}

const packetByteLength = (value: unknown): number => {
  if (typeof value === 'string') return value.length
  if (value instanceof ArrayBuffer) return value.byteLength
  if (ArrayBuffer.isView(value)) return value.byteLength
  if (Array.isArray(value)) return value.length
  return 0
}

export const estimateMITMLiveRowBytes = (row: MITMLiveRow): number => {
  const packetBytes = packetByteLength(row.Request) + packetByteLength(row.Response)
  if (packetBytes > 0) return packetBytes
  return MITM_LIVE_PROJECTED_ROW_ESTIMATE_BYTES
}

function positiveInteger(value: number | undefined, fallback: number) {
  const normalized = Math.floor(Number(value))
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback
}

const latestPersistedId = <T extends MITMLiveRow, R extends MITMLivePage<T>>(response: R): number | undefined => {
  const result = Number(response.SystemTiming?.LatestPersistedId)
  return Number.isFinite(result) && result >= 0 ? result : undefined
}

export const drainMITMLiveBacklog = async <T extends MITMLiveRow, R extends MITMLivePage<T>>(
  afterId: number,
  options: MITMLiveDrainOptions,
  fetchPage: (afterId: number, limit: number) => Promise<R>,
): Promise<MITMLiveDrainResult<T, R>> => {
  const now = options.now || (() => performance.now())
  const startedAt = now()
  const timeBudgetMs = positiveInteger(options.timeBudgetMs, MITM_LIVE_CYCLE_TIME_BUDGET_MS)
  const payloadBudgetBytes = positiveInteger(options.payloadBudgetBytes, MITM_LIVE_CYCLE_PAYLOAD_BUDGET_BYTES)
  const targetPagePayloadBytes = positiveInteger(options.targetPagePayloadBytes, MITM_LIVE_TARGET_PAGE_PAYLOAD_BYTES)
  const maxPageRows = positiveInteger(options.maxPageRows, MITM_LIVE_MAX_PAGE_ROWS)
  const maxPagesSafety = positiveInteger(options.maxPagesSafety, MITM_LIVE_MAX_PAGES_SAFETY)
  let pageSize = Math.min(maxPageRows, positiveInteger(options.initialPageSize, 1))
  let cursor = Number.isFinite(afterId) ? Math.max(0, afterId) : 0
  let lastResponse: R | undefined
  let pages = 0
  let payloadBytes = 0
  let hasMore = false
  let lastPageWasFull = false
  let stopReason: MITMLiveDrainStopReason = 'page-safety'
  const data: T[] = []

  while (pages < maxPagesSafety) {
    const rsp = await fetchPage(cursor, pageSize)
    pages += 1
    lastResponse = rsp
    const rawBatch = rsp.Data || []
    const batch = rawBatch.filter((row) => Number(row.Id) > cursor)
    if (!batch.length) {
      hasMore = false
      stopReason = rawBatch.length ? 'cursor-stalled' : 'exhausted'
      break
    }

    const nextCursor = Number(batch[batch.length - 1]?.Id)
    if (!Number.isFinite(nextCursor) || nextCursor <= cursor) {
      hasMore = false
      stopReason = 'cursor-stalled'
      break
    }

    const batchBytes = batch.reduce((total, row) => total + estimateMITMLiveRowBytes(row), 0)
    data.push(...batch)
    payloadBytes += batchBytes
    cursor = nextCursor

    const backendHighWater = latestPersistedId(rsp)
    const pageWasFull = rawBatch.length >= pageSize
    lastPageWasFull = pageWasFull
    hasMore = backendHighWater === undefined ? pageWasFull : backendHighWater > cursor
    if (!hasMore) {
      stopReason = 'exhausted'
      break
    }
    if (payloadBytes >= payloadBudgetBytes) {
      stopReason = 'payload-budget'
      break
    }
    if (now() - startedAt >= timeBudgetMs) {
      stopReason = 'time-budget'
      break
    }

    const averageRowBytes = batchBytes > 0 ? batchBytes / batch.length : 0
    if (averageRowBytes > 0) {
      const remainingPayloadBytes = Math.max(0, payloadBudgetBytes - payloadBytes)
      const nextPagePayloadBudget = Math.min(targetPagePayloadBytes, remainingPayloadBytes)
      const rowsWithinPayloadBudget = Math.floor(nextPagePayloadBudget / averageRowBytes)
      if (rowsWithinPayloadBudget < 1) {
        stopReason = 'payload-budget'
        break
      }
      pageSize = Math.min(maxPageRows, rowsWithinPayloadBudget)
    } else {
      pageSize = maxPageRows
    }
  }

  return {
    data,
    lastResponse,
    cursorAfter: cursor,
    pages,
    payloadBytes,
    hasMore,
    // A short page followed by a newer high-water mark means rows arrived
    // while this query was running. The coalesced server push should fetch
    // those rows; an immediate continuation would duplicate that wake-up.
    shouldContinueImmediately: hasMore && lastPageWasFull,
    stopReason,
  }
}
