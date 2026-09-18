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

  it('starts counters and pending response from zero after a stop without end', () => {
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
    run.reset()
    expect(run.state).toMatchObject({ count: 0, successCount: 0, failedCount: 0, firstResponseDirty: false })
    expect(run.state.pendingFirstResponse).toBeNull()
    expect(run.isActive()).toBe(true)
    const nextRowIndex = run.state.count++
    run.state.successCount++
    expect(nextRowIndex).toBe(0)
    expect(run.state.successCount).toBe(1)
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

  it('cancels an old completion callback when another run starts', () => {
    const { run, onEnd } = setup()
    run.finish('complete', 500)
    run.reset()
    vi.advanceTimersByTime(500)
    expect(onEnd).not.toHaveBeenCalled()
    expect(run.isActive()).toBe(true)
  })

  it('cancels a pending throttled update on reset', () => {
    const { run, onUpdate } = setup()
    run.update()
    run.reset()
    vi.advanceTimersByTime(500)
    expect(onUpdate).not.toHaveBeenCalled()
    run.update()
    vi.advanceTimersByTime(500)
    expect(onUpdate).toHaveBeenCalledOnce()
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
