import { createRippleEngine } from './AsciiRippleEngine'
import type { RippleOptions } from './AsciiRippleEngine'

type RippleEngine = ReturnType<typeof createRippleEngine>

export type RippleWorkerMessage =
  | {
      type: 'init'
      canvas: OffscreenCanvas
      options: RippleOptions
      width: number
      height: number
      dpr: number
      reduced: boolean
    }
  | { type: 'update'; options: RippleOptions }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'move'; x: number; y: number }
  | { type: 'drop'; x: number; y: number; strength?: number; radius?: number }
  | { type: 'reduced'; value: boolean }
  | { type: 'leave' | 'calm' }

// 网页字体未注册到 Worker 时，保留主线程绘制，避免字体变化。
function usesDocumentFont(font: string) {
  let matched = false
  document.fonts?.forEach((face) => {
    const family = face.family.replace(/["']/g, '').toLowerCase()
    if (font.toLowerCase().includes(family)) matched = true
  })
  return matched
}

export function createRippleRenderer(root: HTMLElement, initialOptions: RippleOptions, canvasClass: string) {
  let options = initialOptions
  const bounds = root.getBoundingClientRect()
  let width = Math.max(1, bounds.width)
  let height = Math.max(1, bounds.height)
  let dpr = Math.min(1.5, window.devicePixelRatio || 1)
  let reduced = false
  let calmed = false
  let destroyed = false
  let worker: Worker | null = null
  let engine: RippleEngine | null = null
  const createCanvas = () => {
    const node = document.createElement('canvas')
    node.className = canvasClass
    node.setAttribute('aria-hidden', 'true')
    root.appendChild(node)
    return node
  }
  let canvas = createCanvas()
  const startMainThread = () => {
    if (destroyed || engine) return
    worker?.terminate()
    worker = null
    // 转移过的画布不能重新获取 context，回退时必须换一张。
    canvas.remove()
    canvas = createCanvas()
    engine = createRippleEngine(canvas, options, () => document.createElement('canvas'))
    engine.setReducedMotion(reduced)
    engine.resize(width, height, dpr)
    if (calmed) engine.calm()
  }
  const send = (message: RippleWorkerMessage, transfer: Transferable[] = []) => {
    try {
      worker?.postMessage(message, transfer)
    } catch {
      startMainThread()
    }
  }

  if (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof canvas.transferControlToOffscreen === 'function' &&
    !usesDocumentFont(options.font)
  ) {
    try {
      worker = new Worker(new URL('./AsciiRipple.worker.ts', import.meta.url), { type: 'module' })
      worker.onerror = (event) => {
        event.preventDefault()
        startMainThread()
      }
      worker.onmessage = (event: MessageEvent<{ type: string }>) => {
        if (event.data.type === 'error') startMainThread()
      }
      const offscreen = canvas.transferControlToOffscreen()
      send({ type: 'init', canvas: offscreen, options, width, height, dpr, reduced }, [offscreen])
    } catch {
      startMainThread()
    }
  } else startMainThread()

  return {
    resize(nextWidth: number, nextHeight: number, nextDpr: number) {
      if (destroyed || (width === nextWidth && height === nextHeight && dpr === nextDpr)) return
      width = nextWidth
      height = nextHeight
      dpr = nextDpr
      calmed = false
      send({ type: 'resize', width, height, dpr })
      engine?.resize(width, height, dpr)
    },
    update(nextOptions: RippleOptions) {
      if (destroyed) return
      if (nextOptions.rain > 0) calmed = false
      options = nextOptions
      if (worker && usesDocumentFont(options.font)) startMainThread()
      send({ type: 'update', options })
      engine?.update(options)
    },
    move(x: number, y: number) {
      if (destroyed) return
      if (!reduced && options.interactive) calmed = false
      send({ type: 'move', x, y })
      engine?.move(x, y)
    },
    leave() {
      if (destroyed) return
      if (!reduced && options.rain > 0) calmed = false
      send({ type: 'leave' })
      engine?.leave()
    },
    drop(x: number, y: number, strength?: number, radius?: number) {
      if (destroyed) return
      if (!reduced) calmed = false
      send({ type: 'drop', x, y, strength, radius })
      engine?.drop(x, y, strength, radius)
    },
    calm() {
      if (destroyed) return
      calmed = true
      send({ type: 'calm' })
      engine?.calm()
    },
    setReducedMotion(value: boolean) {
      if (destroyed) return
      if (reduced && !value && options.rain > 0) calmed = false
      reduced = value
      send({ type: 'reduced', value })
      engine?.setReducedMotion(value)
    },
    destroy() {
      destroyed = true
      worker?.terminate()
      worker = null
      engine?.destroy()
      canvas.remove()
    },
  }
}
