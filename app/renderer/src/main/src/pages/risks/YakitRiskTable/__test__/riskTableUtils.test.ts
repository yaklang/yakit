import { describe, expect, it } from 'vitest'
import { getDiscoveryTimeColumnFixed } from '../riskTableUtils'

describe('getDiscoveryTimeColumnFixed', () => {
  it('leaves the discovery time column unfixed when the action column is shown', () => {
    expect(getDiscoveryTimeColumnFixed([])).toBeUndefined()
    expect(getDiscoveryTimeColumnFixed(['title'])).toBeUndefined()
  })

  it('fixes the discovery time column to the right when the action column is excluded', () => {
    expect(getDiscoveryTimeColumnFixed(['action'])).toBe('right')
    expect(getDiscoveryTimeColumnFixed(['title', 'action'])).toBe('right')
  })
})
