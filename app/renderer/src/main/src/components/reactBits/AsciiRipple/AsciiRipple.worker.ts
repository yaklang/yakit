import { createRippleEngine } from './AsciiRippleEngine'
import type { RippleWorkerMessage } from './AsciiRippleRenderer'

let engine: ReturnType<typeof createRippleEngine> | null = null

self.onmessage = (event: MessageEvent<RippleWorkerMessage>) => {
  const message = event.data
  try {
    switch (message.type) {
      case 'init': {
        if (typeof requestAnimationFrame !== 'function' || !message.canvas.getContext('2d')) {
          throw new Error('Canvas worker is unavailable')
        }
        // 启动时验证 Worker 支持帧调度，失败则交给主线程回退。
        cancelAnimationFrame(requestAnimationFrame(() => {}))
        engine = createRippleEngine(message.canvas, message.options, () => new OffscreenCanvas(1, 1))
        engine.setReducedMotion(message.reduced)
        engine.resize(message.width, message.height, message.dpr)
        self.postMessage({ type: 'ready' })
        break
      }
      case 'update':
        engine?.update(message.options)
        break
      case 'resize':
        engine?.resize(message.width, message.height, message.dpr)
        break
      case 'move':
        engine?.move(message.x, message.y)
        break
      case 'drop':
        engine?.drop(message.x, message.y, message.strength, message.radius)
        break
      case 'leave':
        engine?.leave()
        break
      case 'calm':
        engine?.calm()
        break
      case 'reduced':
        engine?.setReducedMotion(message.value)
        break
    }
  } catch {
    engine?.destroy()
    self.postMessage({ type: 'error' })
  }
}
