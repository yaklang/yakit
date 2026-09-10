import { describe, expect, it } from 'vitest'
import { getDiscoveryTimeColumnFixed } from '../riskTableUtils'

describe('getDiscoveryTimeColumnFixed', () => {
  it('keeps the discovery time column fixed when the action column is shown', () => {
    expect(getDiscoveryTimeColumnFixed([])).toBe('right')
    expect(getDiscoveryTimeColumnFixed(['title'])).toBe('right')
  })

  it('removes the fixed position when the action column is excluded', () => {
    expect(getDiscoveryTimeColumnFixed(['action'])).toBeUndefined()
    expect(getDiscoveryTimeColumnFixed(['title', 'action'])).toBeUndefined()
  })
})
