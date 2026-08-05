export const MITM_FLOW_COMMITTED_REFRESH_MIN_INTERVAL_MS = 50

interface FlowCommittedRefreshSchedulerOptions {
  minIntervalMs?: number
  now?: () => number
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

export const createMITMFlowCommittedRefreshScheduler = (options: FlowCommittedRefreshSchedulerOptions = {}) => {
  const minIntervalMs = Math.max(
    1,
    Math.floor(Number(options.minIntervalMs) || MITM_FLOW_COMMITTED_REFRESH_MIN_INTERVAL_MS),
  )
  const now = options.now || (() => performance.now())
  const setTimer = options.setTimer || ((callback, delayMs) => setTimeout(callback, delayMs))
  const clearTimer = options.clearTimer || ((timer) => clearTimeout(timer))
  let lastFlushAt: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: (() => void) | undefined

  const flush = () => {
    timer = undefined
    const callback = pending
    pending = undefined
    if (!callback) return
    lastFlushAt = now()
    callback()
  }

  const request = (callback: () => void) => {
    pending = callback
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
    pending = undefined
    lastFlushAt = undefined
  }

  return { request, cancel }
}
