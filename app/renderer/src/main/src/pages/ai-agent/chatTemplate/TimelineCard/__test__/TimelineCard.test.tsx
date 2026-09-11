import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createContext, useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VirtuosoMockContext } from 'react-virtuoso'
import { createStore } from 'zustand/vanilla'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import type useAutoScrollFn from '@/pages/ai-re-act/hooks/useVirtuosoAutoScroll'
import TimelineCard from '../TimelineCard'

const store = createStore(() => ({ reActTimelines: [] as AIAgentGrpcApi.TimelineItem[], timelinesLoading: false }))
const SessionContext = createContext('session-1')
const { autoScroll, hasMore, loadMore } = vi.hoisted(() => ({
  autoScroll: vi.fn(),
  hasMore: vi.fn(() => false),
  loadMore: vi.fn(),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => store }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => {
  // 与真实 hook 一样订阅 Context，使会话切换能够触发 memo 组件更新。
  const useSessionIdMock = () => useContext(SessionContext)
  return { default: useSessionIdMock }
})
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { hasMoreTimeline: hasMore, loadTimelineHistory: loadMore },
}))
// 仅记录自动跟随调用，保留真实 hook 的滚动和向上加载保护。
vi.mock('@/pages/ai-re-act/hooks/useVirtuosoAutoScroll', async (importOriginal) => {
  const { default: useAutoScroll } = await importOriginal<{ default: typeof useAutoScrollFn }>()
  const useAutoScrollMock = (...args: Parameters<typeof useAutoScroll>) => {
    const result = useAutoScroll(...args)
    return {
      ...result,
      handleTotalListHeightChanged: () => {
        autoScroll()
        result.handleTotalListHeightChanged()
      },
    }
  }
  return { default: useAutoScrollMock }
})
vi.mock('@/utils/timeUtil', () => ({ formatTime: () => '' }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>暂无数据</div> }))

const VIEWPORT_HEIGHT = 400
const ITEM_HEIGHT = 80
const createItems = (count: number, start = 0): AIAgentGrpcApi.TimelineItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: start + index,
    timestamp: 1,
    type: 'text',
    content: `时间线内容 ${start + index}`,
    deleted: false,
  }))
const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
const originalScrollBy = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollBy')
const scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
  this.scrollTop = options.top ?? 0
  this.dispatchEvent(new Event('scroll'))
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  hasMore.mockReturnValue(false)
  loadMore.mockReset()
  store.setState({ reActTimelines: [], timelinesLoading: false })
  // jsdom 没有布局，使用官方尺寸上下文并补充滚动容器几何信息。
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT_HEIGHT)
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(
    () => store.getState().reActTimelines.length * ITEM_HEIGHT,
  )
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    height: VIEWPORT_HEIGHT,
    width: 300,
    top: 0,
    bottom: VIEWPORT_HEIGHT,
    left: 0,
    right: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: scrollTo })
  Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions) {
      scrollTo.call(this, { top: this.scrollTop + (options.top ?? 0) })
    },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  if (originalScrollTo) Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  if (originalScrollBy) Object.defineProperty(HTMLElement.prototype, 'scrollBy', originalScrollBy)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy')
})

const timelineElement = (sessionId = 'session-1') => (
  <SessionContext.Provider value={sessionId}>
    <VirtuosoMockContext.Provider value={{ viewportHeight: VIEWPORT_HEIGHT, itemHeight: ITEM_HEIGHT }}>
      <TimelineCard />
    </VirtuosoMockContext.Provider>
  </SessionContext.Provider>
)
const renderTimeline = () => render(timelineElement())
const getScroller = () => document.querySelector<HTMLElement>('[data-virtuoso-scroller]')!
const isSpinning = () => document.querySelector('.ant-spin-spinning') !== null
const finishPositioning = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
}

describe('TimelineCard 首次定位', () => {
  it.each([1, 20])('已有 %s 条数据时覆盖列表隐藏阶段，首次定位到底部后才结束加载', async (count) => {
    store.setState({ reActTimelines: createItems(count) })
    renderTimeline()
    expect(isSpinning()).toBe(true)
    expect(screen.getByTestId('virtuoso-item-list')).toHaveStyle({ visibility: 'hidden' })
    expect(autoScroll).not.toHaveBeenCalled()

    await finishPositioning()
    expect(screen.getByTestId('virtuoso-item-list')).not.toHaveStyle({ visibility: 'hidden' })
    expect(isSpinning()).toBe(false)
    expect(screen.getByText(`时间线内容 ${count - 1}`)).toBeVisible()
    expect(getScroller().scrollTop).toBe(Math.max(0, count * ITEM_HEIGHT - VIEWPORT_HEIGHT))
    expect(autoScroll).not.toHaveBeenCalled()
  })

  it('空数据保持空态，首批数据晚到时等待定位完成再停止加载', async () => {
    renderTimeline()
    expect(screen.getByText('暂无数据')).toBeVisible()
    expect(isSpinning()).toBe(false)
    act(() => store.setState({ timelinesLoading: true }))
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(isSpinning()).toBe(true)

    act(() => store.setState({ reActTimelines: createItems(20), timelinesLoading: false }))
    expect(isSpinning()).toBe(true)
    await finishPositioning()
    expect(isSpinning()).toBe(false)
    expect(getScroller().scrollTop).toBe(20 * ITEM_HEIGHT - VIEWPORT_HEIGHT)
    expect(screen.getByText('时间线内容 19')).toBeVisible()
  })

  it('首次就绪后继续跟随新增数据，用户向上滚动后不强制回到底部', async () => {
    store.setState({ reActTimelines: createItems(20) })
    renderTimeline()
    await finishPositioning()
    act(() => store.setState({ reActTimelines: createItems(21) }))
    await finishPositioning()
    expect(autoScroll).toHaveBeenCalled()
    expect(getScroller().scrollTop).toBe(21 * ITEM_HEIGHT - VIEWPORT_HEIGHT)

    fireEvent.wheel(getScroller(), { deltaY: -100 })
    fireEvent.scroll(getScroller(), { target: { scrollTop: 400 } })
    act(() => store.setState({ reActTimelines: createItems(22) }))
    await finishPositioning()
    expect(getScroller().scrollTop).toBe(400)
    expect(isSpinning()).toBe(false)
  })

  it('切换会话后重新定位和展示首屏加载状态', async () => {
    store.setState({ reActTimelines: createItems(20) })
    const result = renderTimeline()
    await finishPositioning()
    result.rerender(timelineElement('session-2'))
    expect(isSpinning()).toBe(true)
    await finishPositioning()
    expect(isSpinning()).toBe(false)
    expect(getScroller().scrollTop).toBe(20 * ITEM_HEIGHT - VIEWPORT_HEIGHT)
  })

  it('向上加载历史后保留当前内容位置，完成后清除请求加载提示', async () => {
    store.setState({ reActTimelines: createItems(20) })
    renderTimeline()
    await finishPositioning()
    hasMore.mockReturnValue(true)
    loadMore.mockImplementation(() => store.setState({ timelinesLoading: true }))
    fireEvent.wheel(getScroller(), { deltaY: -100 })
    fireEvent.scroll(getScroller(), { target: { scrollTop: 0 } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(loadMore).toHaveBeenCalledWith('session-1')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(isSpinning()).toBe(true)

    hasMore.mockReturnValue(false)
    act(() => store.setState({ reActTimelines: [...createItems(5, -5), ...createItems(20)], timelinesLoading: false }))
    await finishPositioning()
    expect(getScroller().scrollTop).toBeLessThan(25 * ITEM_HEIGHT - VIEWPORT_HEIGHT)
    expect(screen.getByText('时间线内容 0')).toBeVisible()
    expect(isSpinning()).toBe(false)
  })
})
