import { describe, expect, it } from 'vitest'
import { resetEmptyVirtualTableViewport } from '../utils'

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
