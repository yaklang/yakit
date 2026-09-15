import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useVirtuosoInitialRender, useVirtuosoListReady } from '../useVirtuosoInitialRender'

type ListReadyProps = Parameters<typeof useVirtuosoListReady>[0]

describe('useVirtuosoInitialRender', () => {
  it('空列表不显示 loading，首批数据到达后等待就绪，后续追加不重新加载', () => {
    const onHeightChanged = vi.fn()
    const { result, rerender } = renderHook(
      ({ dataLength }) => useVirtuosoInitialRender({ dataLength, onHeightChanged }),
      { initialProps: { dataLength: 0 } },
    )
    expect(result.current.renderLoading).toBe(false)
    expect(result.current.initialTopMostItemIndex).toEqual({ index: 'LAST', align: 'end', behavior: 'auto' })

    rerender({ dataLength: 2 })
    expect(result.current.renderLoading).toBe(true)
    act(() => result.current.virtuosoContext.onReady())
    expect(result.current.renderLoading).toBe(false)

    rerender({ dataLength: 3 })
    expect(result.current.renderLoading).toBe(false)
  })

  it('首次定位前拦截高度回调，就绪后通过已有引用调用最新回调', () => {
    const firstCallback = vi.fn()
    const nextCallback = vi.fn()
    const { result, rerender } = renderHook(
      ({ onHeightChanged }) => useVirtuosoInitialRender({ dataLength: 2, onHeightChanged }),
      { initialProps: { onHeightChanged: firstCallback } },
    )
    // Virtuoso 可能保留之前收到的回调引用，该引用仍须读取最新状态。
    const handleHeightChanged = result.current.handleListHeightChanged
    act(() => handleHeightChanged())
    expect(firstCallback).not.toHaveBeenCalled()

    act(() => result.current.virtuosoContext.onReady())
    act(() => handleHeightChanged())
    expect(firstCallback).toHaveBeenCalledTimes(1)

    rerender({ onHeightChanged: nextCallback })
    act(() => handleHeightChanged())
    expect(firstCallback).toHaveBeenCalledTimes(1)
    expect(nextCallback).toHaveBeenCalledTimes(1)
  })

  it('不同列表的就绪状态互不影响，重新挂载时重新等待首屏', () => {
    const timeline = renderHook(() => useVirtuosoInitialRender({ dataLength: 2, onHeightChanged: vi.fn() }))
    const chat = renderHook(() => useVirtuosoInitialRender({ dataLength: 2, onHeightChanged: vi.fn() }))
    act(() => timeline.result.current.virtuosoContext.onReady())
    expect(timeline.result.current.renderLoading).toBe(false)
    expect(chat.result.current.renderLoading).toBe(true)

    timeline.unmount()
    const nextSession = renderHook(() => useVirtuosoInitialRender({ dataLength: 2, onHeightChanged: vi.fn() }))
    expect(nextSession.result.current.renderLoading).toBe(true)
    expect(chat.result.current.renderLoading).toBe(true)
  })
})

describe('useVirtuosoListReady', () => {
  it('空列表和仅挂载但仍被隐藏的列表不通知就绪，首次定位完成后再通知', () => {
    const onReady = vi.fn()
    const context = { onReady }
    const initialProps: ListReadyProps = { children: null, style: {}, context }
    const { rerender } = renderHook(useVirtuosoListReady, { initialProps })
    expect(onReady).not.toHaveBeenCalled()

    rerender({ children: [], style: {}, context })
    expect(onReady).not.toHaveBeenCalled()
    rerender({ children: <div>消息</div>, style: { visibility: 'hidden' }, context })
    expect(onReady).not.toHaveBeenCalled()

    rerender({ children: <div>消息</div>, style: {}, context })
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('可见的空列表收到首批内容时通知就绪', () => {
    const onReady = vi.fn()
    const context = { onReady }
    const initialProps: ListReadyProps = { children: null, style: {}, context }
    const { rerender } = renderHook(useVirtuosoListReady, { initialProps })
    expect(onReady).not.toHaveBeenCalled()

    rerender({ children: <div>消息</div>, style: {}, context })
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('等待期间 Context 回调变化时，通知最新的接收方', () => {
    const firstCallback = vi.fn()
    const nextCallback = vi.fn()
    const children = <div>消息</div>
    const initialProps: ListReadyProps = {
      children,
      style: { visibility: 'hidden' },
      context: { onReady: firstCallback },
    }
    const { rerender } = renderHook(useVirtuosoListReady, { initialProps })
    rerender({ children, style: { visibility: 'hidden' }, context: { onReady: nextCallback } })
    expect(firstCallback).not.toHaveBeenCalled()
    expect(nextCallback).not.toHaveBeenCalled()

    rerender({ children, style: { visibility: 'visible' }, context: { onReady: nextCallback } })
    expect(firstCallback).not.toHaveBeenCalled()
    expect(nextCallback).toHaveBeenCalledTimes(1)
  })
})
