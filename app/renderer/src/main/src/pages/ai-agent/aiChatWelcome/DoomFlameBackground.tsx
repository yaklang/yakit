import React, { useEffect, useRef } from 'react'
import styles from './DoomFlameBackground.module.scss'

// Oldschool doom flame effect, ported from the character-grid snippet.
// Single-color chars (#eef0f3), value-noise driven.
// Flipped vertically: the noise source sits on the TOP row and the
// flame propagates DOWN towards the bottom (original was bottom->up).

const flame = '...::/\\/\\/\\+=*abcdef01XYZ#'
const { min, max, floor } = Math

const COLOR = '#e6e8ed'
const CELL_W = 8
const CELL_H = 16
// Slower than the original 30fps so the flame drifts down gently.
const FPS = 18
// Noise source ceiling: lower range = sparser, lighter flame at the top.
const NOISE_MIN = 3
const NOISE_MAX = 28
// Per-row decay range: larger = faster taper / thinner flame towards bottom.
const DECAY_MIN = 1
const DECAY_MAX = 4

// --- inline math helpers (original snippet imports them from num.js) ---

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

function map(v: number, a: number, b: number, c: number, d: number) {
  return c + ((v - a) * (d - c)) / (b - a)
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Random int between a and b, inclusive!
function rndi(a: number, b = 0) {
  if (a > b) [a, b] = [b, a]
  return Math.floor(a + Math.random() * (b - a + 1))
}

// Value noise:
// https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/procedural-patterns-noise-part-1
function valueNoise() {
  const tableSize = 256
  const r = new Array<number>(tableSize)
  const permutationTable = new Array<number>(tableSize * 2)

  // Create an array of random values and initialize permutation table
  for (let k = 0; k < tableSize; k++) {
    r[k] = Math.random()
    permutationTable[k] = k
  }

  // Shuffle values of the permutation table
  for (let k = 0; k < tableSize; k++) {
    const i = Math.floor(Math.random() * tableSize)
    // swap
    ;[permutationTable[k], permutationTable[i]] = [permutationTable[i], permutationTable[k]]
    permutationTable[k + tableSize] = permutationTable[k]
  }

  return function (px: number, py: number) {
    const xi = Math.floor(px)
    const yi = Math.floor(py)

    const tx = px - xi
    const ty = py - yi

    const rx0 = xi % tableSize
    const rx1 = (rx0 + 1) % tableSize
    const ry0 = yi % tableSize
    const ry1 = (ry0 + 1) % tableSize

    // Random values at the corners of the cell using permutation table
    const c00 = r[permutationTable[permutationTable[rx0] + ry0]]
    const c10 = r[permutationTable[permutationTable[rx1] + ry0]]
    const c01 = r[permutationTable[permutationTable[rx0] + ry1]]
    const c11 = r[permutationTable[permutationTable[rx1] + ry1]]

    // Remapping of tx and ty using the Smoothstep function
    const sx = smoothstep(0, 1, tx)
    const sy = smoothstep(0, 1, ty)

    // Linearly interpolate values along the x axis
    const nx0 = mix(c00, c10, sx)
    const nx1 = mix(c01, c11, sx)

    // Linearly interpolate the nx0/nx1 along they y axis
    return mix(nx0, nx1, sy)
  }
}

const DoomFlameBackground: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cols = 0
    let rows = 0
    let data: Uint8Array = new Uint8Array(0)
    const noise = valueNoise()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      cols = Math.floor(rect.width / CELL_W)
      rows = Math.floor(rect.height / CELL_H)
      if (cols < 1) cols = 1
      if (rows < 1) rows = 1
      data = new Uint8Array(cols * rows)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let last = 0
    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (t - last < 1000 / FPS) return
      last = t

      if (cols !== 0 && rows !== 0) {
        // --- pre: update buffer (flipped, source on top row) ---

        // Fill the ceiling (top row) with some noise
        const tt = t * 0.0015
        for (let i = 0; i < cols; i++) {
          const val = floor(map(noise(i * 0.05, tt), 0, 1, NOISE_MIN, NOISE_MAX))
          data[i] = min(val, data[i] + 2)
        }

        // Propagate towards the floor with some randomness.
        // Flip of the original: each cell writes to its OWN row (with a
        // random column drift = flame flicker) and reads from the row ABOVE
        // (src). Row 0 reads itself, so the noise source seeds row 1, then
        // row 1 seeds row 2, etc. — the flame moves DOWN.
        // A separate next-buffer keeps sources from being overwritten
        // mid-pass by a random column offset landing on an unprocessed src.
        const next = new Uint8Array(cols * rows)
        for (let i = 0; i < data.length; i++) {
          const row = floor(i / cols)
          const col = i % cols
          // dest is the current row, flickered sideways
          const dest = row * cols + clamp(col + rndi(-1, 1), 0, cols - 1)
          // src is one row UP; row 0 reads itself (the noise source)
          const src = max(0, row - 1) * cols + col
          next[dest] = max(0, data[src] - rndi(DECAY_MIN, DECAY_MAX))
        }
        // Re-seed the top row: the loop above would otherwise erode the
        // freshly-written noise values (row 0 reads itself minus decay).
        for (let i = 0; i < cols; i++) next[i] = data[i]
        data = next

        // --- main: render single-color chars ---

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = COLOR
        ctx.textBaseline = 'top'
        for (let i = 0; i < data.length; i++) {
          const u = data[i]
          if (u === 0) continue
          const row = floor(i / cols)
          const col = i % cols
          ctx.font = (u > 20 ? '700 ' : '100 ') + CELL_H + 'px monospace'
          ctx.fillText(flame[clamp(u, 0, flame.length - 1)], col * CELL_W, row * CELL_H)
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={styles['doom-flame-bg']} />
})

export default DoomFlameBackground
