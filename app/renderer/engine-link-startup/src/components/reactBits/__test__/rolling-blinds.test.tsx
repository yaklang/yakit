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

const createFakeGL = () => {
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
    getShaderParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
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
})
