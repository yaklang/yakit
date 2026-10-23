import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  KEEP_ALIVE_IDLE_UNLOAD_MS,
  pinKeepAlive,
  resetKeepAlivePinsForTests,
  resolveKeepAliveMounted,
  subscribeKeepAlivePins,
  useKeepAliveMounted,
} from '../keepAliveResidence'

describe('resolveKeepAliveMounted', () => {
  const now = 1_000_000

  it('keeps a never-opened tab unmounted', () => {
    expect(
      resolveKeepAliveMounted({
        active: false,
        everMounted: false,
        pinned: false,
        hiddenAt: null,
        now,
      }),
    ).toEqual({ mounted: false, everMounted: false, hiddenAt: null })
  })

  it('mounts while the tab is active and clears the hidden timestamp', () => {
    expect(
      resolveKeepAliveMounted({
        active: true,
        everMounted: false,
        pinned: false,
        hiddenAt: now - 1000,
        now,
      }),
    ).toEqual({ mounted: true, everMounted: true, hiddenAt: null })
  })

  it('keeps a recently hidden tab mounted', () => {
    const hiddenAt = now - KEEP_ALIVE_IDLE_UNLOAD_MS + 1
    expect(
      resolveKeepAliveMounted({
        active: false,
        everMounted: true,
        pinned: false,
        hiddenAt,
        now,
      }).mounted,
    ).toBe(true)
  })

  it('unmounts after the idle threshold', () => {
    const hiddenAt = now - KEEP_ALIVE_IDLE_UNLOAD_MS
    const decision = resolveKeepAliveMounted({
      active: false,
      everMounted: true,
      pinned: false,
      hiddenAt,
      now,
    })
    expect(decision.mounted).toBe(false)
    expect(decision.everMounted).toBe(true)
    expect(decision.hiddenAt).toBe(hiddenAt)
  })

  it('does not unmount a pinned tab even after the threshold', () => {
    expect(
      resolveKeepAliveMounted({
        active: false,
        everMounted: true,
        pinned: true,
        hiddenAt: now - KEEP_ALIVE_IDLE_UNLOAD_MS - 1,
        now,
      }).mounted,
    ).toBe(true)
  })
})

describe('useKeepAliveMounted', () => {
  afterEach(() => {
    resetKeepAlivePinsForTests()
    vi.useRealTimers()
  })

  it('unloads a hidden tab after the idle threshold and remounts when it is shown again', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ active }) => useKeepAliveMounted(active, 'fuzzer-page'), {
      initialProps: { active: true },
    })
    expect(result.current).toBe(true)

    rerender({ active: false })
    act(() => {
      vi.advanceTimersByTime(KEEP_ALIVE_IDLE_UNLOAD_MS - 1)
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(false)

    rerender({ active: true })
    expect(result.current).toBe(true)
  })

  it('holds a hidden tab while it is pinned, then unloads once the pin is released', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ active }) => useKeepAliveMounted(active, 'mitm'), {
      initialProps: { active: true },
    })
    rerender({ active: false })
    let unpin = () => {}
    act(() => {
      unpin = pinKeepAlive('mitm')
    })
    act(() => {
      vi.advanceTimersByTime(KEEP_ALIVE_IDLE_UNLOAD_MS + 50)
    })
    expect(result.current).toBe(true)

    act(() => {
      unpin()
    })
    expect(result.current).toBe(false)
  })

  it('does not mount a tab that has never been active', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKeepAliveMounted(false, 'closed'))
    act(() => {
      vi.advanceTimersByTime(KEEP_ALIVE_IDLE_UNLOAD_MS + 10)
    })
    expect(result.current).toBe(false)
  })
})

describe('subscribeKeepAlivePins per-id', () => {
  afterEach(() => {
    resetKeepAlivePinsForTests()
  })

  it('notifies only listeners for that pin id', () => {
    const a = vi.fn()
    const b = vi.fn()
    const unsubA = subscribeKeepAlivePins('tab-a', a)
    const unsubB = subscribeKeepAlivePins('tab-b', b)
    pinKeepAlive('tab-a')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(0)
    unsubA()
    unsubB()
  })
})
