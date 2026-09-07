import { describe, expect, it } from 'vitest'
import { buildTableMaskScenarioMatrix } from '../table-virtual-fixed-right.driver.mjs'

describe('buildTableMaskScenarioMatrix', () => {
  it('covers one fixed-right column', () => {
    expect(buildTableMaskScenarioMatrix()).toContainEqual(expect.objectContaining({ fixedColumns: 'single-right' }))
  })

  it('covers two fixed-right columns', () => {
    expect(buildTableMaskScenarioMatrix()).toContainEqual(expect.objectContaining({ fixedColumns: 'double-right' }))
  })

  it('covers simultaneous fixed-left and fixed-right columns', () => {
    expect(buildTableMaskScenarioMatrix()).toContainEqual(expect.objectContaining({ fixedColumns: 'left-and-right' }))
  })

  it('keeps the required table states bounded and explicit', () => {
    const states = new Set(buildTableMaskScenarioMatrix().flatMap((scenario) => scenario.states))

    expect(states).toEqual(
      new Set(['empty', 'loading', 'data', 'append', 'prepend', 'replace', 'remove', 'sort-filter-refresh']),
    )
  })

  it('labels the generic fixture without claiming real consumer mounts', () => {
    expect(new Set(buildTableMaskScenarioMatrix().map(({ consumer }) => consumer))).toEqual(
      new Set(['GenericTableVirtualResizeFixture']),
    )
  })
})
