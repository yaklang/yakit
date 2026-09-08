import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { createRef } from 'react'
import ReactResizeDetector from 'react-resize-detector'

class MockResizeObserver {
  static instances: MockResizeObserver[] = []
  observed: Element[] = []
  disconnected = 0
  callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe(el: Element) {
    this.observed.push(el)
  }

  unobserve(el: Element) {
    this.observed = this.observed.filter((e) => e !== el)
  }

  disconnect() {
    this.disconnected += 1
    this.observed = []
  }

  trigger(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }
}

describe('reactResizeDetector shim', () => {
  beforeEach(() => {
    MockResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('children 原位渲染不被丢弃（YakEditor 编辑器子树回归）', () => {
    render(
      <div style={{ width: 100, height: 200 }}>
        <ReactResizeDetector onResize={() => {}}>
          <div data-testid="editor-body">monaco-editor</div>
        </ReactResizeDetector>
      </div>,
    )
    expect(screen.getByTestId('editor-body')).toBeInTheDocument()
    expect(screen.getByTestId('editor-body')).toHaveTextContent('monaco-editor')
  })

  it('无 children：观测父元素并回调尺寸，同尺寸不重复回调', () => {
    const onResize = vi.fn()
    render(
      <div data-testid="parent">
        <ReactResizeDetector onResize={onResize} />
      </div>,
    )
    const observer = MockResizeObserver.instances.at(-1)!
    expect(observer.observed).toHaveLength(1)
    expect(observer.observed[0]).toBe(screen.getByTestId('parent'))

    act(() => observer.trigger(320, 240))
    expect(onResize).toHaveBeenCalledTimes(1)
    expect(onResize).toHaveBeenCalledWith(320, 240)

    act(() => observer.trigger(320, 240))
    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('refreshMode=debounce：窗口内多次触发只回调一次，取最后一次尺寸', () => {
    vi.useFakeTimers()
    const onResize = vi.fn()
    render(
      <div>
        <ReactResizeDetector onResize={onResize} refreshMode="debounce" refreshRate={50} />
      </div>,
    )
    const observer = MockResizeObserver.instances.at(-1)!
    act(() => {
      observer.trigger(100, 100)
      observer.trigger(120, 80)
    })
    expect(onResize).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(onResize).toHaveBeenCalledTimes(1)
    expect(onResize).toHaveBeenCalledWith(120, 80)
    vi.useRealTimers()
  })

  it('传 targetRef 时观测 targetRef.current 而非父元素', () => {
    const targetRef = createRef<HTMLDivElement>()
    render(
      <div data-testid="parent">
        <div ref={targetRef} data-testid="target" />
        <ReactResizeDetector onResize={vi.fn()} targetRef={targetRef} />
      </div>,
    )
    const observer = MockResizeObserver.instances.at(-1)!
    expect(observer.observed).toHaveLength(1)
    expect(observer.observed[0]).toBe(screen.getByTestId('target'))
  })

  it('卸载时断开 observer', () => {
    const { unmount } = render(
      <div>
        <ReactResizeDetector onResize={vi.fn()} />
      </div>,
    )
    const observer = MockResizeObserver.instances.at(-1)!
    unmount()
    expect(observer.disconnected).toBe(1)
  })
})
