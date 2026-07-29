import { describe, expect, it } from 'vitest'
import { shouldRenderVirtualTableCellForHover } from '../TableVirtualResize.memo'

describe('TableVirtualResize cell hover memoization', () => {
  it('renders only cells in the previous or next hovered row', () => {
    expect(shouldRenderVirtualTableCellForHover(1, 2, 1, 1)).toBe(true)
    expect(shouldRenderVirtualTableCellForHover(1, 2, 2, 2)).toBe(true)
    expect(shouldRenderVirtualTableCellForHover(1, 2, 3, 3)).toBe(false)
  })

  it('handles entering, leaving and unchanged hover without treating an undefined row as hovered', () => {
    expect(shouldRenderVirtualTableCellForHover(undefined, 2, 2, 2)).toBe(true)
    expect(shouldRenderVirtualTableCellForHover(2, undefined, 2, 2)).toBe(true)
    expect(shouldRenderVirtualTableCellForHover(undefined, 2, undefined, undefined)).toBe(false)
    expect(shouldRenderVirtualTableCellForHover(2, 2, 2, 2)).toBe(false)
  })

  it('uses each render snapshot row ID when virtualized data changes', () => {
    expect(shouldRenderVirtualTableCellForHover(10, 20, 10, 20)).toBe(true)
    expect(shouldRenderVirtualTableCellForHover(10, 20, 30, 40)).toBe(false)
  })
})
