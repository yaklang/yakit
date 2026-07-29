import { describe, expect, it, vi } from 'vitest'
import { createMITMFlowCommittedRefreshScheduler } from '../HTTPFlowTable.committed'

describe('MITM FlowCommitted refresh scheduler', () => {
  it('flushes the first event immediately and keeps only the latest trailing wake-up', () => {
    vi.useFakeTimers()
    let now = 0
    const flushed: number[] = []
    const scheduler = createMITMFlowCommittedRefreshScheduler({ minIntervalMs: 50, now: () => now })

    scheduler.request(() => flushed.push(1))
    scheduler.request(() => flushed.push(2))
    scheduler.request(() => flushed.push(3))
    expect(flushed).toEqual([1])

    now = 49
    vi.advanceTimersByTime(49)
    expect(flushed).toEqual([1])
    scheduler.request(() => flushed.push(4))
    now = 50
    vi.advanceTimersByTime(1)
    expect(flushed).toEqual([1, 4])
    vi.useRealTimers()
  })

  it('cancels a pending wake-up when canary mode is disabled', () => {
    vi.useFakeTimers()
    let now = 0
    const callback = vi.fn()
    const scheduler = createMITMFlowCommittedRefreshScheduler({ minIntervalMs: 50, now: () => now })
    scheduler.request(() => {})
    scheduler.request(callback)
    scheduler.cancel()
    now = 100
    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
