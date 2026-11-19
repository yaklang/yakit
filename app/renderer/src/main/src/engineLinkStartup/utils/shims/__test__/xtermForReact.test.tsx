import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { XTerm, type XTermRef } from 'xterm-for-react'

const { FakeTerminal, instances } = vi.hoisted(() => {
  const instances: FakeTerminal[] = []
  class FakeTerminal {
    options: unknown
    onDataCb: ((data: string) => void) | null = null
    onKeyCb: ((event: { key: string; domEvent: KeyboardEvent }) => void) | null = null
    onResizeCb: ((event: { cols: number; rows: number }) => void) | null = null
    customKeyHandler: ((event: KeyboardEvent) => boolean) | null = null
    openedWith: Element | null = null
    disposed = false
    constructor(options?: unknown) {
      this.options = options
      instances.push(this)
    }
    onData(cb: (data: string) => void) {
      this.onDataCb = cb
      return { dispose: () => undefined }
    }
    onKey(cb: (event: { key: string; domEvent: KeyboardEvent }) => void) {
      this.onKeyCb = cb
      return { dispose: () => undefined }
    }
    onResize(cb: (event: { cols: number; rows: number }) => void) {
      this.onResizeCb = cb
      return { dispose: () => undefined }
    }
    attachCustomKeyEventHandler(cb: (event: KeyboardEvent) => boolean) {
      this.customKeyHandler = cb
    }
    open(el: Element) {
      this.openedWith = el
    }
    dispose() {
      this.disposed = true
    }
  }
  return { FakeTerminal, instances }
})

vi.mock('@xterm/xterm', () => ({ Terminal: FakeTerminal }))

describe('xtermForReact shim', () => {
  beforeEach(() => {
    instances.length = 0
  })

  it('经 ref 暴露 terminal 实例，rerender 后实例保持稳定', () => {
    const ref = createRef<XTermRef>()
    const { rerender } = render(<XTerm ref={ref} options={{ rows: 12 }} />)
    expect(ref.current?.terminal).toBe(instances[0])
    expect(instances[0].options).toEqual({ rows: 12 })

    rerender(<XTerm ref={ref} options={{ rows: 24 }} />)
    expect(ref.current?.terminal).toBe(instances[0])
    expect(instances).toHaveLength(1)
  })

  it('terminal open 到容器 div，并透传 className', () => {
    const ref = createRef<XTermRef>()
    render(<XTerm ref={ref} className="my-xterm" />)
    const term = instances[0]
    expect(term.openedWith).toBeInstanceOf(HTMLDivElement)
    expect((term.openedWith as HTMLElement).className).toBe('my-xterm')
  })

  it('onData 事件转发到最新一次 render 的回调', () => {
    const onData1 = vi.fn()
    const onData2 = vi.fn()
    const { rerender } = render(<XTerm onData={onData1} />)
    rerender(<XTerm onData={onData2} />)

    instances[0].onDataCb?.('hello')
    expect(onData1).not.toHaveBeenCalled()
    expect(onData2).toHaveBeenCalledWith('hello')
  })

  it('onKey 事件转发到 props 回调', () => {
    const onKey = vi.fn()
    render(<XTerm onKey={onKey} />)
    const event = { key: 'a', domEvent: new KeyboardEvent('keydown') }
    instances[0].onKeyCb?.(event)
    expect(onKey).toHaveBeenCalledWith(event)
  })

  it('onResize 事件转发到 props 回调（xtermFit 自适应依赖）', () => {
    const onResize = vi.fn()
    render(<XTerm onResize={onResize} />)
    instances[0].onResizeCb?.({ cols: 80, rows: 24 })
    expect(onResize).toHaveBeenCalledWith({ cols: 80, rows: 24 })
  })

  it('customKeyEventHandler 透传，未传时返回 true', () => {
    const handler = vi.fn(() => false)
    const { rerender } = render(<XTerm customKeyEventHandler={handler} />)
    const term = instances[0]
    const event = new KeyboardEvent('keydown')
    expect(term.customKeyHandler?.(event)).toBe(false)

    rerender(<XTerm />)
    expect(term.customKeyHandler?.(event)).toBe(true)
  })

  it('卸载时 dispose terminal', () => {
    const { unmount } = render(<XTerm />)
    const term = instances[0]
    unmount()
    expect(term.disposed).toBe(true)
  })
})
