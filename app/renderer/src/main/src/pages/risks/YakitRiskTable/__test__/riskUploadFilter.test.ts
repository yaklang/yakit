import { describe, expect, it } from 'vitest'
import { defQueryRisksRequest } from '../constants'
import { buildRiskUploadFilter } from '../riskTableUtils'

describe('risk upload scope', () => {
  it('keeps business filters and existing ID restrictions without the 20-row page or cursor', () => {
    const query = {
      ...defQueryRisksRequest,
      Search: 'SQL',
      Tags: 'open|verified',
      IsRead: 'false',
      RuntimeIds: ['scan-1'],
      Ids: ['9007199254740993', 7],
      AfterCreatedAt: 100,
      BeforeCreatedAt: 200,
      FromId: 5,
      UntilId: 99,
    }
    const filter = buildRiskUploadFilter(query, 120)
    expect(filter).toMatchObject({
      Search: 'SQL',
      Tags: 'open|verified',
      IsRead: 'false',
      RuntimeIds: ['scan-1'],
      Ids: ['9007199254740993', 7],
      AfterCreatedAt: 100,
      BeforeCreatedAt: 200,
    })
    expect(filter.Pagination).toEqual({ Page: 1, Limit: 120, OrderBy: 'id', Order: 'asc' })
    for (const key of ['FromId', 'UntilId', 'RiskTypeList', 'TagList', 'CreatedAt']) {
      expect(filter).not.toHaveProperty(key)
    }
    expect(query.Pagination.Limit).toBe(20)
    expect(query.FromId).toBe(5)
  })

  it('uploads only explicit IDs, preserving int64 precision and ignoring unrelated current filters', () => {
    expect(buildRiskUploadFilter({ ...defQueryRisksRequest, Search: 'other risk' }, 120, ['9007199254740993'])).toEqual(
      {
        Ids: ['9007199254740993'],
        Pagination: { Page: 1, Limit: 1, OrderBy: 'id', Order: 'asc' },
      },
    )
  })

  it('rejects an empty explicit selection instead of uploading all risks', () => {
    expect(() => buildRiskUploadFilter(defQueryRisksRequest, 120, [])).toThrow('empty risk selection')
    expect(() => buildRiskUploadFilter(defQueryRisksRequest, 0)).toThrow('empty risk selection')
  })

  it('covers an explicit selection larger than the default page', () => {
    const ids = Array.from({ length: 50 }, (_, i) => i + 1)
    expect(buildRiskUploadFilter(defQueryRisksRequest, 120, ids)).toEqual({
      Ids: ids,
      Pagination: { Page: 1, Limit: 50, OrderBy: 'id', Order: 'asc' },
    })
  })
})
