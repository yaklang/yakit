import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AsciiRipple from '../AsciiRipple'

let target: HTMLDivElement
let requestFrame: ReturnType<typeof vi.fn>

beforeEach(() => {
  target = document.createElement('div')
  document.body.append(target)
  requestFrame = vi.fn(() => 1)
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
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
  const context = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    setTransform: vi.fn(),
    measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: new Uint8ClampedArray([128, 128, 128, 255]) }),
  }
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
})
