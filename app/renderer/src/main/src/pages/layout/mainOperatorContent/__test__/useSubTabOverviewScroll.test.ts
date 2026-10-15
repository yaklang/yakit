import { act, renderHook } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { usePageInfo } from '@/store/pageInfo'
import type { MultipleNodeInfo } from '../MainOperatorContentType'
import { useSubTabOverviewScroll } from '../useSubTabOverviewScroll'

const ROUTE_KEY = 'test-webfuzzer-route'

const tab = (id: string, groupId = '0'): MultipleNodeInfo => ({
  id,
  verbose: id,
  groupId,
  sortFieId: 1,
})

const group = (id: string, children: MultipleNodeInfo[], expand = false): MultipleNodeInfo => ({
  id,
  verbose: id,
  groupId: '0',
  sortFieId: 1,
  expand,
  groupChildren: children,
})

/** jsdom 无布局：clientWidth/scrollLeft 用可写自有属性，rect 用桩值模拟 */
const setupContainer = (targets: Array<{ id: string; left: number; right: number }>) => {
  const container = document.createElement('div')
  Object.defineProperty(container, 'clientWidth', { value: 500 })
  Object.defineProperty(container, 'scrollLeft', { value: 0, writable: true, configurable: true })
  const containerRect = { left: 0, right: 500, top: 0, bottom: 32, width: 500, height: 32 } as DOMRect
  container.getBoundingClientRect = () => containerRect
  targets.forEach(({ id, left, right }) => {
    const target = document.createElement('div')
    target.setAttribute('data-rfd-draggable-id', id)
    const rect = { left, right, top: 0, bottom: 32, width: right - left, height: 32 } as DOMRect
    target.getBoundingClientRect = () => rect
    target.getClientRects = () => [rect] as unknown as DOMRectList
    container.appendChild(target)
  })
  document.body.appendChild(container)
  return container
}

const renderScrollHook = (container: HTMLElement) =>
  renderHook(() => useSubTabOverviewScroll({ pageRouteKey: ROUTE_KEY, getContainer: () => container }))

describe('useSubTabOverviewScroll', () => {
  let initialRouteKey: string
  beforeAll(() => {
    initialRouteKey = usePageInfo.getState().currentPageTabRouteKey
  })
  afterAll(() => {
    usePageInfo.setState({ currentPageTabRouteKey: initialRouteKey })
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('未分组页跳转立即滚动到目标并置一次性跳过标记', () => {
    const container = setupContainer([{ id: 'a', left: 800, right: 900 }])
    const { result } = renderScrollHook(container)
    const onUpdateGroup = vi.fn()

    let accepted = false
    act(() => {
      accepted = result.current.jumpToSubTab({ pageId: 'a', subPage: [tab('a')], onUpdateGroup })
    })
    expect(accepted).toBe(true)
    expect(onUpdateGroup).not.toHaveBeenCalled()
    // 800 - 0（容器左缘）- 60（左侧留白）= 740
    expect(container.scrollLeft).toBe(740)

    let first = true
    let second = true
    act(() => {
      first = result.current.consumeSkipTailScroll()
      second = result.current.consumeSkipTailScroll()
    })
    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  it('pageId 不存在时拒绝跳转且不置标记', () => {
    const container = setupContainer([{ id: 'a', left: 800, right: 900 }])
    const { result } = renderScrollHook(container)

    let accepted = true
    act(() => {
      accepted = result.current.jumpToSubTab({ pageId: 'missing', subPage: [tab('a')], onUpdateGroup: vi.fn() })
    })
    expect(accepted).toBe(false)
    expect(container.scrollLeft).toBe(0)

    let skip = true
    act(() => {
      skip = result.current.consumeSkipTailScroll()
    })
    expect(skip).toBe(false)
  })

  it('折叠组先展开，等 0.2s 宽度动画结束后再定位', () => {
    vi.useFakeTimers()
    const container = setupContainer([{ id: 'b', left: 800, right: 900 }])
    const { result } = renderScrollHook(container)
    const onUpdateGroup = vi.fn()
    const collapsed = group('[g]-1-group', [tab('b', '[g]-1-group')], false)

    let accepted = false
    act(() => {
      accepted = result.current.jumpToSubTab({ pageId: 'b', subPage: [collapsed], onUpdateGroup })
    })
    expect(accepted).toBe(true)
    expect(onUpdateGroup).toHaveBeenCalledWith({ ...collapsed, expand: true })
    // 组展开动画完成前不滚动
    expect(container.scrollLeft).toBe(0)

    act(() => {
      vi.advanceTimersByTime(220)
    })
    expect(container.scrollLeft).toBe(740)
  })

  it('新跳转取消上一次未完成的定位', () => {
    vi.useFakeTimers()
    const container = setupContainer([
      { id: 'a', left: 800, right: 900 },
      { id: 'b', left: 5000, right: 5100 },
    ])
    const { result } = renderScrollHook(container)
    const collapsed = group('[g]-1-group', [tab('b', '[g]-1-group')], false)
    const subPage = [collapsed, tab('a')]

    act(() => {
      result.current.jumpToSubTab({ pageId: 'b', subPage, onUpdateGroup: vi.fn() })
    })
    expect(container.scrollLeft).toBe(0)

    act(() => {
      result.current.jumpToSubTab({ pageId: 'a', subPage, onUpdateGroup: vi.fn() })
    })
    expect(container.scrollLeft).toBe(740)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    // b 的延迟定位已被新跳转取消，不会滚到 b 的位置（5000 - 60 = 4940）
    expect(container.scrollLeft).toBe(740)
  })

  it('一级页签失活后取消待执行定位', () => {
    vi.useFakeTimers()
    act(() => {
      usePageInfo.setState({ currentPageTabRouteKey: ROUTE_KEY })
    })
    const container = setupContainer([{ id: 'b', left: 800, right: 900 }])
    const { result } = renderScrollHook(container)
    const collapsed = group('[g]-1-group', [tab('b', '[g]-1-group')], false)

    act(() => {
      result.current.jumpToSubTab({ pageId: 'b', subPage: [collapsed], onUpdateGroup: vi.fn() })
    })
    expect(container.scrollLeft).toBe(0)

    // 切走到其它一级页签：容器将 display:none，待执行定位应被取消
    act(() => {
      usePageInfo.setState({ currentPageTabRouteKey: 'other-route' })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(container.scrollLeft).toBe(0)
  })

  it('卸载后取消待执行定位', () => {
    vi.useFakeTimers()
    const container = setupContainer([{ id: 'b', left: 800, right: 900 }])
    const hook = renderScrollHook(container)
    const collapsed = group('[g]-1-group', [tab('b', '[g]-1-group')], false)

    act(() => {
      hook.result.current.jumpToSubTab({ pageId: 'b', subPage: [collapsed], onUpdateGroup: vi.fn() })
    })
    hook.unmount()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(container.scrollLeft).toBe(0)
  })
})
