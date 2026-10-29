import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createRef, type RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnchoredMenuPanel, useMenuBarLayout } from '../fuzzerEditorMenuLayout'

type RectBox = { left: number; top: number; right: number; bottom: number }

const stubRect = (el: HTMLElement, rect: RectBox) => {
  el.getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      toJSON: () => ({}),
    }) as DOMRect
}

const stubSize = (el: HTMLElement, width: number, height: number) => {
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width })
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height })
}

/** flush jsdom MutationObserver callbacks (queued as microtasks) */
const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useAnchoredMenuPanel observers', () => {
  const OriginalResizeObserver = globalThis.ResizeObserver
  const OriginalMutationObserver = globalThis.MutationObserver

  type RoInst = {
    observe: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    unobserve: ReturnType<typeof vi.fn>
    callback: ResizeObserverCallback
  }
  type MoInst = {
    observe: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    takeRecords: () => MutationRecord[]
  }

  let resizeInstances: RoInst[]
  let mutationInstances: MoInst[]

  beforeEach(() => {
    resizeInstances = []
    mutationInstances = []

    globalThis.ResizeObserver = class {
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      callback: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.callback = cb
        resizeInstances.push(this as unknown as RoInst)
      }
    } as unknown as typeof ResizeObserver

    globalThis.MutationObserver = class {
      private inner: MutationObserver
      observe: ReturnType<typeof vi.fn>
      disconnect: ReturnType<typeof vi.fn>
      takeRecords: () => MutationRecord[]
      constructor(cb: MutationCallback) {
        this.inner = new OriginalMutationObserver(cb)
        this.observe = vi.fn((target: Node, options?: MutationObserverInit) => {
          this.inner.observe(target, options)
        })
        this.disconnect = vi.fn(() => {
          this.inner.disconnect()
        })
        this.takeRecords = () => this.inner.takeRecords()
        mutationInstances.push(this as unknown as MoInst)
      }
    } as unknown as typeof MutationObserver
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    globalThis.ResizeObserver = OriginalResizeObserver
    globalThis.MutationObserver = OriginalMutationObserver
  })

  const mountPanelDom = (opts?: {
    host?: RectBox
    anchor?: RectBox
    parent?: RectBox
    panelSize?: { width: number; height: number }
  }) => {
    const host = opts?.host ?? { left: 0, top: 0, right: 800, bottom: 600 }
    const anchor = opts?.anchor ?? { left: 100, top: 120, right: 160, bottom: 148 }
    const parentBox = opts?.parent ?? { left: 100, top: 120, right: 160, bottom: 148 }
    const panelSize = opts?.panelSize ?? { width: 120, height: 80 }

    const wrapper = document.createElement('div')
    const guard = document.createElement('div')
    guard.className = 'overflow-guard'
    const scrollable = document.createElement('div')
    scrollable.className = 'monaco-scrollable-element'
    const bar = document.createElement('div')
    bar.setAttribute('data-menu-bar', '')
    const parent = document.createElement('div')
    const anchorEl = document.createElement('button')
    const panel = document.createElement('div')
    panel.setAttribute('data-menu-panel', '')

    parent.appendChild(anchorEl)
    parent.appendChild(panel)
    bar.appendChild(parent)
    scrollable.appendChild(bar)
    guard.appendChild(scrollable)
    wrapper.appendChild(guard)
    document.body.appendChild(wrapper)

    stubRect(guard, host)
    stubRect(scrollable, host)
    stubRect(bar, { left: anchor.left, top: anchor.top, right: anchor.right, bottom: anchor.bottom })
    stubRect(parent, parentBox)
    stubRect(anchorEl, anchor)
    stubSize(panel, panelSize.width, panelSize.height)
    Object.defineProperty(parent, 'clientTop', { configurable: true, value: 0 })

    const parentRef = createRef<HTMLElement | null>() as RefObject<HTMLElement | null>
    const anchorRef = createRef<HTMLElement | null>() as RefObject<HTMLElement | null>
    ;(parentRef as { current: HTMLElement | null }).current = parent
    ;(anchorRef as { current: HTMLElement | null }).current = anchorEl

    return { parent, anchorEl, panel, parentRef, anchorRef, host, bar, scrollable, guard }
  }

  it('async content / MutationObserver 触发重新摆放（宽度随内容更新）', async () => {
    const { panel, parentRef, anchorRef } = mountPanelDom({ panelSize: { width: 120, height: 80 } })

    const { result } = renderHook(() =>
      useAnchoredMenuPanel(true, parentRef, anchorRef, { x: 'left', y: 'top' }, 'insert', true),
    )

    expect(result.current.width).toBe(120)
    expect(result.current.visibility).toBe('visible')

    stubSize(panel, 240, 140)
    panel.appendChild(document.createTextNode('async-loaded-rows'))
    await flushMicrotasks()

    expect(result.current.width).toBe(240)
  })

  it('data-menu-panel-dragging 暂停尺寸监听，清除后恢复并再摆一次', async () => {
    const { panel, parentRef, anchorRef } = mountPanelDom({ panelSize: { width: 100, height: 60 } })

    const { result } = renderHook(() =>
      useAnchoredMenuPanel(true, parentRef, anchorRef, { x: 'left', y: 'top' }, 'insert', true),
    )

    expect(resizeInstances.length).toBeGreaterThanOrEqual(1)
    const resize = resizeInstances[0]
    expect(resize.observe).toHaveBeenCalled()
    const observeAfterMount = resize.observe.mock.calls.length
    const disconnectAfterMount = resize.disconnect.mock.calls.length

    expect(result.current.width).toBe(100)

    panel.setAttribute('data-menu-panel-dragging', '')
    await flushMicrotasks()

    expect(resize.disconnect.mock.calls.length).toBeGreaterThan(disconnectAfterMount)

    // 拖拽期间内容变宽也不应再 attach / 更新为新宽度（place 早退）
    stubSize(panel, 300, 60)
    panel.appendChild(document.createElement('div'))
    await flushMicrotasks()
    expect(result.current.width).toBe(100)

    panel.removeAttribute('data-menu-panel-dragging')
    await flushMicrotasks()

    expect(resize.observe.mock.calls.length).toBeGreaterThan(observeAfterMount)
    expect(result.current.width).toBe(300)
  })

  it('卸载时断开 ResizeObserver 与 MutationObserver', () => {
    const { parentRef, anchorRef } = mountPanelDom()

    const { unmount } = renderHook(() =>
      useAnchoredMenuPanel(true, parentRef, anchorRef, { x: 'left', y: 'top' }, 'insert', true),
    )

    expect(resizeInstances.length).toBeGreaterThanOrEqual(1)
    expect(mutationInstances.length).toBeGreaterThanOrEqual(1)

    const resize = resizeInstances[0]
    const moDisconnectCallsBefore = mutationInstances.map((m) => m.disconnect.mock.calls.length)

    unmount()

    expect(resize.disconnect).toHaveBeenCalled()
    mutationInstances.forEach((m, i) => {
      expect(m.disconnect.mock.calls.length).toBeGreaterThan(moDisconnectCallsBefore[i])
    })
  })
})

describe('useMenuBarLayout fold (light)', () => {
  const OriginalResizeObserver = globalThis.ResizeObserver
  let resizeInstances: Array<{
    callback: ResizeObserverCallback
    observe: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
  }>

  beforeEach(() => {
    resizeInstances = []
    globalThis.ResizeObserver = class {
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      callback: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.callback = cb
        resizeInstances.push(this as never)
      }
    } as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    globalThis.ResizeObserver = OriginalResizeObserver
  })

  const mountBar = (host: RectBox, barBox: RectBox) => {
    const wrapper = document.createElement('div')
    const guard = document.createElement('div')
    guard.className = 'overflow-guard'
    const scrollable = document.createElement('div')
    scrollable.className = 'monaco-scrollable-element'
    const bar = document.createElement('div')
    bar.setAttribute('data-menu-bar', '')
    const item = document.createElement('span')
    item.setAttribute('data-menu-item', 'a')
    bar.appendChild(item)
    scrollable.appendChild(bar)
    guard.appendChild(scrollable)
    wrapper.appendChild(guard)
    document.body.appendChild(wrapper)

    stubRect(guard, host)
    stubRect(scrollable, host)
    stubRect(bar, barBox)
    stubSize(bar, barBox.right - barBox.left, barBox.bottom - barBox.top)

    const barRef = createRef<HTMLDivElement | null>() as RefObject<HTMLDivElement | null>
    ;(barRef as { current: HTMLDivElement | null }).current = bar
    return { bar, barRef, guard, scrollable }
  }

  it('宿主放不下有文案宽度时收成图标（showLabel=false）', async () => {
    // host 宽 100；EDGE*2=16 → limit=84；条宽 180 → 不 fits
    const { barRef } = mountBar(
      { left: 0, top: 0, right: 100, bottom: 400 },
      { left: 10, top: 40, right: 190, bottom: 70 },
    )

    const { result } = renderHook(() => useMenuBarLayout(barRef, 'zh', true, { x: 'left', y: 'top' }))

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })

  it('收起后宿主变宽且连续两次 fits 时恢复文案', async () => {
    const narrow = { left: 0, top: 0, right: 100, bottom: 400 }
    const wide = { left: 0, top: 0, right: 800, bottom: 400 }
    const barBox = { left: 10, top: 40, right: 190, bottom: 70 }
    const { bar, barRef, guard, scrollable } = mountBar(narrow, barBox)

    const { result } = renderHook(() => useMenuBarLayout(barRef, 'zh', true, { x: 'left', y: 'top' }))
    await waitFor(() => expect(result.current).toBe(false))

    stubRect(guard, wide)
    stubRect(scrollable, wide)
    // 图标模式条更窄，但 labeledWidthRef 仍记着收起前的 180
    stubRect(bar, { left: 10, top: 40, right: 50, bottom: 70 })
    stubSize(bar, 40, 30)

    expect(resizeInstances.length).toBeGreaterThanOrEqual(1)
    const ro = resizeInstances[0]

    act(() => {
      ro.callback([] as unknown as ResizeObserverEntry[], ro as unknown as ResizeObserver)
    })
    expect(result.current).toBe(false)

    act(() => {
      ro.callback([] as unknown as ResizeObserverEntry[], ro as unknown as ResizeObserver)
    })
    await waitFor(() => expect(result.current).toBe(true))
  })
})
