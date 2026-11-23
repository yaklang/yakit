import { describe, expect, it } from 'vitest'
import { getFullSummaryCount } from '../useCompactSummaryLabels'

describe('summary labels fit from left to right', () => {
  const full = [80, 90, 100]
  const compact = [30, 40, 50]

  it('keeps all labels at the exact boundary and contracts the rightmost label one pixel below', () => {
    expect(getFullSummaryCount(full, compact, 278, 4)).toBe(3)
    expect(getFullSummaryCount(full, compact, 277, 4)).toBe(2)
  })

  it('contracts more labels as space decreases and restores them as it grows', () => {
    expect([278, 228, 178, 128, 178, 228, 278].map((width) => getFullSummaryCount(full, compact, width, 4))).toEqual([
      3, 2, 1, 0, 1, 2, 3,
    ])
  })

  it('handles empty rows and widths below the compact minimum', () => {
    expect(getFullSummaryCount([], [], 0, 4)).toBe(0)
    expect(getFullSummaryCount(full, compact, 90, 4)).toBe(0)
  })

  it('recalculates for changed counts and missing categories', () => {
    expect(getFullSummaryCount([80, 110], [30, 60], 184, 4)).toBe(1)
    expect(getFullSummaryCount([80, 90], [30, 40], 184, 4)).toBe(2)
  })
})
