import { describe, expect, it } from 'vitest'
import {
  getRiskTagEntries,
  getSessionRiskTagEntries,
  mapSessionRiskLevelCount,
  RISK_TAG_ORDER,
} from '../riskLevelCount'

describe('riskLevelCount', () => {
  it('mapSessionRiskLevelCount：critical→serious，warning→medium，info+other→info', () => {
    expect(
      mapSessionRiskLevelCount({
        critical: 4,
        high: 6,
        warning: 1,
        low: 3,
        info: 5,
        other: 3,
        total: 22,
      }),
    ).toEqual({
      serious: 4,
      high: 6,
      medium: 1,
      low: 3,
      info: 8,
    })
  })

  it('getRiskTagEntries：按 RISK_TAG_ORDER 过滤 0 值', () => {
    expect(RISK_TAG_ORDER).toEqual(['serious', 'high', 'medium', 'low', 'info'])
    expect(
      getRiskTagEntries({
        serious: 2,
        high: 0,
        medium: undefined,
        low: 1,
        info: 0,
      }),
    ).toEqual([
      { field: 'serious', value: 2 },
      { field: 'low', value: 1 },
    ])
  })

  it('getSessionRiskTagEntries：缺 levelCount 返回空，有数据时完成映射与过滤', () => {
    expect(getSessionRiskTagEntries(undefined)).toEqual([])
    expect(getSessionRiskTagEntries(null)).toEqual([])
    expect(
      getSessionRiskTagEntries({
        critical: 2,
        high: 0,
        warning: 0,
        low: 1,
        info: 0,
        other: 0,
        total: 3,
      }),
    ).toEqual([
      { field: 'serious', value: 2 },
      { field: 'low', value: 1 },
    ])
  })
})
