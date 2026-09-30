import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRippleEngine } from '../AsciiRippleEngine'
import type { RippleOptions } from '../AsciiRippleEngine'
import { createRippleRenderer } from '../AsciiRippleRenderer'

vi.mock('../AsciiRippleEngine', () => ({ createRippleEngine: vi.fn() }))

const options = { font: '16px monospace', rain: 0, interactive: true } as RippleOptions
let engine: ReturnType<typeof createRippleEngine>
let root: HTMLDivElement
let renderer: ReturnType<typeof createRippleRenderer> | undefined
let fonts: { family: string }[]
let workers: WorkerMock[]
const originalTransfer = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'transferControlToOffscreen')
const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
class WorkerMock {
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {
    workers.push(this)
  }
}
const mount = () => (renderer = createRippleRenderer(root, options, 'ripple-canvas'))

beforeEach(() => {
  workers = []
  fonts = []
  engine = {
    resize: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    drop: vi.fn(),
    leave: vi.fn(),
    calm: vi.fn(),
    setReducedMotion: vi.fn(),
    destroy: vi.fn(),
  }
  vi.mocked(createRippleEngine).mockReset().mockReturnValue(engine)
  vi.stubGlobal('Worker', WorkerMock)
  vi.stubGlobal('OffscreenCanvas', class {})
  Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
    configurable: true,
    value: vi.fn(() => ({})),
  })
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { forEach: (cb: (font: { family: string }) => void) => fonts.forEach(cb) },
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  root = document.createElement('div')
  document.body.appendChild(root)
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ width: 320, height: 200 } as DOMRect)
})
afterEach(() => {
  renderer?.destroy()
  renderer = undefined
  root?.remove()
  if (originalTransfer)
    Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', originalTransfer)
  else Reflect.deleteProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen')
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
  else Reflect.deleteProperty(document, 'fonts')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AsciiRippleRenderer', () => {
  it('网页字体直接使用主线程并转发交互', () => {
    fonts.push({ family: 'monospace' })
    mount()
    expect(workers).toHaveLength(0)
    expect(createRippleEngine).toHaveBeenCalledOnce()
    renderer!.move(10, 20)
    renderer!.drop(10, 20, 2, 30)
    renderer!.leave()
    expect(engine.move).toHaveBeenCalledWith(10, 20)
    expect(engine.drop).toHaveBeenCalledWith(10, 20, 2, 30)
    expect(engine.leave).toHaveBeenCalledOnce()
  })

  it('缺少 Worker 能力时直接使用主线程', () => {
    vi.stubGlobal('Worker', undefined)
    mount()
    expect(createRippleEngine).toHaveBeenCalledOnce()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('Worker 初始化转移画布，后续网页字体更新切回主线程', () => {
    mount()
    const canvas = root.firstChild
    expect(workers[0].postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'init', width: 320, height: 200 }),
      [expect.any(Object)],
    )
    expect(createRippleEngine).not.toHaveBeenCalled()
    fonts.push({ family: 'JetBrains Mono' })
    const next = { ...options, font: '16px "JetBrains Mono"' }
    renderer!.update(next)
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    expect(root.firstChild).not.toBe(canvas)
    expect(root.children).toHaveLength(1)
    expect(createRippleEngine).toHaveBeenCalledWith(root.firstChild, next, expect.any(Function))
    expect(engine.update).toHaveBeenCalledWith(next)
  })

  it('postMessage 抛错时保留原始错误并在新画布继续本次交互', () => {
    mount()
    const error = new DOMException('transfer failed', 'DataCloneError')
    workers[0].postMessage.mockImplementation(() => {
      throw error
    })
    renderer!.drop(30, 40, 2, 10)
    expect(console.error).toHaveBeenCalledWith(expect.any(String), { phase: 'postMessage', messageType: 'drop', error })
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    expect(engine.drop).toHaveBeenCalledExactlyOnceWith(30, 40, 2, 10)
  })

  it.each(['capability', 'initialization', 'runtime'] as const)(
    '保留 Worker %s 诊断并恢复最新尺寸、减少动画和静止状态',
    (phase) => {
      mount()
      renderer!.resize(640, 480, 1.5)
      renderer!.setReducedMotion(true)
      renderer!.calm()
      const failure = { type: 'error', phase, error: { name: 'TypeError', message: 'failed', stack: 'original stack' } }
      workers[0].onmessage!({ data: failure } as MessageEvent)
      expect(phase === 'capability' ? console.warn : console.error).toHaveBeenCalledWith(expect.any(String), failure)
      expect(engine.resize).toHaveBeenCalledWith(640, 480, 1.5)
      expect(engine.setReducedMotion).toHaveBeenCalledWith(true)
      expect(engine.calm).toHaveBeenCalledOnce()
    },
  )

  it('Worker ErrorEvent 保留运行阶段和原始异常', () => {
    mount()
    const error = new TypeError('worker crashed')
    const event = new ErrorEvent('error', { error, cancelable: true })
    workers[0].onerror!(event)
    expect(console.error).toHaveBeenCalledWith(expect.any(String), { phase: 'runtime', error })
    expect(event.defaultPrevented).toBe(true)
    expect(createRippleEngine).toHaveBeenCalledOnce()
  })

  it('销毁后不再发送消息或创建回退引擎，重复销毁安全', () => {
    mount()
    renderer!.destroy()
    workers[0].postMessage.mockClear()
    renderer!.move(1, 2)
    renderer!.drop(1, 2)
    renderer!.resize(1, 2, 1)
    renderer!.update(options)
    renderer!.calm()
    renderer!.leave()
    renderer!.setReducedMotion(true)
    workers[0].onmessage!({
      data: { type: 'error', phase: 'runtime', error: { name: 'Error', message: 'late' } },
    } as MessageEvent)
    renderer!.destroy()
    expect(workers[0].postMessage).not.toHaveBeenCalled()
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    expect(createRippleEngine).not.toHaveBeenCalled()
    expect(root.children).toHaveLength(0)
  })

  it('主线程引擎只销毁一次', () => {
    vi.stubGlobal('Worker', undefined)
    mount()
    renderer!.destroy()
    renderer!.destroy()
    expect(engine.destroy).toHaveBeenCalledOnce()
  })
})
