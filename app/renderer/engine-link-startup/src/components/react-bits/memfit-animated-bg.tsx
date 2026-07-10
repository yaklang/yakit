import React, { useRef, useEffect } from 'react'

export interface MemfitAnimatedBgProps {
  theme: 'light' | 'dark'
  borderRadius?: number
}

// Pure canvas 2D implementation of the memfit blue flowing gradient bars animation.
// No external WebGL / three.js dependencies — works with any React version.
export const MemfitAnimatedBg: React.FC<MemfitAnimatedBgProps> = ({ theme, borderRadius = 12 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const themeRef = useRef(theme)

  // Keep themeRef in sync without restarting the animation loop
  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas logical size matches CSS size for sharp pixels on retina
    const setSize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      ctx.scale(ratio, ratio)
    }

    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas)

    // --- colour palettes ---
    const LIGHT = {
      bg: '#EAF1FA',
      // Per-bar peak colours — deep to medium blue
      peaks: ['#1a3a72', '#2d5fb5', '#4373BB', '#1a3a72', '#2d5fb5', '#4373BB', '#1a3a72'],
      topFade: 'rgba(255,255,255,0.92)',
      botFade: 'rgba(255,255,255,0.92)',
      midDark: 'rgba(5,15,48,0.82)',
    }
    const DARK = {
      bg: '#0B1626',
      peaks: ['#1a4080', '#2860b0', '#66A2EB', '#1a4080', '#2860b0', '#66A2EB', '#1a4080'],
      topFade: 'rgba(11,22,38,0.92)',
      botFade: 'rgba(11,22,38,0.92)',
      midDark: 'rgba(2,5,15,0.88)',
    }

    const BARS = 7
    let time = 0

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      const barW = W / BARS
      const pal = themeRef.current === 'light' ? LIGHT : DARK

      // Background fill
      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, W, H)

      for (let i = 0; i < BARS; i++) {
        const x = i * barW

        // Each bar gets an independent phase so they appear to wave
        const phase = time + i * 0.95
        // Vertical position of the bright "core" oscillates slowly
        const coreY = H * (0.35 + 0.28 * Math.sin(phase))
        // Brightness pulse for subtle shimmer
        const bright = 0.72 + 0.28 * Math.sin(phase * 1.3 + 0.5)

        const grad = ctx.createLinearGradient(x + barW / 2, 0, x + barW / 2, H)
        const peak = pal.peaks[i]

        grad.addColorStop(0, pal.topFade)

        // Approach the bright core from top
        const stop1 = Math.max(0.05, Math.min(0.45, (coreY - H * 0.18) / H))
        const stop2 = Math.max(0.1, Math.min(0.55, coreY / H))
        // Dark trough just past the core
        const stop3 = Math.max(0.15, Math.min(0.75, (coreY + H * 0.22) / H))
        const stop4 = Math.max(0.2, Math.min(0.9, (coreY + H * 0.45) / H))

        grad.addColorStop(stop1, hexAlpha(peak, bright * 0.55))
        grad.addColorStop(stop2, hexAlpha(peak, bright))
        grad.addColorStop(stop3, pal.midDark)
        grad.addColorStop(stop4, hexAlpha(peak, bright * 0.35))

        grad.addColorStop(1, pal.botFade)

        ctx.fillStyle = grad
        ctx.fillRect(x, 0, barW, H)
      }

      time += 0.006
      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, []) // run once; theme changes are handled via themeRef

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

// Helper: convert hex colour + 0-1 alpha to rgba() string
function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
}
