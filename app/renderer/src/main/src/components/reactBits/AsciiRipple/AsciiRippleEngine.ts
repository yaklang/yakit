export interface RippleOptions {
  text: string
  font: string
  fontSize: number
  lineHeight: number
  resolution: number
  edges: 'absorb' | 'reflect'
  chars: string
  speed: number
  damping: number
  viscosity: number
  dropStrength: number
  dropRadius: number
  dragStrength: number
  dragRadius: number
  rain: number
  rainStrength: number
  sensitivity: number
  slopeGain: number
  refraction: number
  scramble: number
  scrambleSpeed: number
  dither: number
  vignette: number
  textOpacity: number
  interactive: boolean
  backgroundColor: string
  ramps: { up: string[]; down: string[] }
}

type RippleCanvas = HTMLCanvasElement | OffscreenCanvas
type RippleContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
const DEFAULT_CHARS = '·.,:;-~=+*%#@'
const IDLE_THRESHOLD = 0.0015
const STEP = 1 / 90
const MAX_STEPS = 4
const RAMP_STEPS = 24
const RESTORE = 0.004
const FRAME_INTERVAL = 1000 / 60
const MAX_PIXEL_RATIO = 1.5
const hash = (x: number, y: number, z: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return n - Math.floor(n)
}
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
interface Surface {
  w: number
  h: number
  cell: number
  prev: Float32Array
  cur: Float32Array
  next: Float32Array
  mask: Float32Array
  energy: number
  minX: number
  minY: number
  maxX: number
  maxY: number
}
interface Grid {
  cols: number
  rows: number
  charW: number
  lineH: number
  base: string[][]
  lines: string[]
  noise: Float32Array
  mergeable: Map<string, boolean>
}
interface HotCell {
  x: number
  y: number
  ch: string
  color: string
  endColumn: number
  mergeable: boolean
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
    base.push(line.padEnd(cols, ' ').slice(0, cols).split(''))
  }
  const noise = new Float32Array(cols * rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) noise[r * cols + c] = hash(c, r, 0)
  }
  return { cols, rows, charW, lineH, base, lines: base.map((row) => row.join('')), noise, mergeable: new Map() }
}
const buildSurface = (width: number, height: number, cell: number, edges: RippleOptions['edges']): Surface => {
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
    minX: w,
    minY: h,
    maxX: -1,
    maxY: -1,
  }
}
const stepSurface = (
  s: Surface,
  c2: number,
  visc: number,
  damping: number,
  edges: RippleOptions['edges'],
  visibleHeight: number,
) => {
  const { w, h, prev, cur, next, mask } = s
  const keep = 1 - damping
  const k = c2 + visc
  const restore = 1 - RESTORE
  let energy = 0
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1
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
      if (a > visibleHeight) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
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
  s.minX = minX
  s.minY = minY
  s.maxX = maxX
  s.maxY = maxY
}
const flatten = (s: Surface) => {
  s.cur.fill(0)
  s.prev.fill(0)
  s.next.fill(0)
  s.energy = 0
  s.minX = s.w
  s.minY = s.h
  s.maxX = s.maxY = -1
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
  s.minX = Math.min(s.minX, x0)
  s.minY = Math.min(s.minY, y0)
  s.maxX = Math.max(s.maxX, x1)
  s.maxY = Math.max(s.maxY, y1)
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

// 主线程和 worker 共用同一套模拟与绘制。
export const createRippleEngine = (
  canvas: RippleCanvas,
  initialOptions: RippleOptions,
  createCanvas: () => RippleCanvas,
) => {
  let options = initialOptions
  let gridState: Grid | null = null
  let surfaceState: Surface | null = null
  let frame = 0
  let running = false
  let lastTime = 0
  let accumulator = 0
  let rainAccumulator = 0
  let lastDraw = 0
  let reduced = false
  let destroyed = false
  let sized = false
  let bounds = { width: 1, height: 1, dpr: 1 }
  let paintedState: {
    background: RippleCanvas
    vignette: number
    backgroundColor: string
    startRow: number
    endRow: number
  } | null = null
  let backgroundState: {
    canvas: RippleCanvas
    grid: Grid
    font: string
    color: string
    opacity: number
    dpr: number
  } | null = null
  let fadeState: { canvas: RippleCanvas; width: number; height: number; amount: number } | null = null
  const sample = new Float32Array(3)
  const pointer = { x: 0, y: 0, lastX: 0, lastY: 0, inside: false, pending: false }
  const draw = (now: number) => {
    const grid = gridState
    const surface = surfaceState
    if (!canvas || !grid || !surface) return
    const ctx = canvas.getContext('2d') as RippleContext | null
    if (!ctx) return
    const p = options
    const { cols, rows, charW, lineH, base, lines, noise } = grid
    const { width: cw, height: ch, dpr } = bounds
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.font = p.font
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    let background = backgroundState
    if (
      !background ||
      background.grid !== grid ||
      background.font !== p.font ||
      background.color !== p.ramps.up[0] ||
      background.opacity !== p.textOpacity ||
      background.dpr !== dpr
    ) {
      const sheet = createCanvas()
      sheet.width = canvas.width
      sheet.height = canvas.height
      const sheetCtx = sheet.getContext('2d') as RippleContext | null
      if (!sheetCtx) return
      sheetCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sheetCtx.font = p.font
      sheetCtx.textBaseline = 'middle'
      sheetCtx.fillStyle = p.ramps.up[0]
      sheetCtx.globalAlpha = p.textOpacity
      for (let r = 0; r < rows; r++) sheetCtx.fillText(lines[r], 0, r * lineH + lineH / 2)
      background = { canvas: sheet, grid, font: p.font, color: p.ramps.up[0], opacity: p.textOpacity, dpr }
      backgroundState = background
    }
    const palette = p.chars.length ? p.chars : DEFAULT_CHARS
    const plen = palette.length
    const active = surface.energy > IDLE_THRESHOLD
    const seed = Math.floor(now / Math.max(16, p.scrambleSpeed))
    const out = sample
    const slopeScale = p.resolution
    // 包含插值与斜率采样的邻格，只跳过不可能显示波纹的区域。
    const startColumn = Math.max(0, Math.floor(((surface.minX - 3) * surface.cell) / charW))
    const endColumn = Math.min(cols - 1, Math.ceil(((surface.maxX + 2) * surface.cell) / charW))
    const startRow = Math.max(0, Math.floor(((surface.minY - 3) * surface.cell) / lineH))
    const endRow = Math.min(rows - 1, Math.ceil(((surface.maxY + 2) * surface.cell) / lineH))
    const painted = paintedState
    const fullRedraw =
      !painted ||
      painted.background !== background.canvas ||
      painted.vignette !== p.vignette ||
      painted.backgroundColor !== p.backgroundColor
    const currentStart = active ? startRow : rows
    const currentEnd = active ? endRow : -1
    const firstRow = fullRedraw ? 0 : Math.max(0, Math.min(currentStart, painted.startRow) - 1)
    const lastRow = fullRedraw ? rows - 1 : Math.min(rows - 1, Math.max(currentEnd, painted.endRow) + 1)
    paintedState = {
      background: background.canvas,
      vignette: p.vignette,
      backgroundColor: p.backgroundColor,
      startRow: currentStart,
      endRow: currentEnd,
    }
    if (firstRow > lastRow) return
    // 只重绘新旧波纹覆盖的行，其他背景像素保持不动。
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, firstRow * lineH, cw, (lastRow - firstRow + 1) * lineH)
    ctx.clip()
    ctx.clearRect(0, 0, cw, ch)
    const hot: HotCell[] = []
    ctx.globalAlpha = 1
    ctx.drawImage(background.canvas, 0, 0, cw, ch)
    ctx.globalAlpha = p.textOpacity
    ctx.fillStyle = p.ramps.up[0]
    for (let r = startRow; active && r <= endRow; r++) {
      const row = base[r]
      const cy = r * lineH + lineH / 2
      let line = lines[r].slice(0, startColumn)
      let hasHighlights = false
      for (let c = startColumn; c <= endColumn; c++) {
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
        const threshold = 0.5 + (noise[r * cols + c] - 0.5) * p.dither
        if (intensity * p.scramble >= threshold) {
          const jitter = (hash(c, r, seed) - 0.5) * plen * 0.3
          const idx = Math.max(0, Math.min(plen - 1, Math.round(intensity * (plen - 1) + jitter)))
          glyph = palette[idx]
        }
        hasHighlights = true
        if (glyph === ' ') {
          line += ' '
          continue
        }
        const ramp = hgt >= 0 ? p.ramps.up : p.ramps.down
        const level = Math.round(intensity * RAMP_STEPS)
        const color = ramp[level]
        let mergeable = grid.mergeable.get(glyph)
        if (mergeable === undefined) {
          mergeable = Math.abs(ctx.measureText(glyph).width - charW) < 0.01
          grid.mergeable.set(glyph, mergeable)
        }
        const previous = hot[hot.length - 1]
        // 相邻同色字符合并绘制，保持原来的波纹位置和颜色。
        if (
          mergeable &&
          previous?.mergeable &&
          previous.y === cy &&
          previous.endColumn === c - 1 &&
          previous.color === color
        ) {
          previous.ch += glyph
          previous.endColumn = c
        } else
          hot.push({
            x: c * charW,
            y: cy,
            ch: glyph,
            color,
            endColumn: c,
            mergeable,
          })
        line += ' '
      }
      line += lines[r].slice(endColumn + 1)
      if (hasHighlights) {
        ctx.clearRect(0, r * lineH, cw, lineH)
        ctx.fillText(line, 0, cy)
      }
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
      let mask = fadeState
      if (!mask || mask.width !== canvas.width || mask.height !== canvas.height || mask.amount !== p.vignette) {
        const sheet = createCanvas()
        sheet.width = canvas.width
        sheet.height = canvas.height
        const maskCtx = sheet.getContext('2d') as RippleContext | null
        if (!maskCtx) {
          ctx.restore()
          return
        }
        maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        const band = clamp01(p.vignette) * (Math.min(cw, ch) / 2)
        const fade = (x0: number, y0: number, x1: number, y1: number) => {
          const grad = maskCtx.createLinearGradient(x0, y0, x1, y1)
          grad.addColorStop(0, 'rgba(0,0,0,1)')
          grad.addColorStop(0.3, 'rgba(0,0,0,0.6)')
          grad.addColorStop(0.7, 'rgba(0,0,0,0.15)')
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          maskCtx.fillStyle = grad
          maskCtx.fillRect(0, 0, cw, ch)
        }
        fade(0, 0, band, 0)
        fade(cw, 0, cw - band, 0)
        fade(0, 0, 0, band)
        fade(0, ch, 0, ch - band)
        mask = { canvas: sheet, width: canvas.width, height: canvas.height, amount: p.vignette }
        fadeState = mask
      }
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(mask.canvas, 0, 0, cw, ch)
      ctx.globalCompositeOperation = 'source-over'
    }
    if (p.backgroundColor && p.backgroundColor !== 'transparent') {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = p.backgroundColor
      ctx.fillRect(0, 0, cw, ch)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()
  }
  const tick = (now: number) => {
    if (destroyed || reduced) return
    const surface = surfaceState
    const grid = gridState
    if (!surface || !grid) {
      running = false
      return
    }
    const p = options
    // 高刷新率屏幕也最多绘制 60 帧，模拟仍按实际间隔推进。
    if (now - lastDraw < FRAME_INTERVAL - 0.5) {
      frame = requestAnimationFrame(tick)
      return
    }
    lastDraw += FRAME_INTERVAL
    if (now - lastDraw >= FRAME_INTERVAL) lastDraw = now
    const dt = Math.min(0.1, (now - lastTime) / 1000 || 0)
    lastTime = now
    const ptr = pointer
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
      rainAccumulator += dt * p.rain
      while (rainAccumulator >= 1) {
        rainAccumulator -= 1
        disturb(
          surface,
          Math.random() * grid.cols * grid.charW,
          Math.random() * grid.rows * grid.lineH,
          p.dropRadius * (0.6 + Math.random() * 0.6),
          p.rainStrength * (0.6 + Math.random() * 0.8),
        )
      }
    } else {
      rainAccumulator = 0
    }
    const c2 = 0.02 + clamp01(p.speed) * 0.4
    const visc = Math.min(0.49 - c2, clamp01(p.viscosity) * 0.12)
    const damping = Math.min(0.5, Math.max(0, p.damping))
    const visibleHeight =
      0.12 / Math.max(0.001, Math.abs(p.sensitivity) + Math.SQRT2 * p.resolution * Math.abs(p.slopeGain))
    accumulator += dt
    let steps = 0
    while (accumulator >= STEP && steps < MAX_STEPS) {
      stepSurface(surface, c2, visc, damping, p.edges, visibleHeight)
      accumulator -= STEP
      steps++
    }
    if (steps === MAX_STEPS) accumulator = 0
    if (surface.energy < IDLE_THRESHOLD && !raining) {
      flatten(surface)
      draw(now)
      running = false
      frame = 0
      return
    }
    draw(now)
    frame = requestAnimationFrame(tick)
  }

  const stopLoop = () => {
    running = false
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  const wake = () => {
    if (running || reduced || destroyed || !surfaceState || !gridState) return
    running = true
    lastTime = performance.now()
    lastDraw = 0
    accumulator = 0
    frame = requestAnimationFrame(tick)
  }

  const rebuild = () => {
    if (!sized || destroyed) return
    stopLoop()
    const { width, height, dpr } = bounds
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    paintedState = null
    const ctx = canvas.getContext('2d') as RippleContext | null
    if (!ctx) return
    ctx.font = options.font
    const charW = ctx.measureText('M').width || options.fontSize * 0.6
    const lineH = options.fontSize * options.lineHeight
    gridState = buildGrid(width, height, charW, lineH, options.text)
    const cell = lineH / Math.max(1, Math.min(4, options.resolution))
    surfaceState = buildSurface(width, height, cell, options.edges)
    pointer.pending = false
    pointer.inside = false
    rainAccumulator = 0
    draw(performance.now())
    if (options.rain > 0) wake()
  }

  return {
    resize(width: number, height: number, dpr: number) {
      if (destroyed) return
      const next = {
        width: Math.max(1, width),
        height: Math.max(1, height),
        dpr: Math.min(MAX_PIXEL_RATIO, dpr || 1),
      }
      if (sized && bounds.width === next.width && bounds.height === next.height && bounds.dpr === next.dpr) return
      bounds = next
      sized = true
      rebuild()
    },
    update(next: RippleOptions) {
      if (destroyed) return
      const rebuildNeeded =
        options.text !== next.text ||
        options.font !== next.font ||
        options.fontSize !== next.fontSize ||
        options.lineHeight !== next.lineHeight ||
        options.resolution !== next.resolution ||
        options.edges !== next.edges
      options = next
      if (!options.interactive) {
        pointer.pending = false
        pointer.inside = false
      }
      if (rebuildNeeded) rebuild()
      else {
        draw(performance.now())
        if (options.rain > 0) wake()
      }
    },
    move(x: number, y: number) {
      if (destroyed || reduced || !options.interactive) return
      if (!pointer.inside) {
        pointer.lastX = x
        pointer.lastY = y
        pointer.inside = true
      }
      pointer.x = x
      pointer.y = y
      pointer.pending = true
      wake()
    },
    leave() {
      if (destroyed) return
      pointer.inside = false
      pointer.pending = false
      if (options.rain > 0) wake()
    },
    drop(x: number, y: number, strength = options.dropStrength, radius = options.dropRadius) {
      if (destroyed || reduced || !surfaceState) return
      disturb(surfaceState, x, y, radius, strength)
      wake()
    },
    calm() {
      if (destroyed) return
      stopLoop()
      pointer.pending = false
      pointer.inside = false
      rainAccumulator = 0
      if (surfaceState) flatten(surfaceState)
      draw(performance.now())
    },
    setReducedMotion(value: boolean) {
      if (destroyed || reduced === value) return
      reduced = value
      if (reduced) {
        stopLoop()
        pointer.pending = false
        pointer.inside = false
        rainAccumulator = 0
        if (surfaceState) flatten(surfaceState)
        draw(performance.now())
      } else if (options.rain > 0) wake()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      stopLoop()
      pointer.pending = false
      surfaceState = null
      gridState = null
      backgroundState = null
      fadeState = null
      paintedState = null
    },
  }
}
