import { describe, expect, it } from 'vitest'
import { getVirtualListWrapperGeometry, resetEmptyVirtualTableViewport } from '../utils'

describe('resetEmptyVirtualTableViewport', () => {
  it('removes the stale scroll range when a deeply-scrolled virtual table is cleared', () => {
    const container = document.createElement('div')
    const wrapper = document.createElement('div')
    container.scrollTop = 182_000
    wrapper.style.height = '182028px'
    wrapper.style.marginTop = '181972px'

    expect(resetEmptyVirtualTableViewport(0, container, wrapper)).toBe(true)
    expect(container.scrollTop).toBe(0)
    expect(wrapper.style.height).toBe('0px')
    expect(wrapper.style.marginTop).toBe('0px')
  })

  it('does not disturb a populated viewport', () => {
    const container = document.createElement('div')
    const wrapper = document.createElement('div')
    container.scrollTop = 280
    wrapper.style.height = '2800px'

    expect(resetEmptyVirtualTableViewport(1, container, wrapper)).toBe(false)
    expect(container.scrollTop).toBe(280)
    expect(wrapper.style.height).toBe('2800px')
  })
})

describe('getVirtualListWrapperGeometry', () => {
  it('mirrors the ahooks wrapper offset for a scrolled window', () => {
    // list[0].index = 100, 500 rows total, 28px rows:
    // margin = 100 × 28, height = (500 - 100) × 28 (same as ahooks useVirtualList).
    expect(getVirtualListWrapperGeometry([{ index: 100 }], 500, 28)).toEqual({
      marginTop: 2800,
      height: 11200,
    })
  })

  it('starts flush at the top for an empty or first-page window', () => {
    expect(getVirtualListWrapperGeometry([], 0, 28)).toEqual({ marginTop: 0, height: 0 })
    expect(getVirtualListWrapperGeometry([{ index: 0 }], 500, 28)).toEqual({ marginTop: 0, height: 14000 })
  })

  it('clamps a negative height to zero when the window outlives its data', () => {
    // Clearing a deeply-scrolled list can leave start > data.length for one
    // render; the wrapper must not get a negative height in that frame.
    expect(getVirtualListWrapperGeometry([{ index: 120 }], 100, 28)).toEqual({ marginTop: 3360, height: 0 })
  })
})
