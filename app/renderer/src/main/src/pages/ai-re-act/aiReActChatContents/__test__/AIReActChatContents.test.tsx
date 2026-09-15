import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createContext, createRef, useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VirtuosoMockContext } from 'react-virtuoso'
import { createStore } from 'zustand/vanilla'
import type { ReActChatRenderElement } from '../../hooks/aiRender'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import type useAutoScrollFn from '../../hooks/useVirtuosoAutoScroll'
import emiter from '@/utils/eventBus/eventBus'
import { AIReActChatContents } from '../AIReActChatContents'
import type { AIReActChatContentsRef } from '../AIReActChatContentsType'

const SessionContext = createContext('session-1')
const store = createStore(() => ({
  chatElements: [] as ReActChatRenderElement[],
  initLoading: false,
  grpcLoadMoreLoading: false,
  currentLoadingTitle: { casualTitle: '', planTitle: '' },
  currentChatStatus: { coordinatorId: '', status: '' },
  currentReviewDetail: { token: '' },
  execute: false,
  items: {},
  groups: {},
  tasks: {},
}))
const initialState = store.getState()
const rawData = { contents: new Map(), grpcOffset: 0 }
const { autoScroll, recovery, locate } = vi.hoisted(() => ({
  autoScroll: vi.fn(),
  recovery: vi.fn(),
  locate: vi.fn(),
}))

vi.mock('../../hooks/useCurrentSessionId', () => {
  const useSessionIdMock = () => useContext(SessionContext)
  return { default: useSessionIdMock }
})
vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => rawData,
}))
vi.mock('../../hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: {
    requestRecoveryHistory: recovery,
    getSessionExecute: () => true,
    removeContentsFromMemory: vi.fn(),
    persistGetSessionContents: vi.fn().mockResolvedValue([]),
  },
}))
// 保留真实滚动与前插保护，仅记录调用，避免首次定位被重复自动滚动干扰。
vi.mock('../../hooks/useVirtuosoAutoScroll', async (importOriginal) => {
  const { default: useAutoScroll } = await importOriginal<{ default: typeof useAutoScrollFn }>()
  const useAutoScrollMock = (...args: Parameters<typeof useAutoScroll>) => {
    const result = useAutoScroll(...args)
    return {
      ...result,
      handleTotalListHeightChanged: () => {
        autoScroll()
        result.handleTotalListHeightChanged()
      },
      scrollToItemIndex: (...scrollArgs: Parameters<typeof result.scrollToItemIndex>) => {
        locate(...scrollArgs)
        result.scrollToItemIndex(...scrollArgs)
      },
    }
  }
  return { default: useAutoScrollMock }
})
// 消息内容用固定尺寸文本代替，Virtuoso、加载组件及滚动 hooks 均使用真实实现。
vi.mock('@/pages/ai-agent/components/aiChatListItem/AIChatListItem', () => ({
  AIChatListItem: ({ item }: { item: ReActChatRenderElement }) => <div>消息 {item.token}</div>,
}))
vi.mock('@/pages/ai-agent/components/aiMarkdown/AIMarkdown', () => ({ AIMarkdown: () => null }))
vi.mock('@/pages/ai-agent/components/aiStreamChatContent/AIStreamChatContent', () => ({
  AIStreamChatContent: () => null,
}))
vi.mock('@/pages/ai-agent/components/StreamCard', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/components/aiYaklangCode/AIYaklangCode', () => ({ AIYaklangCode: () => null }))
vi.mock('@/pages/ai-agent/components/aiTextSyntaxFlow/AITextSyntaxFlow', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/components/aiGroupStreamCard/AIGroupStreamCard', () => ({ Code: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/TaskLoading/TaskLoading', () => ({ ScrollText: () => null }))

const VIEWPORT_HEIGHT = 400
const ITEM_HEIGHT = 80
const createItems = (count: number, start = 0): ReActChatRenderElement[] =>
  Array.from({ length: count }, (_, index) => {
    const token = `${start + index}`
    rawData.contents.set(token, { stageSettled: true })
    return { token, kind: 'item', chatType: 'reAct', isHistory: true }
  })
const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
const originalScrollBy = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollBy')
const scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
  this.scrollTop = options.top ?? 0
  this.dispatchEvent(new Event('scroll'))
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  store.setState(initialState, true)
  rawData.contents.clear()
  rawData.grpcOffset = 0
  recovery.mockImplementation(() => store.setState({ grpcLoadMoreLoading: true }))
  // jsdom 无布局，使用 Virtuoso 官方尺寸上下文并模拟滚动容器几何信息。
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT_HEIGHT)
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(
    () => store.getState().chatElements.length * ITEM_HEIGHT,
  )
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    height: VIEWPORT_HEIGHT,
    width: 800,
    top: 0,
    bottom: VIEWPORT_HEIGHT,
    left: 0,
    right: 800,
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

const chatElement = (sessionId = 'session-1', ref = createRef<AIReActChatContentsRef>()) => (
  <SessionContext.Provider value={sessionId}>
    <VirtuosoMockContext.Provider value={{ viewportHeight: VIEWPORT_HEIGHT, itemHeight: ITEM_HEIGHT }}>
      <AIReActChatContents ref={ref} />
    </VirtuosoMockContext.Provider>
  </SessionContext.Provider>
)
const getScroller = () => document.querySelector<HTMLElement>('[data-virtuoso-scroller]')!
const isSpinning = () => document.querySelector('.ant-spin-spinning') !== null
const finishPositioning = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
}

describe('AIReActChatContents 首屏加载', () => {
  it.each([1, 20])('已有 %s 条消息时先显示 loading，定位完成后显示消息', async (count) => {
    store.setState({ chatElements: createItems(count) })
    render(chatElement())
    expect(isSpinning()).toBe(true)
    expect(getScroller()).toHaveStyle({ visibility: 'hidden' })
    expect(screen.getByText('当前会话已停止')).not.toBeVisible()
    expect(autoScroll).not.toHaveBeenCalled()

    await finishPositioning()
    expect(isSpinning()).toBe(false)
    expect(screen.getByText(`消息 ${count - 1}`)).toBeVisible()
    expect(getScroller().scrollTop).toBe(Math.max(0, count * ITEM_HEIGHT - VIEWPORT_HEIGHT))
    expect(autoScroll).not.toHaveBeenCalled()
  })

  it('空会话不空转，首批消息晚到时等待列表定位完成', async () => {
    render(chatElement())
    expect(isSpinning()).toBe(false)
    act(() => store.setState({ initLoading: true }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(isSpinning()).toBe(false)
    act(() => store.setState({ chatElements: createItems(20), initLoading: false }))
    expect(getScroller()).toHaveStyle({ visibility: 'hidden' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(isSpinning()).toBe(true)
    await finishPositioning()
    expect(isSpinning()).toBe(false)
    expect(screen.getByText('消息 19')).toBeVisible()
  })

  it.each([0, 20])('会话恢复期间由外层显示 loading，列表不重复转圈（消息数：%s）', async (count) => {
    store.setState({ initLoading: true, chatElements: createItems(count) })
    render(chatElement())
    expect(isSpinning()).toBe(false)
    await finishPositioning()
    expect(isSpinning()).toBe(false)
    act(() => store.setState({ initLoading: false }))
    expect(isSpinning()).toBe(false)
    expect(getScroller()).not.toHaveStyle({ visibility: 'hidden' })
  })

  it('就绪后新增消息继续自动跟随，用户上滑时不抢滚动位置', async () => {
    store.setState({ chatElements: createItems(20) })
    render(chatElement())
    await finishPositioning()
    act(() => store.setState({ chatElements: createItems(21) }))
    expect(isSpinning()).toBe(false)
    await finishPositioning()
    expect(autoScroll).toHaveBeenCalled()
    expect(getScroller().scrollTop).toBe(21 * ITEM_HEIGHT - VIEWPORT_HEIGHT)

    fireEvent.wheel(getScroller(), { deltaY: -100 })
    fireEvent.scroll(getScroller(), { target: { scrollTop: 400 } })
    act(() => store.setState({ chatElements: createItems(22) }))
    await finishPositioning()
    expect(getScroller().scrollTop).toBe(400)
    expect(isSpinning()).toBe(false)
  })

  it('切换会话重新等待首屏，清理旧定位监听，并保持 ref 定位可用', async () => {
    store.setState({ chatElements: createItems(20) })
    const ref = createRef<AIReActChatContentsRef>()
    const result = render(chatElement('session-1', ref))
    const scrollToItemIndex = ref.current?.scrollToItemIndex
    await finishPositioning()
    result.rerender(chatElement('session-2', ref))
    expect(isSpinning()).toBe(true)
    expect(getScroller()).toHaveStyle({ visibility: 'hidden' })
    await finishPositioning()
    expect(isSpinning()).toBe(false)
    expect(emiter.all.get('onAITreeLocatePlanningList')).toHaveLength(1)

    expect(ref.current?.scrollToItemIndex).toBe(scrollToItemIndex)
    act(() => scrollToItemIndex?.(3, 'auto'))
    expect(locate).toHaveBeenLastCalledWith(3, 'auto')
    rawData.contents.set('2', { type: AIChatQSDataTypeEnum.TASK_NODE_GROUP, data: { taskId: 'task-2' } })
    act(() => emiter.emit('onAITreeLocatePlanningList', 'task-2'))
    expect(locate).toHaveBeenLastCalledWith(2, 'auto')
    expect(locate).toHaveBeenCalledTimes(2)
    result.unmount()
    expect(emiter.all.get('onAITreeLocatePlanningList') ?? []).toHaveLength(0)
  })

  it('向上加载历史时只使用顶部 loading，前插后保留阅读位置', async () => {
    store.setState({ chatElements: createItems(20) })
    render(chatElement())
    await finishPositioning()
    rawData.grpcOffset = 1
    fireEvent.wheel(getScroller(), { deltaY: -100 })
    fireEvent.scroll(getScroller(), { target: { scrollTop: 0 } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(recovery).toHaveBeenCalledWith('session-1')
    expect(getScroller()).not.toHaveStyle({ visibility: 'hidden' })
    expect(screen.getByText('消息 0')).toBeVisible()
    expect(isSpinning()).toBe(true)

    rawData.grpcOffset = 0
    act(() => store.setState({ chatElements: [...createItems(5, -5), ...createItems(20)], grpcLoadMoreLoading: false }))
    await finishPositioning()
    expect(isSpinning()).toBe(false)
    expect(screen.getByText('消息 0')).toBeVisible()
    expect(getScroller().scrollTop).toBeLessThan(25 * ITEM_HEIGHT - VIEWPORT_HEIGHT)
  })
})
