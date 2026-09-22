import { describe, expect, it } from 'vitest'
import {
  countNewRiskIds,
  dedupeRisksById,
  getDiscoveryTimeColumnFixed,
  isRiskTableInitPage,
  mergeRisksById,
  nextIncrementFromId,
  shouldSkipRiskCursorPage,
  toRiskNumericId,
} from '../riskTableUtils'

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

describe('risk table cursor merge', () => {
  it('coerces grpc string ids and treats page "1" as init', () => {
    expect(toRiskNumericId('12')).toBe(12)
    expect(toRiskNumericId(0)).toBe(0)
    expect(isRiskTableInitPage(1)).toBe(true)
    expect(isRiskTableInitPage('1')).toBe(true)
    expect(isRiskTableInitPage(2)).toBe(false)
  })

  it('skips load-more until desc UntilId / asc FromId is ready', () => {
    expect(shouldSkipRiskCursorPage(true, 'desc', 0, 0)).toBe(false)
    expect(shouldSkipRiskCursorPage(false, 'desc', 0, 0)).toBe(true)
    expect(shouldSkipRiskCursorPage(false, 'desc', 0, '5')).toBe(false)
    expect(shouldSkipRiskCursorPage(false, 'asc', 0, 0)).toBe(true)
    expect(shouldSkipRiskCursorPage(false, 'asc', '8', 0)).toBe(false)
  })

  it('drops overlapping ids when prepending newer desc rows', () => {
    const firstPage: Array<{ Id: string | number }> = [{ Id: '5' }, { Id: '4' }, { Id: '3' }, { Id: '2' }, { Id: '1' }]
    const overlappingLatest: Array<{ Id: string | number }> = [{ Id: 12 }, { Id: 11 }, { Id: 10 }, { Id: 5 }]
    expect(mergeRisksById(overlappingLatest, firstPage, 'prepend').map((row) => row.Id)).toEqual([
      12, 11, 10, 5, 4, 3, 2, 1,
    ])
    expect(countNewRiskIds(overlappingLatest, firstPage)).toBe(3)
  })

  it('appends an older desc page and drops the overlapping cursor id', () => {
    const loaded: Array<{ Id: string | number }> = [{ Id: 12 }, { Id: 11 }, { Id: 10 }, { Id: 5 }]
    const olderPage: Array<{ Id: string | number }> = [{ Id: '5' }, { Id: '4' }, { Id: '3' }, { Id: '2' }, { Id: '1' }]
    expect(mergeRisksById(olderPage, loaded, 'append').map((row) => row.Id)).toEqual([12, 11, 10, 5, 4, 3, 2, 1])
  })

  it('keeps first occurrence when the same id appears twice in one response', () => {
    expect(dedupeRisksById([{ Id: 5 }, { Id: '5' }, { Id: 4 }]).map((row) => row.Id)).toEqual([5, 4])
  })

  it('advances increment FromId to the newest id', () => {
    expect(nextIncrementFromId([{ Id: '12' }, { Id: 11 }], 5)).toBe(12)
    expect(nextIncrementFromId([], 5)).toBe(5)
  })
})
