import { act, cleanup, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useVirtuosoAutoScroll from '../useVirtuosoAutoScroll'

describe('历史消息位置保持', () => {
  let resize: () => void
  let scroller: HTMLDivElement
  let contentTop: number

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    scroller = document.createElement('div')
    scroller.innerHTML = '<div data-testid="virtuoso-item-list"><div data-chat-token="message-a"></div></div>'
    document.body.append(scroller)
    Object.defineProperty(scroller, 'clientHeight', { value: 100, configurable: true })
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000 })
    scroller.scrollTop = 100
    contentTop = 100
    const rect = (top: number, height: number) => ({
      top,
      bottom: top + height,
      height,
      width: 100,
      left: 0,
      right: 100,
      x: 0,
      y: top,
      toJSON: () => ({}),
    })
    vi.spyOn(scroller, 'getBoundingClientRect').mockImplementation(() => rect(0, 100))
    vi.spyOn(scroller.querySelector('[data-chat-token]')!, 'getBoundingClientRect').mockImplementation(() =>
      rect(contentTop - scroller.scrollTop, 80),
    )
  })

  afterEach(() => {
    cleanup()
    scroller.remove()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const setup = () => {
    const hook = renderHook(({ loading }) => useVirtuosoAutoScroll({ historyLoading: loading, total: 20 }), {
      initialProps: { loading: false },
    })
    act(() => hook.result.current.setScrollerRef(scroller))
    fireEvent.wheel(scroller, { deltaY: -100 })
    hook.rerender({ loading: true })
    return hook
  }

  it('提交和后续高度测量都保持同一条消息，用户继续滚动后停止校正', () => {
    const hook = setup()
    contentTop = 180
    hook.rerender({ loading: false })
    expect(scroller.scrollTop).toBe(180)
    contentTop = 240
    act(() => resize())
    expect(scroller.scrollTop).toBe(240)

    fireEvent.wheel(scroller, { deltaY: -50 })
    scroller.scrollTop = 190
    contentTop = 260
    act(() => resize())
    expect(scroller.scrollTop).toBe(190)
  })

  it('加载期间用户改变阅读位置时，使用更新后的位置', () => {
    const hook = setup()
    fireEvent.wheel(scroller, { deltaY: 30 })
    scroller.scrollTop = 130
    fireEvent.scroll(scroller)
    contentTop = 180
    hook.rerender({ loading: false })
    expect(scroller.scrollTop).toBe(210)
  })

  it('内容不足一屏时不锁定消息，允许继续补拉和首次置底', () => {
    Object.defineProperty(scroller, 'clientHeight', { value: 1200 })
    const hook = setup()
    contentTop = 180
    hook.rerender({ loading: false })
    expect(scroller.scrollTop).toBe(100)
  })
})
