import { describe, it, expect } from 'vitest'
import { AIAgentIDBCacheClearValue, shouldClearIDBCache } from '../persist/constants'

describe('shouldClearIDBCache', () => {
  it('E7: missing flag should clear (old casualElements snapshots)', () => {
    expect(shouldClearIDBCache(undefined)).toBe(true)
    expect(shouldClearIDBCache(null)).toBe(true)
    expect(shouldClearIDBCache('')).toBe(true)
  })

  it('E7: older flag should clear', () => {
    expect(shouldClearIDBCache('20260113')).toBe(true)
  })

  it('E7: current or newer flag should keep IDB', () => {
    expect(shouldClearIDBCache(AIAgentIDBCacheClearValue)).toBe(false)
    expect(shouldClearIDBCache('20990101')).toBe(false)
  })
})
