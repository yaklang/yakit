import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createChatStore } from '../chatStore'
import { AITaskStatus } from '../grpcApi'
import useLoadOlder from '../useLoadOlder'

const recovery = vi.hoisted(() => vi.fn())
const store = createChatStore()
const rawData = { grpcOffset: 1 }
vi.mock('../useCurrentSessionId', () => ({ default: () => 's' }))
vi.mock('../useCurrentDataBySession', () => ({
  useCurrentStore: () => store.renderStore,
  useCurrentRawData: () => rawData,
}))
vi.mock('../ChatMultiSessionController', () => ({
  globalSessionEngine: { requestRecoveryHistory: recovery, getSessionExecute: () => true },
}))

describe('useLoadOlder history request guards', () => {
  let root: HTMLDivElement
  let scroller: HTMLDivElement
  beforeEach(() => {
    vi.useFakeTimers()
    recovery.mockReset()
    store.reset()
    rawData.grpcOffset = 1
    root = document.createElement('div')
    scroller = document.createElement('div')
    scroller.dataset.virtuosoScroller = 'true'
    root.append(scroller)
    document.body.append(root)
    recovery.mockImplementation(() => store.getState().updateState({ grpcLoadMoreLoading: true }))
  })
  afterEach(() => {
    cleanup()
    root.remove()
    vi.clearAllTimers()
    vi.useRealTimers()
  })
  const setup = () => renderHook(() => useLoadOlder('reAct', { current: root }))

  it.each(['initial', 'loading', 'not-at-top', 'no-more'])('does not request history when %s', (state) => {
    if (state === 'initial') store.getState().updateState({ initLoading: true })
    if (state === 'loading') store.getState().updateState({ grpcLoadMoreLoading: true })
    if (state === 'not-at-top') scroller.scrollTop = 50
    if (state === 'no-more') rawData.grpcOffset = 0
    const { result } = setup()
    act(() => result.current.handleAtTopStateChange(true))
    expect(recovery).not.toHaveBeenCalled()
  })

  it.each([true, false])('only retries a queued processing request if still at top (%s)', (stayAtTop) => {
    const { result } = setup()
    act(() => store.getState().updateCurrentChatStatus({ status: AITaskStatus.inProgress }))
    act(() => result.current.handleAtTopStateChange(true))
    expect(recovery).not.toHaveBeenCalled()
    if (!stayAtTop) {
      scroller.scrollTop = 100
      act(() => result.current.handleAtTopStateChange(false))
    }
    act(() => store.getState().updateCurrentChatStatus({ status: AITaskStatus.success }))
    expect(recovery).toHaveBeenCalledTimes(stayAtTop ? 1 : 0)
  })

  it.each([0, 200])('rechecks actual scrollTop=%s after compensation before loading another batch', (top) => {
    const { result } = setup()
    act(() => result.current.handleAtTopStateChange(true))
    act(() => result.current.handleAtTopStateChange(true))
    expect(recovery).toHaveBeenCalledTimes(1)
    act(() => store.getState().updateState({ grpcLoadMoreLoading: false }))
    // 保留旧的 atTop 通知，模拟 Virtuoso 完成前插后的真实位置变化。
    scroller.scrollTop = top
    act(() => result.current.handleAtTopStateChange(true))
    expect(recovery).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersToNextFrame())
    expect(recovery).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersToNextFrame())
    expect(recovery).toHaveBeenCalledTimes(top === 0 ? 2 : 1)
    expect(result.current.isPrependingRef.current).toBe(top === 0)
  })

  it('cancels a pending compensation callback when unmounted', () => {
    const { result, unmount } = setup()
    act(() => result.current.handleAtTopStateChange(true))
    act(() => store.getState().updateState({ grpcLoadMoreLoading: false }))
    act(() => vi.advanceTimersToNextFrame())
    unmount()
    act(() => vi.advanceTimersToNextFrame())
    expect(recovery).toHaveBeenCalledTimes(1)
  })
})
