import React, { useRef, useEffect } from 'react'
import GlassFlow from './glass-flow'
import GlassTiles from './glass-tiles'

export interface MemfitAnimatedBgProps {
  theme: 'light' | 'dark'
  borderRadius?: number
}

// ─── edge-fade mask applied to the wrapper div ───────────────────────────────
// Creates a smooth transparent fade inward from all four edges.
const EDGE_MASK = 'radial-gradient(ellipse 90% 90% at 50% 50%, black 55%, transparent 100%)'

// ─── Gradient Bars: pure Canvas 2D, no deps ──────────────────────────────────

const PAL = {
  light: { bg: '#D8E8F5', core: '#4373BB', deep: '#0a1e4a', bright: '#a8c8f0' },
  dark: { bg: '#060e1c', core: '#2860b0', deep: '#020810', bright: '#66A2EB' },
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

function GradientBarsCanvas({ theme }: { theme: 'light' | 'dark' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const themeRef = useRef(theme)

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

      const pal = PAL[themeRef.current]
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
        g.addColorStop(s0, rgba(pal.core, brightness * 0.55))
        g.addColorStop(s1, rgba(pal.bright, brightness))
        g.addColorStop(s2, rgba(pal.deep, 0.85))
        g.addColorStop(s3, rgba(pal.core, brightness * 0.35))
        g.addColorStop(1, rgba(pal.bg, 0.95))

        ctx.fillStyle = g
        ctx.fillRect(x, 0, barW, H)
      }

      ctx.restore()
      t += 0.004
      animRef.current = requestAnimationFrame(frame)
    }
    frame()
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}

// ─── Main component ───────────────────────────────────────────────────────────

type AnimType = 'gradient-bars' | 'glass-flow' | 'glass-tiles'

export const MemfitAnimatedBg: React.FC<MemfitAnimatedBgProps> = ({ theme, borderRadius = 12 }) => {
  // Randomly pick one animation type on mount and keep it stable
  const animType = useRef<AnimType>(
    (['gradient-bars', 'glass-flow', 'glass-tiles'] as AnimType[])[Math.floor(Math.random() * 3)],
  )

  const isDark = theme === 'dark'

  // Memfit blue palette for GlassTiles
  const tilesColorA = isDark ? '#040c1a' : '#1a3a72'
  const tilesColorB = isDark ? '#4090d0' : '#6aabee'
  const tilesBg = isDark ? '#060e1c' : '#c8dff5'

  const inner = (() => {
    switch (animType.current) {
      case 'glass-flow':
        return (
          <GlassFlow
            width="100%"
            height="100%"
            // No imageSrc — component will generate a blue gradient internally
            stripeCount={6}
            angle={-13}
            lensCurvature={0.49}
            refraction={0.12}
            edgeWidth={0.03}
            edgeBrightness={isDark ? 0.12 : 0.08}
            speed={0.06}
            chromaticAberration={0.4}
            edgeSharpness={0.5}
            waveSpeed={0.5}
            waveAmount={0}
            frostAmount={0}
          />
        )
      case 'glass-tiles':
        return (
          <GlassTiles
            width="100%"
            height="100%"
            speed={0.35}
            tileDensity={4}
            rippleLayers={6}
            warpStrength={0.33}
            bandSharpness={3}
            chromaticSpread={0.1}
            colorA={tilesColorA}
            colorB={tilesColorB}
            backgroundColor={tilesBg}
            opacity={1}
          />
        )
      default:
        return <GradientBarsCanvas theme={theme} />
    }
  })()

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius,
        overflow: 'hidden',
        // CSS mask for smooth edge fade — transparent at all four edges
        WebkitMaskImage: EDGE_MASK,
        maskImage: EDGE_MASK,
      }}
    >
      {inner}
    </div>
  )
}
