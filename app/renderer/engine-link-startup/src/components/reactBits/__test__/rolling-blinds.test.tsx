import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RollingBlinds from '../rolling-blinds'

const srgbChannelToLinear = (channel: number) => {
  const x = channel / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

const hexToLinear = (hex: string) =>
  [1, 3, 5].map((offset) => srgbChannelToLinear(parseInt(hex.slice(offset, offset + 2), 16)))

const THEME_RGB = {
  lightInk: hexToLinear('#cbd5e1'),
  darkInk: hexToLinear('#334155'),
  lightBackdrop: hexToLinear('#ffffff'),
  darkBackdrop: hexToLinear('#0a0a0a'),
  lightHot: hexToLinear('#87afe4'),
  darkHot: hexToLinear('#90b2de'),
}

const createFakeGL = (status: { compileOk?: boolean; linkOk?: boolean } = {}) => {
  const uniform3fv = vi.fn((_location: { name: string }, _value: number[]) => {})
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TRIANGLES: 8,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => status.compileOk !== false),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => status.linkOk !== false),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    viewport: vi.fn(),
    getUniformLocation: vi.fn((_program: unknown, name: string) => ({ name })),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    uniform3fv,
    drawArrays: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
  }
  return { gl, uniform3fv }
}

const uniformColor = (uniform3fv: ReturnType<typeof createFakeGL>['uniform3fv'], name: string) => {
  const call = uniform3fv.mock.calls.filter(([location]) => location.name === name).at(-1)
  return call?.[1]
}

const stubGetContext = (context: unknown) =>
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as WebGLRenderingContext)

describe('RollingBlinds', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, 'hidden')
  })

  it('renders a plain canvas when WebGL is unavailable', () => {
    stubGetContext(null)
    const { container, rerender } = render(<RollingBlinds theme="dark" />)

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas?.style.backgroundColor).toBe('rgb(10, 10, 10)')

    rerender(<RollingBlinds theme="light" />)
    expect(canvas?.style.backgroundColor).toBe('rgb(255, 255, 255)')
  })

  it('draws theme uniforms per frame and releases GL resources on unmount', () => {
    const { gl, uniform3fv } = createFakeGL()
    stubGetContext(gl)
    const { rerender, unmount } = render(<RollingBlinds theme="light" />)

    act(() => {
      vi.advanceTimersByTime(32)
    })
    expect(uniformColor(uniform3fv, 'uInk')).toEqual(THEME_RGB.lightInk)
    expect(uniformColor(uniform3fv, 'uBackdrop')).toEqual(THEME_RGB.lightBackdrop)
    expect(uniformColor(uniform3fv, 'uHot')).toEqual(THEME_RGB.lightHot)

    rerender(<RollingBlinds theme="dark" />)
    act(() => {
      vi.advanceTimersByTime(32)
    })
    expect(uniformColor(uniform3fv, 'uInk')).toEqual(THEME_RGB.darkInk)
    expect(uniformColor(uniform3fv, 'uBackdrop')).toEqual(THEME_RGB.darkBackdrop)
    expect(uniformColor(uniform3fv, 'uHot')).toEqual(THEME_RGB.darkHot)

    unmount()
    expect(gl.deleteBuffer).toHaveBeenCalledOnce()
    expect(gl.deleteProgram).toHaveBeenCalledOnce()
    expect(gl.deleteShader).toHaveBeenCalledTimes(2)
  })

  it('stops the render loop when the GL context is lost', () => {
    const { gl } = createFakeGL()
    stubGetContext(gl)
    const { container } = render(<RollingBlinds theme="light" />)

    act(() => {
      vi.advanceTimersByTime(32)
    })
    const draws = gl.drawArrays.mock.calls.length
    expect(draws).toBeGreaterThan(0)

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    const event = new Event('webglcontextlost', { cancelable: true })
    act(() => {
      canvas?.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)

    act(() => {
      vi.advanceTimersByTime(64)
    })
    expect(gl.drawArrays.mock.calls.length).toBe(draws)
  })

  it('releases failed shaders and never starts drawing when compilation fails', () => {
    const { gl } = createFakeGL({ compileOk: false })
    stubGetContext(gl)
    render(<RollingBlinds theme="dark" />)

    expect(gl.deleteShader).toHaveBeenCalledTimes(2)
    expect(gl.createProgram).not.toHaveBeenCalled()
    expect(gl.createBuffer).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(32)
    })
    expect(gl.drawArrays).not.toHaveBeenCalled()
  })

  it('releases the program and shaders when linking fails', () => {
    const { gl } = createFakeGL({ linkOk: false })
    stubGetContext(gl)
    render(<RollingBlinds theme="dark" />)

    expect(gl.deleteProgram).toHaveBeenCalledTimes(1)
    expect(gl.deleteShader).toHaveBeenCalledTimes(2)
    expect(gl.useProgram).not.toHaveBeenCalled()
    expect(gl.createBuffer).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(32)
    })
    expect(gl.drawArrays).not.toHaveBeenCalled()
  })

  it('skips drawing while the page is hidden and resumes when visible', () => {
    const { gl } = createFakeGL()
    stubGetContext(gl)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    render(<RollingBlinds theme="light" />)

    act(() => {
      vi.advanceTimersByTime(64)
    })
    expect(gl.drawArrays).not.toHaveBeenCalled()

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    act(() => {
      vi.advanceTimersByTime(32)
    })
    expect(gl.drawArrays.mock.calls.length).toBeGreaterThan(0)
  })

  it('resizes the drawing buffer to CSS size times devicePixelRatio', () => {
    const { gl } = createFakeGL()
    stubGetContext(gl)
    const { container } = render(<RollingBlinds theme="light" />)

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 300 })
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 200 })
    vi.stubGlobal('devicePixelRatio', 1.5)

    act(() => {
      vi.advanceTimersByTime(32)
    })
    expect(canvas?.width).toBe(450)
    expect(canvas?.height).toBe(300)
    expect(gl.viewport).toHaveBeenCalledWith(0, 0, 450, 300)
  })

  it('rebuilds GL resources and resumes a single render loop after context restore', () => {
    const { gl } = createFakeGL()
    stubGetContext(gl)
    const { container, unmount } = render(<RollingBlinds theme="light" />)
    act(() => {
      vi.advanceTimersByTime(32)
    })
    expect(gl.createProgram).toHaveBeenCalledTimes(1)

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    act(() => {
      canvas?.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    })
    const drawsAfterLost = gl.drawArrays.mock.calls.length
    act(() => {
      vi.advanceTimersByTime(64)
    })
    expect(gl.drawArrays.mock.calls.length).toBe(drawsAfterLost)

    act(() => {
      canvas?.dispatchEvent(new Event('webglcontextrestored'))
    })
    expect(gl.createShader).toHaveBeenCalledTimes(4)
    expect(gl.createProgram).toHaveBeenCalledTimes(2)
    expect(gl.createBuffer).toHaveBeenCalledTimes(2)
    expect(gl.useProgram).toHaveBeenCalledTimes(2)

    const drawsAfterRestore = gl.drawArrays.mock.calls.length
    act(() => {
      vi.advanceTimersByTime(32)
    })
    const frames = gl.drawArrays.mock.calls.length - drawsAfterRestore
    expect(frames).toBeGreaterThan(0)
    // 32ms 内至多 2 帧（fake rAF 16ms/帧）；若恢复后出现重复循环会翻倍到 4
    expect(frames).toBeLessThanOrEqual(2)

    unmount()
    expect(gl.deleteProgram).toHaveBeenCalledWith(gl.createProgram.mock.results[1].value)
    expect(gl.deleteBuffer).toHaveBeenCalledWith(gl.createBuffer.mock.results[1].value)
    expect(gl.deleteShader).toHaveBeenCalledWith(gl.createShader.mock.results[2].value)
    expect(gl.deleteShader).toHaveBeenCalledWith(gl.createShader.mock.results[3].value)
  })
})
