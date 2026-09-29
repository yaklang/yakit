'use client'
import type React from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import classNames from 'classnames'
import styles from './AsciiRipple.module.scss'
export type AsciiRippleEdges = 'reflect' | 'absorb'
export interface AsciiRippleHandle {
  drop: (x: number, y: number, strength?: number, radius?: number) => void
  calm: () => void
}
export interface AsciiRippleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 背景文案，循环填满画布。 */
  text?: string
  /** 波纹激活时的替换字符，强度越高越倾向使用靠后的字符。 */
  chars?: string
  /** 字号（px）：越大文字越大，画布中的字符越少。 */
  fontSize?: number
  /** 行高倍数：越大行距越宽，越小越紧凑。 */
  lineHeight?: number
  /** 字体，建议使用等宽字体。 */
  fontFamily?: string
  /** 字重：数值越大文字越粗。 */
  fontWeight?: number | string
  /** 背景文字颜色，也是波纹颜色渐变的起点。 */
  textColor?: string
  /** 波峰文字的高亮颜色。 */
  rippleColor?: string
  /** 波谷文字的高亮颜色。 */
  troughColor?: string
  /** 画布背景色，transparent 表示透明。 */
  backgroundColor?: string
  /** 背景文字不透明度（0–1）：越大越清晰，0 隐藏背景文字。 */
  textOpacity?: number
  /** 模拟网格精度（1–4）：越大越细腻，但计算量越大。 */
  resolution?: number
  /** 波纹传播速度（0–1）：越大越快，0 仍会传播。 */
  speed?: number
  /** 阻尼（0–0.5）：越大消散越快，越小持续越久。 */
  damping?: number
  /** 邻近网格的传递强度（0–1）：越大传播越快，受 speed 上限约束。 */
  viscosity?: number
  /** 边缘模式：reflect 反射波纹，absorb 吸收波纹。 */
  edges?: AsciiRippleEdges
  /** 点击扰动强度：越大波纹越强，越小越弱。 */
  dropStrength?: number
  /** 点击的初始扰动半径（px）：越大起始范围越宽，不限制最终扩散范围。 */
  dropRadius?: number
  /** 鼠标移动的扰动强度：越大拖尾越明显，0 关闭移动扰动。 */
  dragStrength?: number
  /** 鼠标移动的扰动半径（px）：越大拖尾越宽，越小越窄。 */
  dragRadius?: number
  /** 自动落雨频率（次/秒）：越大越密集，0 关闭；鼠标交互期间暂停落雨。 */
  rain?: number
  /** 自动落雨强度：越大雨滴波纹越强，越小越弱。 */
  rainStrength?: number
  /** 波高的显示增益：越大越容易高亮字符，越小越柔和。 */
  sensitivity?: number
  /** 波面斜率的显示增益：越大波纹边缘越明显，越小越柔和。 */
  slopeGain?: number
  /** 文字折射强度：越大字符偏移越明显，0 关闭偏移。 */
  refraction?: number
  /** 字符替换强度：越大越容易替换成 chars 中的字符，0 关闭替换。 */
  scramble?: number
  /** 替换字符的刷新间隔（ms，最低 16）：越小变化越快，越大越慢。 */
  scrambleSpeed?: number
  /** 替换阈值的随机扰动：越大分布越不规则，0 使用统一阈值。 */
  dither?: number
  /** 边缘淡出范围（0–1）：越大淡出区域越宽，0 关闭淡出。 */
  vignette?: number
  /** 是否响应鼠标移动和点击。 */
  interactive?: boolean
  /** 可选的交互容器，用于背景被内容层覆盖的场景。 */
  interactionTargetRef?: React.RefObject<HTMLElement | null>
}
const DEFAULT_TEXT =
  'Low tide leaves the rock shelf glazed and quiet, pools that remain are small enough to hold in one long look. A shrimp no bigger than a comma drifts above sand, its shadow arriving moment before it does. The surface is second sky. Cloud passes through it, then gull, tremble of my own breath as I lean too close. Nothing here still, only slow. Anemones open with patience clocks. Weed lifts settles though water were remembering wave once carried farther up shore. When drop falls from sleeve whole pool answers at once, rings running outward until they meet stone come back folded over themselves, smaller, quieter, braided into pattern was never quite round. Light bends moving glass sand below wavers, letters on page read tears. count returns. Four, five, forgets sky again. Farther out real sea keeps time, heavy unhurried, sending same news channel has always sent. listens. It repeats every word smaller voice, then, when sure watching, goes being mirror.'
const DEFAULT_CHARS = '·.,:;-~=+*%#@'
const IDLE_THRESHOLD = 0.0015
const STEP = 1 / 90
const MAX_STEPS = 4
const RAMP_STEPS = 24
const RESTORE = 0.004
type Rgba = [number, number, number, number]
const hash = (x: number, y: number, z: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return n - Math.floor(n)
}
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const parseColor = (input: string): Rgba => {
  if (typeof document === 'undefined') return [255, 255, 255, 1]
  const probe = document.createElement('canvas')
  probe.width = probe.height = 1
  const ctx = probe.getContext('2d')
  if (!ctx) return [255, 255, 255, 1]
  ctx.fillStyle = input
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2], d[3] / 255]
}
const mixColor = (a: Rgba, b: Rgba, t: number) => {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  const al = (a[3] + (b[3] - a[3]) * t).toFixed(3)
  return `rgba(${r},${g},${bl},${al})`
}
interface Surface {
  w: number
  h: number
  cell: number
  prev: Float32Array
  cur: Float32Array
  next: Float32Array
  mask: Float32Array
  energy: number
}
interface Grid {
  cols: number
  rows: number
  charW: number
  lineH: number
  base: string[][]
}
interface HotCell {
  x: number
  y: number
  ch: string
  color: string
}
const buildGrid = (width: number, height: number, charW: number, lineH: number, text: string): Grid => {
  const cols = Math.max(1, Math.ceil(width / charW))
  const rows = Math.max(1, Math.ceil(height / lineH))
  const words = text.split(/\s+/).filter(Boolean)
  const base: string[][] = []
  let wi = 0
  for (let r = 0; r < rows; r++) {
    let line = ''
    while (line.length < cols && words.length) {
      if (line.length > 0) line += ''
      line += words[wi % words.length]
      wi++
    }
    base.push(line.padEnd(cols, '').slice(0, cols).split(''))
  }
  return { cols, rows, charW, lineH, base }
}
const buildSurface = (width: number, height: number, cell: number, edges: AsciiRippleEdges): Surface => {
  const w = Math.max(4, Math.ceil(width / cell) + 2)
  const h = Math.max(4, Math.ceil(height / cell) + 2)
  const size = w * h
  const mask = new Float32Array(size)
  const band = edges === 'absorb' ? Math.max(3, Math.round(Math.min(w, h) * 0.08)) : 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 1
      if (band > 0) {
        const d = Math.min(x, y, w - 1 - x, h - 1 - y)
        if (d < band) {
          const t = d / band
          m = 1 - (1 - t) * (1 - t) * 0.22
        }
      }
      mask[y * w + x] = m
    }
  }
  return {
    w,
    h,
    cell,
    prev: new Float32Array(size),
    cur: new Float32Array(size),
    next: new Float32Array(size),
    mask,
    energy: 0,
  }
}
const stepSurface = (s: Surface, c2: number, visc: number, damping: number, edges: AsciiRippleEdges) => {
  const { w, h, prev, cur, next, mask } = s
  const keep = 1 - damping
  const k = c2 + visc
  const restore = 1 - RESTORE
  let energy = 0
  for (let y = 1; y < h - 1; y++) {
    const row = y * w
    for (let x = 1; x < w - 1; x++) {
      const i = row + x
      const c = cur[i]
      const lap = cur[i - 1] + cur[i + 1] + cur[i - w] + cur[i + w] - 4 * c
      const v = c * restore + (c - prev[i]) * keep * mask[i] + k * lap
      next[i] = v
      const a = v < 0 ? -v : v
      if (a > energy) energy = a
    }
  }
  if (edges === 'reflect') {
    for (let x = 0; x < w; x++) {
      next[x] = next[x + w]
      next[(h - 1) * w + x] = next[(h - 2) * w + x]
    }
    for (let y = 0; y < h; y++) {
      next[y * w] = next[y * w + 1]
      next[y * w + w - 1] = next[y * w + w - 2]
    }
  }
  s.prev = cur
  s.cur = next
  s.next = prev
  s.energy = energy
}
const flatten = (s: Surface) => {
  s.cur.fill(0)
  s.prev.fill(0)
  s.next.fill(0)
  s.energy = 0
}
const disturb = (s: Surface, px: number, py: number, radiusPx: number, amount: number) => {
  const cx = px / s.cell + 1
  const cy = py / s.cell + 1
  const r = Math.max(1, radiusPx / s.cell)
  const x0 = Math.max(1, Math.floor(cx - r))
  const x1 = Math.min(s.w - 2, Math.ceil(cx + r))
  const y0 = Math.max(1, Math.floor(cy - r))
  const y1 = Math.min(s.h - 2, Math.ceil(cy + r))
  const inv = 1 / (r * r)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dy = y - cy
      const q = 1 - (dx * dx + dy * dy) * inv
      if (q <= 0) continue
      s.cur[y * s.w + x] -= amount * q * q * (3 - 2 * q)
    }
  }
  if (s.energy < amount) s.energy = amount
}
const sampleSurface = (s: Surface, px: number, py: number, out: Float32Array) => {
  const fx = px / s.cell + 1
  const fy = py / s.cell + 1
  const x = Math.min(s.w - 3, Math.max(1, Math.floor(fx)))
  const y = Math.min(s.h - 3, Math.max(1, Math.floor(fy)))
  const tx = clamp01(fx - x)
  const ty = clamp01(fy - y)
  const { w, cur } = s
  const i = y * w + x
  const top = cur[i] + (cur[i + 1] - cur[i]) * tx
  const bottom = cur[i + w] + (cur[i + w + 1] - cur[i + w]) * tx
  out[0] = top + (bottom - top) * ty
  const gxTop = cur[i + 1] - cur[i - 1]
  const gxBottom = cur[i + w + 1] - cur[i + w - 1]
  out[1] = (gxTop + (gxBottom - gxTop) * ty) * 0.5
  const gyLeft = cur[i + w] - cur[i - w]
  const gyRight = cur[i + w + 1] - cur[i - w + 1]
  out[2] = (gyLeft + (gyRight - gyLeft) * tx) * 0.5
}
const AsciiRipple = forwardRef<AsciiRippleHandle, AsciiRippleProps>(
  (
    {
      text = DEFAULT_TEXT,
      chars = DEFAULT_CHARS,
      fontSize = 16,
      lineHeight = 1.2,
      fontFamily = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace',
      fontWeight = 400,
      textColor = '#f5f5f4',
      rippleColor = '#ffffff',
      troughColor = '#ad57ff',
      backgroundColor = 'transparent',
      textOpacity = 0.15,
      resolution = 3,
      speed = 0.55,
      damping = 0.045,
      viscosity = 0.4,
      edges = 'absorb',
      dropStrength = 1.2,
      dropRadius = 26,
      dragStrength = 0.3,
      dragRadius = 16,
      rain = 0,
      rainStrength = 0.6,
      sensitivity = 2.2,
      slopeGain = 1,
      refraction = 4,
      scramble = 1,
      scrambleSpeed = 90,
      dither = 0.5,
      vignette = 0.6,
      interactive = true,
      interactionTargetRef,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gridRef = useRef<Grid | null>(null)
    const surfaceRef = useRef<Surface | null>(null)
    const frameRef = useRef(0)
    const runningRef = useRef(false)
    const lastTimeRef = useRef(0)
    const accRef = useRef(0)
    const rainAccRef = useRef(0)
    const sampleRef = useRef(new Float32Array(3))
    const reducedRef = useRef(false)
    const tickRef = useRef<(now: number) => void>(() => {})
    const pointerRef = useRef({
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      inside: false,
      pending: false,
    })
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`
    const ramps = useMemo(() => {
      const base = parseColor(textColor)
      const crest = parseColor(rippleColor)
      const trough = parseColor(troughColor)
      const up: string[] = []
      const down: string[] = []
      for (let i = 0; i <= RAMP_STEPS; i++) {
        const t = i / RAMP_STEPS
        up.push(mixColor(base, crest, t))
        down.push(mixColor(base, trough, t))
      }
      return { up, down }
    }, [textColor, rippleColor, troughColor])
    const live = {
      chars,
      font,
      speed,
      damping,
      viscosity,
      edges,
      dropStrength,
      dropRadius,
      dragStrength,
      dragRadius,
      rain,
      rainStrength,
      sensitivity,
      slopeGain,
      refraction,
      scramble,
      scrambleSpeed,
      dither,
      vignette,
      textOpacity,
      resolution,
      interactive,
      backgroundColor,
      ramps,
    }
    const liveRef = useRef(live)
    useEffect(() => {
      liveRef.current = live
    })
    const draw = useCallback((now: number) => {
      const canvas = canvasRef.current
      const grid = gridRef.current
      const surface = surfaceRef.current
      if (!canvas || !grid || !surface) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const p = liveRef.current
      const { cols, rows, charW, lineH, base } = grid
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      const dpr = canvas.width / Math.max(1, cw)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, cw, ch)
      ctx.font = p.font
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      const palette = p.chars.length ? p.chars : DEFAULT_CHARS
      const plen = palette.length
      const active = surface.energy > IDLE_THRESHOLD
      const seed = Math.floor(now / Math.max(16, p.scrambleSpeed))
      const out = sampleRef.current
      const slopeScale = p.resolution
      const hot: HotCell[] = []
      ctx.globalAlpha = p.textOpacity
      ctx.fillStyle = p.ramps.up[0]
      for (let r = 0; r < rows; r++) {
        const row = base[r]
        const cy = r * lineH + lineH / 2
        let line = ''
        if (!active) {
          line = row.join('')
        } else {
          for (let c = 0; c < cols; c++) {
            const cx = c * charW + charW / 2
            sampleSurface(surface, cx, cy, out)
            const hgt = out[0]
            const gx = out[1] * slopeScale
            const gy = out[2] * slopeScale
            const slope = Math.sqrt(gx * gx + gy * gy)
            const raw = Math.abs(hgt) * p.sensitivity + slope * p.slopeGain
            const intensity = clamp01((raw - 0.12) * 1.14)
            if (intensity < 0.02) {
              line += row[c]
              continue
            }
            const sc = Math.min(cols - 1, Math.max(0, Math.round(c + gx * p.refraction * 2)))
            const sr = Math.min(rows - 1, Math.max(0, Math.round(r + gy * p.refraction)))
            let glyph = base[sr][sc]
            const threshold = 0.5 + (hash(c, r, 0) - 0.5) * p.dither
            if (intensity * p.scramble >= threshold) {
              const jitter = (hash(c, r, seed) - 0.5) * plen * 0.3
              const idx = Math.max(0, Math.min(plen - 1, Math.round(intensity * (plen - 1) + jitter)))
              glyph = palette[idx]
            }
            if (glyph === '') {
              line += ''
              continue
            }
            const ramp = hgt >= 0 ? p.ramps.up : p.ramps.down
            hot.push({
              x: c * charW,
              y: cy,
              ch: glyph,
              color: ramp[Math.round(intensity * RAMP_STEPS)],
            })
            line += ''
          }
        }
        ctx.fillText(line, 0, cy)
      }
      if (hot.length) {
        ctx.globalAlpha = 1
        let last = ''
        for (let i = 0; i < hot.length; i++) {
          const h = hot[i]
          if (h.color !== last) {
            ctx.fillStyle = h.color
            last = h.color
          }
          ctx.fillText(h.ch, h.x, h.y)
        }
      }
      ctx.globalAlpha = 1
      if (p.vignette > 0) {
        const band = clamp01(p.vignette) * (Math.min(cw, ch) / 2)
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        const fade = (x0: number, y0: number, x1: number, y1: number) => {
          const grad = ctx.createLinearGradient(x0, y0, x1, y1)
          grad.addColorStop(0, 'rgba(0,0,0,1)')
          grad.addColorStop(0.3, 'rgba(0,0,0,0.6)')
          grad.addColorStop(0.7, 'rgba(0,0,0,0.15)')
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, cw, ch)
        }
        fade(0, 0, band, 0)
        fade(cw, 0, cw - band, 0)
        fade(0, 0, 0, band)
        fade(0, ch, 0, ch - band)
        ctx.restore()
      }
      if (p.backgroundColor && p.backgroundColor !== 'transparent') {
        ctx.globalCompositeOperation = 'destination-over'
        ctx.fillStyle = p.backgroundColor
        ctx.fillRect(0, 0, cw, ch)
        ctx.globalCompositeOperation = 'source-over'
      }
    }, [])
    const stopLoop = useCallback(() => {
      runningRef.current = false
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }, [])
    const tick = useCallback(
      (now: number) => {
        const surface = surfaceRef.current
        const grid = gridRef.current
        if (!surface || !grid) {
          runningRef.current = false
          return
        }
        const p = liveRef.current
        const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000 || 0)
        lastTimeRef.current = now
        const ptr = pointerRef.current
        if (ptr.pending && p.interactive && p.dragStrength > 0) {
          const dx = ptr.x - ptr.lastX
          const dy = ptr.y - ptr.lastY
          const moved = Math.sqrt(dx * dx + dy * dy)
          if (moved > 0.5) {
            const steps = Math.min(6, Math.max(1, Math.ceil(moved / p.dragRadius)))
            const amount = (p.dragStrength * Math.min(1, moved / (p.dragRadius * 1.5))) / steps
            for (let i = 1; i <= steps; i++) {
              const t = i / steps
              disturb(surface, ptr.lastX + dx * t, ptr.lastY + dy * t, p.dragRadius, amount)
            }
          }
          ptr.lastX = ptr.x
          ptr.lastY = ptr.y
          ptr.pending = false
        }
        const raining = p.rain > 0 && !(ptr.inside && p.interactive)
        if (raining) {
          rainAccRef.current += dt * p.rain
          while (rainAccRef.current >= 1) {
            rainAccRef.current -= 1
            disturb(
              surface,
              Math.random() * grid.cols * grid.charW,
              Math.random() * grid.rows * grid.lineH,
              p.dropRadius * (0.6 + Math.random() * 0.6),
              p.rainStrength * (0.6 + Math.random() * 0.8),
            )
          }
        } else {
          rainAccRef.current = 0
        }
        const c2 = 0.02 + clamp01(p.speed) * 0.4
        const visc = Math.min(0.49 - c2, clamp01(p.viscosity) * 0.12)
        const damping = Math.min(0.5, Math.max(0, p.damping))
        accRef.current += dt
        let steps = 0
        while (accRef.current >= STEP && steps < MAX_STEPS) {
          stepSurface(surface, c2, visc, damping, p.edges)
          accRef.current -= STEP
          steps++
        }
        if (steps === MAX_STEPS) accRef.current = 0
        if (surface.energy < IDLE_THRESHOLD && !raining) {
          flatten(surface)
          draw(now)
          runningRef.current = false
          frameRef.current = 0
          return
        }
        draw(now)
        frameRef.current = requestAnimationFrame((t) => tickRef.current(t))
      },
      [draw],
    )
    useEffect(() => {
      tickRef.current = tick
    }, [tick])
    const wake = useCallback(() => {
      if (runningRef.current || reducedRef.current) return
      runningRef.current = true
      lastTimeRef.current = performance.now()
      accRef.current = 0
      frameRef.current = requestAnimationFrame((t) => tickRef.current(t))
    }, [])
    const rebuild = useCallback(() => {
      const root = rootRef.current
      const canvas = canvasRef.current
      if (!root || !canvas) return
      const rect = root.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.font = font
      const charW = ctx.measureText('M').width || fontSize * 0.6
      const lineH = fontSize * lineHeight
      gridRef.current = buildGrid(width, height, charW, lineH, text)
      const cell = lineH / Math.max(1, Math.min(4, resolution))
      surfaceRef.current = buildSurface(width, height, cell, edges)
      draw(performance.now())
      if (rain > 0) wake()
    }, [draw, font, fontSize, lineHeight, text, resolution, edges, rain, wake])
    useEffect(() => {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')
      const apply = () => {
        reducedRef.current = media.matches
        if (media.matches) {
          stopLoop()
          const s = surfaceRef.current
          if (s) flatten(s)
          draw(performance.now())
        }
      }
      apply()
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }, [draw, stopLoop])
    useEffect(() => {
      let cancelled = false
      const fontsReady =
        typeof document !== 'undefined' && document.fonts?.ready
          ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))])
          : Promise.resolve()
      fontsReady.then(() => {
        if (!cancelled) rebuild()
      })
      const root = rootRef.current
      const ro = new ResizeObserver(() => rebuild())
      if (root) ro.observe(root)
      return () => {
        cancelled = true
        ro.disconnect()
      }
    }, [rebuild])
    useEffect(() => {
      draw(performance.now())
    }, [ramps, chars, textOpacity, vignette, backgroundColor, draw])
    useEffect(() => () => stopLoop(), [stopLoop])
    const localPoint = (e: { clientX: number; clientY: number }) => {
      const root = rootRef.current
      if (!root) return null
      const rect = root.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onPointerMove = (e: { clientX: number; clientY: number }) => {
      if (!interactive || reducedRef.current) return
      const pt = localPoint(e)
      if (!pt) return
      const ptr = pointerRef.current
      if (!ptr.inside) {
        ptr.lastX = pt.x
        ptr.lastY = pt.y
        ptr.inside = true
      }
      ptr.x = pt.x
      ptr.y = pt.y
      ptr.pending = true
      wake()
    }
    const onPointerLeave = () => {
      pointerRef.current.inside = false
      pointerRef.current.pending = false
      if (rain > 0) wake()
    }
    const onPointerDown = (e: { clientX: number; clientY: number }) => {
      if (!interactive || reducedRef.current) return
      const pt = localPoint(e)
      const s = surfaceRef.current
      if (!pt || !s) return
      disturb(s, pt.x, pt.y, dropRadius, dropStrength)
      const ptr = pointerRef.current
      ptr.x = ptr.lastX = pt.x
      ptr.y = ptr.lastY = pt.y
      ptr.inside = true
      wake()
    }
    useEffect(() => {
      const target = interactionTargetRef?.current
      if (!target) return
      const isDisabled = (event: PointerEvent) =>
        event.target instanceof Element && !!event.target.closest('[data-ai-ripple-disabled]')
      const move = (event: PointerEvent) => {
        if (isDisabled(event)) onPointerLeave()
        else onPointerMove(event)
      }
      const down = (event: PointerEvent) => {
        if (!isDisabled(event)) onPointerDown(event)
      }
      target.addEventListener('pointermove', move)
      target.addEventListener('pointerdown', down)
      target.addEventListener('pointerleave', onPointerLeave)
      return () => {
        target.removeEventListener('pointermove', move)
        target.removeEventListener('pointerdown', down)
        target.removeEventListener('pointerleave', onPointerLeave)
      }
    }, [interactionTargetRef, onPointerMove, onPointerDown, onPointerLeave])
    useImperativeHandle(
      ref,
      () => ({
        drop: (x, y, strength = dropStrength, radius = dropRadius) => {
          const s = surfaceRef.current
          if (!s || reducedRef.current) return
          disturb(s, x, y, radius, strength)
          wake()
        },
        calm: () => {
          const s = surfaceRef.current
          if (!s) return
          stopLoop()
          flatten(s)
          draw(performance.now())
        },
      }),
      [dropStrength, dropRadius, wake, draw, stopLoop],
    )
    return (
      <div
        ref={rootRef}
        className={classNames(styles['ascii-ripple'], className)}
        style={style}
        onPointerMove={interactionTargetRef ? undefined : onPointerMove}
        onPointerLeave={interactionTargetRef ? undefined : onPointerLeave}
        onPointerDown={interactionTargetRef ? undefined : onPointerDown}
        {...rest}
      >
        <canvas ref={canvasRef} className={styles['ascii-ripple__canvas']} aria-hidden="true" />
      </div>
    )
  },
)
AsciiRipple.displayName = 'AsciiRipple'
export default AsciiRipple
