import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createRef, StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AsciiRipple from '../AsciiRipple'
import type { AsciiRippleHandle } from '../AsciiRipple'

let target: HTMLDivElement
let requestFrame: ReturnType<typeof vi.fn>
let context: { fillText: ReturnType<typeof vi.fn>; [key: string]: unknown }
let frame: FrameRequestCallback | undefined
let resize: (() => void) | undefined

beforeEach(() => {
  target = document.createElement('div')
  document.body.append(target)
  frame = undefined
  resize = undefined
  requestFrame = vi.fn((callback: FrameRequestCallback) => {
    frame = callback
    return 1
  })
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
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
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 640,
    bottom: 400,
    width: 640,
    height: 400,
    toJSON() {},
  })
  context = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    measureText: () => ({ width: 10 }),
    getImageData: () => {
      const value = context.fillStyle === '#ffffff' ? 255 : 128
      return { data: new Uint8ClampedArray([value, value, value, 255]) }
    },
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'clientWidth', 'get').mockReturnValue(640)
  vi.spyOn(HTMLCanvasElement.prototype, 'clientHeight', 'get').mockReturnValue(400)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  cleanup()
  target.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mount() {
  const result = render(<AsciiRipple interactionTargetRef={{ current: target }} vignette={0} />)
  await act(async () => {
    await Promise.resolve()
  })
  return result
}

describe('AsciiRipple 背景交互', () => {
  it('响应覆盖层的移动事件，卸载后移除监听', async () => {
    const { unmount } = await mount()
    fireEvent.pointerMove(target, { clientX: 100, clientY: 120 })
    expect(requestFrame).toHaveBeenCalledOnce()
    unmount()
    requestFrame.mockClear()
    fireEvent.pointerMove(target, { clientX: 140, clientY: 120 })
    expect(requestFrame).not.toHaveBeenCalled()
  })

  it('排除标记区域的移动和点击，但不拦截按钮操作', async () => {
    await mount()
    const panel = document.createElement('div')
    panel.setAttribute('data-ai-ripple-disabled', '')
    const button = document.createElement('button')
    const click = vi.fn()
    button.addEventListener('click', click)
    panel.append(button)
    target.append(panel)
    fireEvent.pointerMove(button, { clientX: 100, clientY: 120 })
    fireEvent.pointerDown(button, { clientX: 100, clientY: 120 })
    fireEvent.click(button)
    expect(requestFrame).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledOnce()
  })

  it('点击覆盖层时启动波纹动画', async () => {
    await mount()
    fireEvent.pointerDown(target, { clientX: 100, clientY: 120 })
    expect(requestFrame).toHaveBeenCalledOnce()
  })

  it('连续点击只保留一个帧循环，calm 停止动画', async () => {
    const ref = createRef<AsciiRippleHandle>()
    render(<AsciiRipple ref={ref} vignette={0} />)
    await act(async () => {
      await Promise.resolve()
    })
    for (let i = 0; i < 20; i++) ref.current!.drop(200, 200)
    expect(requestFrame).toHaveBeenCalledOnce()
    ref.current!.calm()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('单次点击复用背景并合并同色文字，缩小重绘区域', async () => {
    const ref = createRef<AsciiRippleHandle>()
    render(<AsciiRipple ref={ref} vignette={0} />)
    await act(async () => {
      await Promise.resolve()
    })
    context.fillText.mockClear()
    vi.mocked(context.rect as ReturnType<typeof vi.fn>).mockClear()
    ref.current!.drop(200, 200)
    act(() => frame!(performance.now() + 20))
    expect(context.fillText.mock.calls.length).toBeLessThanOrEqual(Math.ceil(400 / (16 * 1.2)))
    expect(context.drawImage).toHaveBeenCalled()
    const [, , width, height] = vi.mocked(context.rect as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(width).toBe(640)
    expect(height).toBeLessThan(400)
  })

  it('边缘渐变复用缓存，修改淡出范围时重建', async () => {
    const ref = createRef<AsciiRippleHandle>()
    const { rerender } = render(<AsciiRipple ref={ref} vignette={0.6} />)
    await act(async () => {
      await Promise.resolve()
    })
    const gradient = vi.mocked(context.createLinearGradient as ReturnType<typeof vi.fn>)
    expect(gradient).toHaveBeenCalledTimes(4)
    ref.current!.drop(200, 200)
    act(() => frame!(performance.now() + 20))
    expect(gradient).toHaveBeenCalledTimes(4)
    rerender(<AsciiRipple ref={ref} vignette={0.3} />)
    expect(gradient).toHaveBeenCalledTimes(8)
  })

  it('高刷新率回调不重复绘制同一个 60Hz 帧', async () => {
    const ref = createRef<AsciiRippleHandle>()
    render(<AsciiRipple ref={ref} vignette={0} />)
    await act(async () => {
      await Promise.resolve()
    })
    vi.spyOn(performance, 'now').mockReturnValue(100)
    ref.current!.drop(200, 200)
    act(() => frame!(120))
    const clears = vi.mocked(context.clearRect as ReturnType<typeof vi.fn>)
    const count = clears.mock.calls.length
    act(() => frame!(125))
    expect(clears.mock.calls.length).toBe(count)
    act(() => frame!(140))
    expect(clears.mock.calls.length).toBeGreaterThan(count)
  })

  it('宽度不同的字符保持逐格定位', async () => {
    context.measureText = (text: string) => ({ width: text === '@' ? 20 : 10 })
    const ref = createRef<AsciiRippleHandle>()
    render(<AsciiRipple ref={ref} vignette={0} chars="@" scramble={100} />)
    await act(async () => {
      await Promise.resolve()
    })
    context.fillText.mockClear()
    ref.current!.drop(200, 200)
    act(() => frame!(performance.now() + 20))
    const text = context.fillText.mock.calls.map((call) => call[0])
    expect(text).toContain('@')
    expect(text.some((value) => /^@{2,}$/.test(value))).toBe(false)
  })

  it('文字主题变化时重建背景，静止后再次绘制不会留下旧波纹', async () => {
    const ref = createRef<AsciiRippleHandle>()
    const { rerender } = render(<AsciiRipple ref={ref} vignette={0} textColor="#111111" />)
    await act(async () => {
      await Promise.resolve()
    })
    ref.current!.drop(200, 200)
    act(() => frame!(performance.now() + 20))
    context.fillText.mockClear()
    ref.current!.calm()
    expect(context.fillText).not.toHaveBeenCalled()
    rerender(<AsciiRipple ref={ref} vignette={0} textColor="#ffffff" />)
    expect(context.fillText.mock.calls.length).toBe(Math.ceil(400 / (16 * 1.2)))
  })

  it('calm 后重新进入画布，不从旧位置拉出拖尾', async () => {
    const ref = createRef<AsciiRippleHandle>()
    render(<AsciiRipple ref={ref} interactionTargetRef={{ current: target }} vignette={0} />)
    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.pointerMove(target, { clientX: 50, clientY: 50 })
    ref.current!.calm()
    context.fillText.mockClear()
    fireEvent.pointerMove(target, { clientX: 550, clientY: 350 })
    act(() => frame!(performance.now() + 20))
    expect(context.fillText).not.toHaveBeenCalled()
  })
})

describe('AsciiRipple 后台绘制', () => {
  let workers: Array<{
    postMessage: ReturnType<typeof vi.fn>
    terminate: ReturnType<typeof vi.fn>
    onerror: ((event: { preventDefault: () => void }) => void) | null
    onmessage: ((event: { data: { type: string } }) => void) | null
  }>
  let transfer: ReturnType<typeof vi.fn>

  beforeEach(() => {
    workers = []
    vi.stubGlobal('OffscreenCanvas', class {})
    vi.stubGlobal(
      'Worker',
      class {
        postMessage = vi.fn()
        terminate = vi.fn()
        onerror = null
        onmessage = null
        constructor() {
          workers.push(this)
        }
      },
    )
    transfer = vi.fn(() => ({}))
    Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
      configurable: true,
      value: transfer,
    })
  })

  afterEach(() => {
    delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).transferControlToOffscreen
  })

  it('交互和连续点击交给 Worker，主线程不计算或绘制帧', async () => {
    const ref = createRef<AsciiRippleHandle>()
    render(<AsciiRipple ref={ref} interactionTargetRef={{ current: target }} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(transfer).toHaveBeenCalledOnce()
    expect(workers).toHaveLength(1)
    expect(workers[0].postMessage.mock.calls[0][0]).toMatchObject({ type: 'init', width: 640, height: 400 })
    fireEvent.pointerMove(target, { clientX: 100, clientY: 120 })
    for (let i = 0; i < 5; i++) ref.current!.drop(200, 200)
    const messages = workers[0].postMessage.mock.calls.map(([message]) => message)
    expect(messages.filter((message) => message.type === 'drop')).toHaveLength(5)
    expect(messages.some((message) => message.type === 'move')).toBe(true)
    expect(requestFrame).not.toHaveBeenCalled()
    expect(context.fillText).not.toHaveBeenCalled()
  })

  it('主题更新沿用 Worker，calm 和卸载会清理后台动画', async () => {
    const ref = createRef<AsciiRippleHandle>()
    const { rerender, unmount, container } = render(<AsciiRipple ref={ref} textColor="#111111" />)
    await act(async () => {
      await Promise.resolve()
    })
    rerender(<AsciiRipple ref={ref} textColor="#ffffff" />)
    expect(workers).toHaveLength(1)
    const update = workers[0].postMessage.mock.calls.find(([message]) => message.type === 'update')![0]
    expect(update.options.ramps.up[0]).toBe('rgba(255,255,255,1.000)')
    ref.current!.calm()
    expect(workers[0].postMessage).toHaveBeenLastCalledWith({ type: 'calm' }, [])
    expect(container.querySelectorAll('canvas')).toHaveLength(1)
    unmount()
    expect(workers[0].terminate).toHaveBeenCalledOnce()
  })

  it('重复的尺寸通知不重建波纹画布', async () => {
    await mount()
    workers[0].postMessage.mockClear()
    act(() => {
      for (let i = 0; i < 10; i++) resize!()
    })
    expect(workers[0].postMessage).not.toHaveBeenCalled()
  })

  it('Worker 启动失败后换新画布，回退仍可点击', async () => {
    const { container } = await mount()
    const transferred = container.querySelector('canvas')
    act(() => workers[0].onerror!({ preventDefault: vi.fn() }))
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    expect(container.querySelector('canvas')).not.toBe(transferred)
    expect(container.querySelectorAll('canvas')).toHaveLength(1)
    fireEvent.pointerDown(target, { clientX: 100, clientY: 120 })
    expect(requestFrame).toHaveBeenCalledOnce()
  })

  it('StrictMode 与重新挂载不会重复转移同一画布', async () => {
    const first = render(
      <StrictMode>
        <AsciiRipple />
      </StrictMode>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(workers).toHaveLength(1)
    const canvas = first.container.querySelector('canvas')
    first.unmount()
    const second = render(
      <StrictMode>
        <AsciiRipple />
      </StrictMode>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(workers).toHaveLength(2)
    expect(second.container.querySelector('canvas')).not.toBe(canvas)
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    expect(transfer).toHaveBeenCalledTimes(2)
  })

  it('暂停落雨后发生异步错误，回退保持暂停', async () => {
    const ref = createRef<AsciiRippleHandle>()
    render(<AsciiRipple ref={ref} rain={5} />)
    await act(async () => {
      await Promise.resolve()
    })
    ref.current!.calm()
    act(() => workers[0].onmessage!({ data: { type: 'error' } }))
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })
})
