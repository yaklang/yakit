import React, { useRef, useEffect } from 'react'

export interface MemfitAnimatedBgProps {
  theme: 'light' | 'dark'
  borderRadius?: number
}

// ─── colour palettes ─────────────────────────────────────────────────────────

const PAL = {
  light: {
    bg: '#D8E8F5',
    tileBase: '#3a6fbb',
    tileDark: '#1a3a72',
    tileBright: '#a8c8f0',
    shine: 'rgba(255,255,255,0.92)',
    shineEdge: 'rgba(200,225,255,0.5)',
    blobFill: '#4373BB',
    blobEdge: '#a8c8f0',
    blobDark: '#0d2a5e',
  },
  dark: {
    bg: '#060e1c',
    tileBase: '#0d2040',
    tileDark: '#040c1a',
    tileBright: '#2860b0',
    shine: 'rgba(120,180,255,0.85)',
    shineEdge: 'rgba(60,120,220,0.35)',
    blobFill: '#0f2a60',
    blobEdge: '#4a90e0',
    blobDark: '#020810',
  },
}

// ─── helper ───────────────────────────────────────────────────────────────────

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

// ─── edge vignette overlay ────────────────────────────────────────────────────
// draws a frame gradient so the canvas edges fade smoothly into transparent

function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number, bgHex: string, strength = 0.85) {
  const fade = (gx0: number, gy0: number, gx1: number, gy1: number, size: number) => {
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
    g.addColorStop(0, rgba(bgHex, strength))
    g.addColorStop(Math.min(1, size), 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  const edge = Math.min(W, H) * 0.22
  // top
  fade(0, 0, 0, edge, 1)
  // bottom
  fade(0, H, 0, H - edge, 1)
  // left
  fade(0, 0, edge, 0, 1)
  // right
  fade(W, 0, W - edge, 0, 1)
}

// ─── Animation 1: Gradient Bars (flowing vertical bars) ──────────────────────

function drawGradientBars(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, isDark: boolean) {
  const pal = PAL[isDark ? 'dark' : 'light']
  const BARS = 7
  const barW = W / BARS

  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < BARS; i++) {
    const x = i * barW
    const phase = t + i * 0.95
    const coreY = H * (0.35 + 0.28 * Math.sin(phase))
    const brightness = 0.72 + 0.28 * Math.sin(phase * 1.3 + 0.5)

    const s0 = Math.max(0.05, Math.min(0.45, (coreY - H * 0.18) / H))
    const s1 = Math.max(0.1, Math.min(0.55, coreY / H))
    const s2 = Math.max(0.15, Math.min(0.75, (coreY + H * 0.22) / H))
    const s3 = Math.max(0.2, Math.min(0.9, (coreY + H * 0.45) / H))

    const g = ctx.createLinearGradient(x + barW / 2, 0, x + barW / 2, H)
    g.addColorStop(0, rgba(pal.bg, 0.95))
    g.addColorStop(s0, rgba(pal.blobFill, brightness * 0.55))
    g.addColorStop(s1, rgba(pal.blobEdge, brightness))
    g.addColorStop(s2, rgba(pal.blobDark, 0.85))
    g.addColorStop(s3, rgba(pal.blobFill, brightness * 0.35))
    g.addColorStop(1, rgba(pal.bg, 0.95))

    ctx.fillStyle = g
    ctx.fillRect(x, 0, barW, H)
  }

  drawVignette(ctx, W, H, pal.bg, 0.8)
}

// ─── Animation 2: Glass Flow (organic curved glass shapes) ───────────────────
// Mimics the react-bits GlassFlow effect: large organic blob panels that shift
// slowly across the canvas, each with curved edges and a bright rim highlight.

function drawGlassFlow(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, isDark: boolean) {
  const pal = PAL[isDark ? 'dark' : 'light']

  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, W, H)

  const BLOBS = 6
  for (let i = 0; i < BLOBS; i++) {
    // Each blob has its own slow drift
    const px = i / BLOBS
    const baseX = W * (px + 0.08 * Math.sin(t * 0.18 + i * 1.3))
    const baseY = H * (0.3 + 0.4 * Math.sin(t * 0.14 + i * 0.9))

    // Width / height of the blob varies slowly
    const bw = W * (0.28 + 0.1 * Math.sin(t * 0.12 + i * 0.7))
    const bh = H * (0.55 + 0.2 * Math.sin(t * 0.1 + i * 1.1))

    // Organic rounded quadrilateral via bezier
    const cx = baseX
    const cy = baseY
    const sx = bw * 0.5
    const sy = bh * 0.5
    // Control point bulge oscillates per blob
    const bulge = 0.18 + 0.12 * Math.sin(t * 0.2 + i * 0.8)

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(cx - sx, cy)
    // top arc
    ctx.bezierCurveTo(cx - sx, cy - sy * (1 + bulge), cx + sx, cy - sy * (1 + bulge), cx + sx, cy)
    // bottom arc
    ctx.bezierCurveTo(cx + sx, cy + sy * (1 + bulge), cx - sx, cy + sy * (1 + bulge), cx - sx, cy)
    ctx.closePath()

    // Fill with radial gradient (deep centre → bright edge)
    const rg = ctx.createRadialGradient(cx, cy - sy * 0.2, 0, cx, cy, Math.max(sx, sy) * 1.1)
    rg.addColorStop(0, rgba(pal.blobDark, 0.72))
    rg.addColorStop(0.55, rgba(pal.blobFill, 0.55))
    rg.addColorStop(0.85, rgba(pal.blobEdge, 0.38))
    rg.addColorStop(1, rgba(pal.blobEdge, 0))
    ctx.fillStyle = rg
    ctx.fill()

    // Bright curved rim highlight along the top-left edge
    const rimAlpha = 0.45 + 0.35 * Math.sin(t * 0.16 + i * 1.2)
    const lg = ctx.createLinearGradient(cx - sx, cy - sy, cx + sx * 0.4, cy + sy * 0.4)
    lg.addColorStop(
      0,
      rgba(
        pal.shine.replace('rgba(', '').replace(')', '').split(',').slice(0, 3).join(',') === ''
          ? '#ffffff'
          : pal.tileBright,
        rimAlpha,
      ),
    )
    lg.addColorStop(0.3, rgba(pal.blobEdge, rimAlpha * 0.6))
    lg.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.strokeStyle = lg
    ctx.lineWidth = 1.5 + 1.5 * Math.abs(Math.sin(t * 0.13 + i))
    ctx.stroke()

    ctx.restore()
  }

  drawVignette(ctx, W, H, pal.bg, 0.9)
}

// ─── Animation 3: Glass Tiles ────────────────────────────────────────────────
// Grid of rounded-rectangle tiles with a slowly-sweeping band of light on each.
// Inspired by the react-bits GlassTiles effect.

function drawGlassTiles(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, isDark: boolean) {
  const pal = PAL[isDark ? 'dark' : 'light']

  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, W, H)

  const COLS = 5
  const ROWS = 4
  const GAP = 4
  const tileW = (W - GAP * (COLS + 1)) / COLS
  const tileH = (H - GAP * (ROWS + 1)) / ROWS
  const r = Math.min(tileW, tileH) * 0.18

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tx = GAP + col * (tileW + GAP)
      const ty = GAP + row * (tileH + GAP)

      // Clipping rounded rect
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(tx, ty, tileW, tileH, r)
      ctx.clip()

      // Base tile background
      const bg = ctx.createLinearGradient(tx, ty, tx + tileW, ty + tileH)
      bg.addColorStop(0, rgba(pal.tileDark, 1))
      bg.addColorStop(0.6, rgba(pal.tileBase, 0.9))
      bg.addColorStop(1, rgba(pal.tileDark, 1))
      ctx.fillStyle = bg
      ctx.fillRect(tx, ty, tileW, tileH)

      // Each tile has an independent phase for the light band
      const phase = t * 0.4 + col * 0.55 + row * 0.38
      // Normalised 0-1 band position sweeps continuously
      const bandPos = Math.sin(phase) * 0.5 + 0.5 // 0..1

      // Band: a bright diagonal ribbon sweeping from top-left to bottom-right
      const bx0 = tx + (bandPos - 0.3) * (tileW + tileH)
      const by0 = ty
      const bx1 = bx0 + tileH
      const by1 = ty + tileH

      const band = ctx.createLinearGradient(bx0, by0, bx1, by1)
      band.addColorStop(0, 'rgba(0,0,0,0)')
      band.addColorStop(0.38, rgba(pal.tileBright, 0.1))
      band.addColorStop(
        0.5,
        rgba(pal.shine.replace('rgba(', '').replace(')', '') === '' ? '#ffffff' : pal.tileBright, isDark ? 0.65 : 0.75),
      )
      band.addColorStop(0.62, rgba(pal.tileBright, 0.1))
      band.addColorStop(1, 'rgba(0,0,0,0)')

      ctx.fillStyle = band
      ctx.fillRect(tx, ty, tileW, tileH)

      // Subtle inner rim highlight (top-left edge)
      const rim = ctx.createLinearGradient(tx, ty, tx + tileW * 0.4, ty + tileH * 0.4)
      rim.addColorStop(0, rgba(pal.tileBright, isDark ? 0.3 : 0.5))
      rim.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rim
      ctx.fillRect(tx, ty, tileW, tileH)

      ctx.restore()

      // Tile border (thin bright outline)
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(tx, ty, tileW, tileH, r)
      ctx.strokeStyle = rgba(pal.tileBright, isDark ? 0.18 : 0.3)
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }
  }

  drawVignette(ctx, W, H, pal.bg, 0.88)
}

// ─── Main component ───────────────────────────────────────────────────────────

type AnimType = 'gradient-bars' | 'glass-flow' | 'glass-tiles'

export const MemfitAnimatedBg: React.FC<MemfitAnimatedBgProps> = ({ theme, borderRadius = 12 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const themeRef = useRef(theme)

  // Randomly pick one of three animations on mount
  const animType = useRef<AnimType>(
    (['gradient-bars', 'glass-flow', 'glass-tiles'] as AnimType[])[Math.floor(Math.random() * 3)],
  )

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const setSize = () => {
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      const nw = Math.round(width * ratio)
      const nh = Math.round(height * ratio)
      if (canvas.width !== nw || canvas.height !== nh) {
        canvas.width = nw
        canvas.height = nh
      }
    }
    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas)

    let t = 0

    const frame = () => {
      const ratio = window.devicePixelRatio || 1
      const W = canvas.width / ratio
      const H = canvas.height / ratio
      if (W === 0 || H === 0) {
        animRef.current = requestAnimationFrame(frame)
        return
      }

      ctx.save()
      ctx.scale(ratio, ratio)

      const isDark = themeRef.current === 'dark'

      switch (animType.current) {
        case 'gradient-bars':
          drawGradientBars(ctx, W, H, t, isDark)
          break
        case 'glass-flow':
          drawGlassFlow(ctx, W, H, t, isDark)
          break
        case 'glass-tiles':
          drawGlassTiles(ctx, W, H, t, isDark)
          break
      }

      ctx.restore()
      // Intentionally slow: 0.004 rad/frame ≈ very gentle motion
      t += 0.004
      animRef.current = requestAnimationFrame(frame)
    }

    frame()

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        borderRadius,
      }}
    />
  )
}
