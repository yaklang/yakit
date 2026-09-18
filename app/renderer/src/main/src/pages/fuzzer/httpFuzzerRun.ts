import { throttle } from 'lodash'
import type { FuzzerResponse } from './HTTPFuzzerPage'

type FuzzerRunEndReason = 'complete' | 'cancel' | 'error'

/** Per-run state survives UI throttling, but never survives a fresh send. */
export const createHTTPFuzzerRun = ({
  onUpdate,
  onEnd,
}: {
  onUpdate: () => void
  onEnd: (reason: FuzzerRunEndReason) => void
}) => {
  const state = {
    count: 0,
    successCount: 0,
    failedCount: 0,
    pendingFirstResponse: null as FuzzerResponse | null,
    firstResponseDirty: false,
  }
  let active = true
  let endTimer: ReturnType<typeof setTimeout> | undefined
  const update = throttle(() => active && onUpdate(), 500, { leading: false, trailing: true })

  const cancelPending = () => {
    update.cancel()
    clearTimeout(endTimer)
    endTimer = undefined
  }

  return {
    state,
    isActive: () => active,
    update,
    reset: () => {
      cancelPending()
      state.count = 0
      state.successCount = 0
      state.failedCount = 0
      state.pendingFirstResponse = null
      state.firstResponseDirty = false
      active = true
    },
    finish: (reason: FuzzerRunEndReason, delay = 0) => {
      if (!active && (reason === 'complete' || endTimer === undefined)) return
      cancelPending()
      onUpdate()
      active = false
      if (delay) {
        endTimer = setTimeout(() => {
          endTimer = undefined
          onEnd(reason)
        }, delay)
      } else {
        onEnd(reason)
      }
    },
    dispose: () => {
      cancelPending()
      active = false
      state.pendingFirstResponse = null
      state.firstResponseDirty = false
    },
  }
}
