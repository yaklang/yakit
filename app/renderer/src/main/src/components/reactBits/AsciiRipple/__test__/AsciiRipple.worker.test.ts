import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRippleEngine } from '../AsciiRippleEngine'
import type { RippleOptions } from '../AsciiRippleEngine'
import type { RippleWorkerMessage } from '../AsciiRippleRenderer'

vi.mock('../AsciiRippleEngine', () => ({ createRippleEngine: vi.fn() }))

const options: RippleOptions = {
  text: 'hello',
  font: '16px monospace',
  fontSize: 16,
  lineHeight: 1.2,
  resolution: 3,
  edges: 'absorb',
  chars: '.#',
  speed: 0.55,
  damping: 0.045,
  viscosity: 0.4,
  dropStrength: 1.2,
  dropRadius: 26,
  dragStrength: 0.3,
  dragRadius: 16,
  rain: 0,
  rainStrength: 0.6,
  sensitivity: 2.2,
  slopeGain: 1,
  refraction: 4,
  scramble: 1,
  scrambleSpeed: 90,
  dither: 0.5,
  vignette: 0.6,
  textOpacity: 0.15,
  interactive: true,
  backgroundColor: 'transparent',
  ramps: { up: ['white'], down: ['purple'] },
}

let engine: ReturnType<typeof createRippleEngine>
let scope: {
  onmessage: ((event: MessageEvent<RippleWorkerMessage>) => void) | null
  postMessage: ReturnType<typeof vi.fn>
}
let canvas: OffscreenCanvas
let getContext: ReturnType<typeof vi.fn>

function send(message: RippleWorkerMessage) {
  scope.onmessage!(new MessageEvent('message', { data: message }))
}

function init() {
  send({ type: 'init', canvas, options, width: 640, height: 400, dpr: 1.5, reduced: true })
}

function expectError(phase: string, message: string) {
  expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith({
    type: 'error',
    phase,
    error: { name: 'Error', message, stack: expect.stringContaining(message) },
  })
}

beforeEach(async () => {
  vi.resetModules()
  vi.mocked(createRippleEngine).mockReset()
  engine = {
    resize: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    leave: vi.fn(),
    drop: vi.fn(),
    calm: vi.fn(),
    setReducedMotion: vi.fn(),
    destroy: vi.fn(),
  }
  vi.mocked(createRippleEngine).mockReturnValue(engine)
  scope = { onmessage: null, postMessage: vi.fn() }
  getContext = vi.fn(() => ({}))
  vi.stubGlobal('self', scope)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 7),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext = getContext
    },
  )
  canvas = new OffscreenCanvas(640, 400)
  await import('../AsciiRipple.worker')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AsciiRipple Worker 消息处理', () => {
  it('初始化引擎、尺寸和减少动画设置后发送 ready', () => {
    init()
    expect(getContext).toHaveBeenCalledWith('2d')
    expect(requestAnimationFrame).toHaveBeenCalledWith(expect.any(Function))
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7)
    expect(createRippleEngine).toHaveBeenCalledWith(canvas, options, expect.any(Function))
    const createCanvas = vi.mocked(createRippleEngine).mock.calls[0][2]
    expect(createCanvas()).toMatchObject({ width: 1, height: 1 })
    expect(engine.setReducedMotion).toHaveBeenCalledWith(true)
    expect(engine.resize).toHaveBeenCalledWith(640, 400, 1.5)
    expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'ready' })
  })

  it('把更新、尺寸、交互和动画状态消息传给引擎', () => {
    init()
    const nextOptions = { ...options, rain: 5 }
    send({ type: 'update', options: nextOptions })
    send({ type: 'resize', width: 800, height: 500, dpr: 1 })
    send({ type: 'move', x: 100, y: 120 })
    send({ type: 'drop', x: 200, y: 220, strength: 2, radius: 30 })
    send({ type: 'drop', x: 300, y: 320 })
    send({ type: 'leave' })
    send({ type: 'calm' })
    send({ type: 'reduced', value: false })
    expect(engine.update).toHaveBeenCalledWith(nextOptions)
    expect(engine.resize).toHaveBeenLastCalledWith(800, 500, 1)
    expect(engine.move).toHaveBeenCalledWith(100, 120)
    expect(engine.drop).toHaveBeenNthCalledWith(1, 200, 220, 2, 30)
    expect(engine.drop).toHaveBeenNthCalledWith(2, 300, 320, undefined, undefined)
    expect(engine.leave).toHaveBeenCalledOnce()
    expect(engine.calm).toHaveBeenCalledOnce()
    expect(engine.setReducedMotion).toHaveBeenLastCalledWith(false)
    expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'ready' })
  })

  it('没有帧调度能力时报告错误，不创建引擎', () => {
    vi.stubGlobal('requestAnimationFrame', undefined)
    init()
    expect(createRippleEngine).not.toHaveBeenCalled()
    expectError('capability', 'Canvas worker is unavailable')
  })

  it('无法取得 2D context 时报告错误，不创建引擎', () => {
    getContext.mockReturnValue(null)
    init()
    expect(createRippleEngine).not.toHaveBeenCalled()
    expectError('capability', 'Canvas worker is unavailable')
  })

  it('帧调度抛错时报告错误，不创建引擎', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => {
        throw new Error('unavailable')
      }),
    )
    init()
    expect(createRippleEngine).not.toHaveBeenCalled()
    expectError('capability', 'unavailable')
  })

  it('创建引擎抛错时报告错误', () => {
    vi.mocked(createRippleEngine).mockImplementation(() => {
      throw new Error('init failed')
    })
    init()
    expectError('initialization', 'init failed')
  })

  it('初始化尺寸失败时销毁已创建的引擎并报告错误', () => {
    vi.mocked(engine.resize).mockImplementation(() => {
      throw new Error('resize failed')
    })
    init()
    expect(engine.destroy).toHaveBeenCalledOnce()
    expectError('initialization', 'resize failed')
  })

  it('运行期间处理消息失败时销毁引擎并报告错误', () => {
    init()
    scope.postMessage.mockClear()
    vi.mocked(engine.move).mockImplementation(() => {
      throw new Error('move failed')
    })
    send({ type: 'move', x: 100, y: 120 })
    expect(engine.destroy).toHaveBeenCalledOnce()
    expectError('runtime', 'move failed')
  })

  it('保留非 Error 异常的内容', () => {
    init()
    scope.postMessage.mockClear()
    vi.mocked(engine.move).mockImplementation(() => {
      throw 'move failed'
    })
    send({ type: 'move', x: 100, y: 120 })
    expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'error',
      phase: 'runtime',
      error: { name: 'Error', message: 'move failed' },
    })
  })
})
