import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRippleEngine } from '../AsciiRippleEngine'
import type { RippleOptions } from '../AsciiRippleEngine'

const options: RippleOptions = {
  text: 'Yakit',
  font: '16px monospace',
  fontSize: 16,
  lineHeight: 1.2,
  resolution: 2,
  edges: 'absorb',
  chars: '.*#',
  speed: 0.5,
  damping: 0.1,
  viscosity: 0.1,
  dropStrength: 2,
  dropRadius: 40,
  dragStrength: 2,
  dragRadius: 30,
  rain: 0,
  rainStrength: 2,
  sensitivity: 2,
  slopeGain: 1,
  refraction: 1,
  scramble: 1,
  scrambleSpeed: 100,
  dither: 0,
  vignette: 0,
  textOpacity: 1,
  interactive: true,
  backgroundColor: 'transparent',
  ramps: { up: Array(25).fill('#fff'), down: Array(25).fill('#999') },
}

const createContext = () => ({
  fillText: vi.fn(),
  clearRect: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
})

let now: number
let nextFrame: number
let frames: Map<number, FrameRequestCallback>
let engines: ReturnType<typeof createRippleEngine>[]

const advanceFrame = (milliseconds = 20) => {
  now += milliseconds
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach((callback) => callback(now))
}

const mountEngine = (rain = 0) => {
  const context = createContext()
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  const engine = createRippleEngine(canvas, { ...options, rain }, () => {
    const sheet = document.createElement('canvas')
    vi.spyOn(sheet, 'getContext').mockReturnValue(createContext() as unknown as CanvasRenderingContext2D)
    return sheet
  })
  engines.push(engine)
  engine.resize(320, 200, 1)
  return { engine, context, canvas }
}

beforeEach(() => {
  now = 0
  nextFrame = 0
  frames = new Map()
  engines = []
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    }),
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id)),
  )
})

afterEach(() => {
  engines.forEach((engine) => engine.destroy())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AsciiRippleEngine 状态转换', () => {
  it('resize 重建网格清除扰动并限制 DPR，相同尺寸不重绘', () => {
    const { engine, context, canvas } = mountEngine()
    engine.drop(160, 100)
    advanceFrame()
    const pendingFrame = [...frames.keys()][0]
    context.fillText.mockClear()
    context.drawImage.mockClear()
    engine.resize(400, 240, 3)
    expect(canvas.width).toBe(600)
    expect(canvas.height).toBe(360)
    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingFrame)
    expect(frames.size).toBe(0)
    expect(context.fillText).not.toHaveBeenCalled()
    expect(context.drawImage).toHaveBeenCalledOnce()
    context.drawImage.mockClear()
    engine.resize(400, 240, 3)
    expect(context.drawImage).not.toHaveBeenCalled()
    engine.drop(200, 120)
    advanceFrame()
    expect(context.fillText).toHaveBeenCalled()
  })

  it('销毁后取消帧且所有入口不再绘制或调度', () => {
    const { engine, context } = mountEngine(10)
    engine.destroy()
    context.drawImage.mockClear()
    engine.resize(400, 240, 1)
    engine.update({ ...options, rain: 10 })
    engine.move(10, 20)
    engine.drop(10, 20)
    engine.leave()
    engine.calm()
    engine.setReducedMotion(true)
    engine.setReducedMotion(false)
    engine.destroy()
    advanceFrame(100)
    expect(frames.size).toBe(0)
    expect(context.drawImage).not.toHaveBeenCalled()
    expect(Math.random).not.toHaveBeenCalled()
  })

  it('启用减少动画时取消帧、清除波纹，并忽略移动和点击扰动', () => {
    const { engine, context } = mountEngine()
    engine.drop(160, 100)
    advanceFrame()
    expect(context.fillText).toHaveBeenCalled()
    const pendingFrame = [...frames.keys()][0]
    context.fillText.mockClear()
    context.drawImage.mockClear()

    engine.setReducedMotion(true)

    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingFrame)
    expect(frames.size).toBe(0)
    expect(context.drawImage).toHaveBeenCalledOnce()
    expect(context.fillText).not.toHaveBeenCalled()
    vi.mocked(requestAnimationFrame).mockClear()
    engine.move(80, 100)
    engine.move(160, 100)
    engine.drop(160, 100)
    advanceFrame()
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(context.fillText).not.toHaveBeenCalled()

    engine.setReducedMotion(false)
    expect(frames.size).toBe(0)
    engine.move(240, 100)
    advanceFrame()
    expect(frames.size).toBe(0)
    expect(context.fillText).not.toHaveBeenCalled()
    engine.drop(160, 100)
    advanceFrame()
    expect(context.fillText).toHaveBeenCalled()
  })

  it('有自动落雨时关闭减少动画恢复落雨', () => {
    const { engine, context } = mountEngine(20)
    engine.setReducedMotion(true)
    engine.leave()
    advanceFrame(100)
    expect(frames.size).toBe(0)
    expect(Math.random).not.toHaveBeenCalled()

    engine.setReducedMotion(false)
    expect(frames.size).toBe(1)
    advanceFrame(100)
    expect(Math.random).toHaveBeenCalled()
    expect(context.fillText).toHaveBeenCalled()
    expect(frames.size).toBe(1)
  })

  it('指针进入时暂停自动落雨，离开后恢复', () => {
    const { engine } = mountEngine(20)
    advanceFrame(100)
    expect(Math.random).toHaveBeenCalled()
    vi.mocked(Math.random).mockClear()

    engine.move(160, 100)
    advanceFrame(100)
    advanceFrame(100)
    expect(Math.random).not.toHaveBeenCalled()

    engine.leave()
    advanceFrame(100)
    expect(Math.random).toHaveBeenCalled()
    expect(frames.size).toBe(1)
  })

  it('calm 清除已有波纹和待处理移动，后续交互可重新启动', () => {
    const { engine, context } = mountEngine()
    engine.drop(160, 100)
    advanceFrame()
    expect(context.fillText).toHaveBeenCalled()
    engine.move(80, 100)
    engine.move(240, 100)
    const pendingFrame = [...frames.keys()][0]
    context.fillText.mockClear()
    context.drawImage.mockClear()

    engine.calm()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingFrame)
    expect(frames.size).toBe(0)
    expect(context.drawImage).toHaveBeenCalledOnce()
    expect(context.fillText).not.toHaveBeenCalled()
    engine.move(160, 100)
    advanceFrame()
    expect(frames.size).toBe(0)
    expect(context.fillText).not.toHaveBeenCalled()

    engine.move(200, 100)
    advanceFrame()
    expect(frames.size).toBe(1)
    expect(context.fillText).toHaveBeenCalled()
  })

  it('calm 停止自动落雨并清空累计量，离开后按新间隔落雨', () => {
    const { engine } = mountEngine(10)
    advanceFrame(60)
    expect(Math.random).not.toHaveBeenCalled()
    engine.calm()
    advanceFrame(100)
    expect(frames.size).toBe(0)

    engine.leave()
    advanceFrame(60)
    expect(Math.random).not.toHaveBeenCalled()
    advanceFrame(60)
    expect(Math.random).toHaveBeenCalled()
  })

  it('背景文字按空格分隔单词填充，避免单词粘连', () => {
    const sheets: ReturnType<typeof createContext>[] = []
    const context = createContext()
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const engine = createRippleEngine(canvas, { ...options, text: 'Low tide' }, () => {
      const sheet = document.createElement('canvas')
      const sheetContext = createContext()
      vi.spyOn(sheet, 'getContext').mockReturnValue(sheetContext as unknown as CanvasRenderingContext2D)
      sheets.push(sheetContext)
      return sheet
    })
    engines.push(engine)
    engine.resize(320, 200, 1)

    const lines = sheets[0].fillText.mock.calls.map((call) => call[0] as string)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.some((line) => line.includes('Low tide'))).toBe(true)
  })
})
