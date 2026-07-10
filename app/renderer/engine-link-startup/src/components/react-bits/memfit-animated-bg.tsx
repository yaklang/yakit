import React, { useRef, useEffect } from 'react'

export interface MemfitAnimatedBgProps {
  theme: 'light' | 'dark'
  borderRadius?: number
}

// ─── colour palettes ────────────────────────────────────────────────────────

const PALETTE = {
  light: {
    bg: '#EAF1FA',
    core: '#4373BB',
    deep: '#0a1e4a',
    bright: '#8ab8f0',
    fade: 'rgba(255,255,255,0.94)',
  },
  dark: {
    bg: '#0B1626',
    core: '#66A2EB',
    deep: '#020b1e',
    bright: '#a0c8f8',
    fade: 'rgba(11,22,38,0.94)',
  },
}

// ─── helper: hex → [r, g, b] ────────────────────────────────────────────────

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

// ─── Animation 1: Gradient Bars (flowing vertical bars) ─────────────────────

function drawGradientBars(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, isDark: boolean) {
  const pal = PALETTE[isDark ? 'dark' : 'light']
  const BARS = 7
  const barW = W / BARS

  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < BARS; i++) {
    const x = i * barW
    const phase = t + i * 0.95
    // oscillate the bright core vertically
    const coreY = H * (0.35 + 0.28 * Math.sin(phase))
    const brightness = 0.72 + 0.28 * Math.sin(phase * 1.3 + 0.5)

    const s0 = Math.max(0.05, Math.min(0.45, (coreY - H * 0.18) / H))
    const s1 = Math.max(0.1, Math.min(0.55, coreY / H))
    const s2 = Math.max(0.15, Math.min(0.75, (coreY + H * 0.22) / H))
    const s3 = Math.max(0.2, Math.min(0.9, (coreY + H * 0.45) / H))

    const g = ctx.createLinearGradient(x + barW / 2, 0, x + barW / 2, H)
    g.addColorStop(0, pal.fade)
    g.addColorStop(s0, rgba(pal.core, brightness * 0.55))
    g.addColorStop(s1, rgba(pal.core, brightness))
    g.addColorStop(s2, rgba(pal.deep, 0.85))
    g.addColorStop(s3, rgba(pal.core, brightness * 0.35))
    g.addColorStop(1, pal.fade)

    ctx.fillStyle = g
    ctx.fillRect(x, 0, barW, H)
  }
}

// ─── Animation 2: Glass Flow (horizontal slanted glass slats) ───────────────

function drawGlassFlow(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, isDark: boolean) {
  const pal = PALETTE[isDark ? 'dark' : 'light']
  const SLATS = 9
  const ANGLE = Math.PI / 6 // 30°
  const cosA = Math.cos(ANGLE)
  const sinA = Math.sin(ANGLE)

  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, W, H)

  // Total projected diagonal width across the canvas
  const diag = W / cosA + (H * sinA) / cosA
  const slatW = diag / SLATS

  for (let i = 0; i < SLATS + 2; i++) {
    // scrolling offset drives the slats across the canvas
    const offset = (((t * 0.18 * diag) % diag) + diag) % diag
    const baseX = i * slatW - offset - slatW

    // thickness oscillates slightly
    const thick = slatW * (0.55 + 0.18 * Math.sin(t * 0.7 + i))
    const edgeX = baseX + thick

    // Brightness per slat
    const bright = 0.4 + 0.45 * Math.abs(Math.sin(t * 0.5 + i * 0.8))

    // 4 corners of the slanted parallelogram (rotated by ANGLE)
    const x0 = baseX * cosA
    const y0 = -baseX * sinA + H * 1.5 // extend past canvas top
    const x1 = edgeX * cosA
    const y1 = -edgeX * sinA + H * 1.5
    const x2 = x1
    const y2 = y1 - H * 2
    const x3 = x0
    const y3 = y0 - H * 2

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x3, y3)
    ctx.closePath()

    // radial-like gradient within the slat width
    const gx = (x0 + x1) / 2
    const gy = H / 2
    const g = ctx.createLinearGradient(x0, gy, x1, gy)
    g.addColorStop(0, rgba(pal.core, 0))
    g.addColorStop(0.3, rgba(pal.bright, bright * 0.6))
    g.addColorStop(0.5, rgba(pal.core, bright))
    g.addColorStop(0.7, rgba(pal.bright, bright * 0.5))
    g.addColorStop(1, rgba(pal.core, 0))

    ctx.fillStyle = g
    ctx.fill()
    ctx.restore()
  }
}

// ─── Animation 3: Liquid Lines (flowing sinusoidal lines) ───────────────────

function drawLiquidLines(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, isDark: boolean) {
  const pal = PALETTE[isDark ? 'dark' : 'light']
  const LINES = 24
  const spacing = H / LINES

  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < LINES; i++) {
    const baseY = (i + 0.5) * spacing
    // Each line has its own amplitude and phase
    const amp = spacing * (0.55 + 0.35 * Math.sin(i * 0.7))
    const freq = (1.5 + 1.2 * Math.sin(i * 0.4)) / W
    const phase = t * (0.5 + 0.3 * (i % 3)) + i * 0.6
    const alpha = 0.18 + 0.38 * Math.abs(Math.sin(t * 0.3 + i * 0.5))
    const lineW = 0.8 + 1.2 * Math.abs(Math.sin(t * 0.4 + i * 0.3))

    // Colour cycles slowly between core and bright
    const blend = 0.5 + 0.5 * Math.sin(t * 0.2 + i * 0.9)
    const [cr, cg, cb] = hexRgb(pal.core)
    const [br, bg_, bb] = hexRgb(pal.bright)
    const r = Math.round(cr + (br - cr) * blend)
    const g = Math.round(cg + (bg_ - cg) * blend)
    const b = Math.round(cb + (bb - cb) * blend)

    ctx.beginPath()
    ctx.lineWidth = lineW
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`

    const STEPS = 120
    for (let s = 0; s <= STEPS; s++) {
      const x = (s / STEPS) * W
      const y = baseY + amp * Math.sin(freq * x * Math.PI * 2 + phase)
      if (s === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

// ─── Main component ──────────────────────────────────────────────────────────

type AnimType = 'gradient-bars' | 'glass-flow' | 'liquid-lines'

export const MemfitAnimatedBg: React.FC<MemfitAnimatedBgProps> = ({ theme, borderRadius = 12 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const themeRef = useRef(theme)

  // Randomly pick one of three animations on mount, keep it for the lifetime
  const animType = useRef<AnimType>(
    (['gradient-bars', 'glass-flow', 'liquid-lines'] as AnimType[])[Math.floor(Math.random() * 3)],
  )

  // Theme changes are reflected immediately without restarting the loop
  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Hi-DPI sizing
    const setSize = () => {
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
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

      // Scale for retina
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
        case 'liquid-lines':
          drawLiquidLines(ctx, W, H, t, isDark)
          break
      }

      ctx.restore()
      t += 0.006
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
