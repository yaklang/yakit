import { describe, expect, it } from 'vitest'
import { clampHunkBarPosition, HUNK_BAR_LAYOUT } from '../hunkBarPosition'

const { marginX, gapX, gapY, pad, stackGap } = HUNK_BAR_LAYOUT

const wideEditor = {
  top: 100,
  left: 40,
  right: 640,
  bottom: 500,
}

describe('clampHunkBarPosition', () => {
  it('places the bar to the right of the line and vertically centered when it fits', () => {
    const barW = 120
    const barHeight = 32
    const rowTop = 220
    const rowHeight = 40
    const { top, left } = clampHunkBarPosition({
      editorRect: wideEditor,
      row: { rowTop, rowHeight, textRight: 200, visCol1Top: 120 },
      barW,
      barHeight,
      stackIndex: 0,
    })
    expect(left).toBe(200 + gapX)
    expect(top).toBe(rowTop + (rowHeight - barHeight) / 2)
  })

  it('stacks subsequent bars downward when they still fit to the right', () => {
    const barHeight = 32
    const rowHeight = 40
    const { top } = clampHunkBarPosition({
      editorRect: wideEditor,
      row: { rowTop: 220, rowHeight, textRight: 200, visCol1Top: 120 },
      barW: 120,
      barHeight,
      stackIndex: 2,
    })
    const baseTop = 220 + (rowHeight - barHeight) / 2
    expect(top).toBe(baseTop + 2 * (barHeight + stackGap))
  })

  it('clamps to the right edge and sits above the line when the row is too wide', () => {
    const barW = 220
    const barHeight = 32
    const rowTop = 300
    const { top, left } = clampHunkBarPosition({
      editorRect: wideEditor,
      row: { rowTop, rowHeight: 18, textRight: 620, visCol1Top: 200 },
      barW,
      barHeight,
      stackIndex: 0,
    })
    expect(left).toBe(wideEditor.right - marginX - barW)
    expect(top).toBe(rowTop - barHeight - gapY)
  })

  it('flips above the last line when a right-side bar would overflow the bottom', () => {
    const barHeight = 32
    const rowTop = 470
    const { top } = clampHunkBarPosition({
      editorRect: wideEditor,
      row: { rowTop, rowHeight: 18, textRight: 200, visCol1Top: 360 },
      barW: 120,
      barHeight,
      stackIndex: 0,
    })
    expect(top).toBe(rowTop - barHeight - gapY)
    expect(top + barHeight).toBeLessThanOrEqual(wideEditor.bottom - pad)
  })

  it('clamps into the visible editor box when even the above-line slot is clipped', () => {
    const barHeight = 40
    const { top, left } = clampHunkBarPosition({
      editorRect: { top: 0, left: 0, right: 200, bottom: 50 },
      row: { rowTop: 2, rowHeight: 16, textRight: 180, visCol1Top: 2 },
      barW: 160,
      barHeight,
      stackIndex: 0,
    })
    expect(top).toBe(pad)
    expect(top + barHeight).toBeLessThanOrEqual(50 - pad)
    expect(left).toBeGreaterThanOrEqual(marginX)
    expect(left + 160).toBeLessThanOrEqual(200 - marginX)
  })
})
