import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHTTPFuzzerRun } from '../httpFuzzerRun'

describe('HTTP Fuzzer run lifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = () => {
    const onUpdate = vi.fn()
    const onEnd = vi.fn()
    const run = createHTTPFuzzerRun({ onUpdate, onEnd })
    return { run, onUpdate, onEnd }
  }

  it('starts counters and pending response from zero on a fresh run after a stop', () => {
    const { run, onUpdate, onEnd } = setup()
    run.state.count = 3
    run.state.successCount = 2
    run.state.failedCount = 1
    run.state.firstResponseDirty = true
    run.update()
    run.finish('cancel')

    expect(onUpdate).toHaveBeenCalledOnce()
    expect(onEnd).toHaveBeenCalledOnce()
    // Stopping preserves the completed portion of this run.
    expect(run.state.successCount).toBe(2)
    expect(run.isActive()).toBe(false)
    // A fresh send builds a brand-new run instead of reactivating the old one.
    const fresh = setup()
    expect(fresh.run.state).toMatchObject({ count: 0, successCount: 0, failedCount: 0, firstResponseDirty: false })
    expect(fresh.run.state.pendingFirstResponse).toBeNull()
    expect(fresh.run.isActive()).toBe(true)
    expect(fresh.run.state.count++).toBe(0)
    expect(fresh.run.state.successCount + 1).toBe(1)
    vi.runAllTimers()
    expect(onUpdate).toHaveBeenCalledOnce()
  })

  it('finishes on a terminal error without needing a later end', () => {
    const { run, onUpdate, onEnd } = setup()
    run.state.count = 1
    run.state.failedCount = 1
    run.update()
    run.finish('error')
    expect(run.isActive()).toBe(false)
    expect(onUpdate).toHaveBeenCalledOnce()
    expect(onEnd).toHaveBeenCalledOnce()
    run.finish('cancel')
    run.update()
    vi.runAllTimers()
    expect(onEnd).toHaveBeenCalledOnce()
    expect(onUpdate).toHaveBeenCalledOnce()
  })

  it('cancels an old completion callback when the stream rotates', () => {
    const { run, onEnd } = setup()
    run.finish('complete', 500)
    run.dispose()
    vi.advanceTimersByTime(500)
    expect(onEnd).not.toHaveBeenCalled()
    expect(run.isActive()).toBe(false)
  })

  it('drops a pending throttled update when the run is disposed', () => {
    const { run, onUpdate } = setup()
    run.update()
    run.dispose()
    vi.advanceTimersByTime(500)
    expect(onUpdate).not.toHaveBeenCalled()
    run.update()
    vi.advanceTimersByTime(500)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('flushes completion once and preserves counts for a hidden tab', () => {
    const { run, onUpdate, onEnd } = setup()
    run.state.count = 3
    run.state.successCount = 3
    run.update()
    run.finish('complete', 500)
    expect(onUpdate).toHaveBeenCalledOnce()
    expect(run.state.successCount).toBe(3)
    vi.advanceTimersByTime(500)
    expect(onUpdate).toHaveBeenCalledOnce()
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('disposes pending updates and completion without notifying an unmounted page', () => {
    const { run, onEnd } = setup()
    run.finish('complete', 500)
    run.dispose()
    vi.runAllTimers()
    expect(onEnd).not.toHaveBeenCalled()
    expect(run.isActive()).toBe(false)
    const next = setup()
    next.run.update()
    next.run.dispose()
    vi.runAllTimers()
    expect(next.onUpdate).not.toHaveBeenCalled()
  })
})
