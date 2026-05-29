import { describe, expect, it } from 'vitest'
import type { MitmExtractedAggregateRowNormalized } from '@/utils/yakQueryHTTPFlow'
import {
  buildCheckedFilterRows,
  buildNextCheckedRuleRows,
  buildRuleDataFilterQuery,
  buildRuleNameOptions,
  buildRuleNameTagOptions,
  buildRuleScopeFilter,
  buildRuleSummaryList,
  buildScopeFilterFromRows,
  getRuleDataColumnWidth,
  hasHTTPFlowFilterCriteria,
  mergeRuleSummaryItems,
  toggleCheckedRuleRow,
  uniqStrings,
} from '@/components/HTTPFlowTable/HTTPFlowTable.utils'

describe('uniqStrings', () => {
  it('returns an empty array for an empty input', () => {
    expect(uniqStrings([])).toEqual([])
  })

  it('filters out empty strings', () => {
    expect(uniqStrings(['', 'a', '', 'b'])).toEqual(['a', 'b'])
  })

  it('deduplicates repeated values while preserving insertion order', () => {
    expect(uniqStrings(['x', 'y', 'x', 'z', 'y'])).toEqual(['x', 'y', 'z'])
  })

  it('returns the same single item when the array has no duplicates or empty strings', () => {
    expect(uniqStrings(['abc'])).toEqual(['abc'])
  })
})

describe('hasHTTPFlowFilterCriteria', () => {
  it('returns false for undefined', () => {
    expect(hasHTTPFlowFilterCriteria(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(hasHTTPFlowFilterCriteria({})).toBe(false)
  })

  it('returns false when only ignored keys are set (SourceType / Full / WithPayload)', () => {
    expect(hasHTTPFlowFilterCriteria({ SourceType: 'mitm', Full: true, WithPayload: true })).toBe(false)
  })

  it('returns false when values are empty string, null-like, or empty array', () => {
    expect(
      hasHTTPFlowFilterCriteria({
        SearchURL: '',
        Methods: undefined,
        Tags: [],
        HaveBody: false,
      } as any),
    ).toBe(false)
  })

  it('returns true when SearchURL is set', () => {
    expect(hasHTTPFlowFilterCriteria({ SearchURL: 'example.com' })).toBe(true)
  })

  it('returns true when HostnameFilter has entries', () => {
    expect(hasHTTPFlowFilterCriteria({ HostnameFilter: ['example.com'] })).toBe(true)
  })

  it('returns true when a boolean flag like HaveBody is true', () => {
    expect(hasHTTPFlowFilterCriteria({ HaveBody: true })).toBe(true)
  })

  it('returns true when StatusCode is non-empty', () => {
    expect(hasHTTPFlowFilterCriteria({ StatusCode: '200' })).toBe(true)
  })

  it('ignores SourceType but still detects another active criterion', () => {
    expect(hasHTTPFlowFilterCriteria({ SourceType: 'mitm', Keyword: 'login' })).toBe(true)
  })
})

describe('buildRuleDataFilterQuery', () => {
  it('merges the base query with the parsed query and strips table-only fields', () => {
    expect(
      buildRuleDataFilterQuery(
        {
          SourceType: 'mitm',
          Pagination: { Page: 1 },
          SearchURL: 'base',
        } as any,
        {
          SearchURL: 'next',
          AfterId: 10,
          BeforeId: 20,
          AnalyzedIds: [1, 2],
        } as any,
      ),
    ).toEqual({
      SourceType: 'mitm',
      SearchURL: 'next',
    })
  })

  it('returns an empty object when both params are undefined', () => {
    expect(buildRuleDataFilterQuery(undefined, undefined)).toEqual({})
  })
})

function makeRow(
  ruleName: string,
  displayData: string,
  hitCount: number,
  sampleTraceIds?: string[],
): MitmExtractedAggregateRowNormalized {
  return {
    RuleVerbose: ruleName,
    DisplayData: displayData,
    HitCount: hitCount,
    LatestUpdatedAt: 0,
    SampleTraceIds: sampleTraceIds,
  }
}

describe('buildRuleSummaryList', () => {
  it('returns an empty array for empty input', () => {
    expect(buildRuleSummaryList([])).toEqual([])
  })

  it('skips rows where RuleVerbose is empty', () => {
    const result = buildRuleSummaryList([makeRow('', 'data', 5)])
    expect(result).toHaveLength(0)
  })

  it('maps a single row correctly', () => {
    const result = buildRuleSummaryList([makeRow('rule-A', 'value-1', 3, ['t1', 't2'])])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      RuleName: 'rule-A',
      SampleData: 'value-1',
      TraceCount: 3,
      SampleTraceIds: ['t1', 't2'],
    })
  })

  it('generates RowKey as "RuleName\\0SampleData"', () => {
    const result = buildRuleSummaryList([makeRow('rule-A', 'value-1', 1)])
    expect(result[0].RowKey).toBe('rule-A\0value-1')
  })

  it('merges rows with the same (RuleVerbose, DisplayData): sums TraceCount', () => {
    const rows = [makeRow('rule-A', 'value-1', 3), makeRow('rule-A', 'value-1', 7)]
    const result = buildRuleSummaryList(rows)
    expect(result).toHaveLength(1)
    expect(result[0].TraceCount).toBe(10)
  })

  it('merges rows and deduplicates SampleTraceIds', () => {
    const rows = [makeRow('rule-A', 'value-1', 2, ['t1', 't2']), makeRow('rule-A', 'value-1', 1, ['t2', 't3'])]
    const result = buildRuleSummaryList(rows)
    expect(result[0].SampleTraceIds).toEqual(['t1', 't2', 't3'])
  })

  it('keeps rows with different RuleVerbose as separate items', () => {
    const rows = [makeRow('rule-A', 'value-1', 1), makeRow('rule-B', 'value-1', 2)]
    const result = buildRuleSummaryList(rows)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.RuleName).sort()).toEqual(['rule-A', 'rule-B'])
  })

  it('keeps rows with same RuleVerbose but different DisplayData as separate items', () => {
    const rows = [makeRow('rule-A', 'value-1', 1), makeRow('rule-A', 'value-2', 2)]
    const result = buildRuleSummaryList(rows)
    expect(result).toHaveLength(2)
  })

  it('handles rows with no SampleTraceIds gracefully', () => {
    const result = buildRuleSummaryList([makeRow('rule-A', 'val', 4, undefined)])
    expect(result[0].SampleTraceIds).toEqual([])
  })

  it('accumulates hit counts from more than two duplicate rows', () => {
    const rows = [makeRow('rule-X', 'data', 1), makeRow('rule-X', 'data', 2), makeRow('rule-X', 'data', 3)]
    const result = buildRuleSummaryList(rows)
    expect(result[0].TraceCount).toBe(6)
  })
})

describe('buildScopeFilterFromRows', () => {
  it('returns empty arrays and undefined keyword for empty rows', () => {
    expect(buildScopeFilterFromRows([])).toEqual({
      TraceID: [],
      RuleVerbose: [],
      Keyword: undefined,
    })
  })

  it('collects all trace IDs from every row', () => {
    const rows = buildRuleSummaryList([makeRow('rule-A', 'v1', 1, ['t1', 't2']), makeRow('rule-B', 'v2', 1, ['t3'])])
    const filter = buildScopeFilterFromRows(rows)
    expect(filter.TraceID.sort()).toEqual(['t1', 't2', 't3'])
  })

  it('deduplicates trace IDs that appear in multiple rows', () => {
    const rows = buildRuleSummaryList([
      makeRow('rule-A', 'v1', 1, ['t1', 't2']),
      makeRow('rule-B', 'v2', 1, ['t2', 't3']),
    ])
    const filter = buildScopeFilterFromRows(rows)
    expect(filter.TraceID.sort()).toEqual(['t1', 't2', 't3'])
  })

  it('collects RuleVerbose from every row without duplicates', () => {
    const rows = buildRuleSummaryList([
      makeRow('rule-A', 'v1', 1),
      makeRow('rule-A', 'v2', 1),
      makeRow('rule-B', 'v1', 1),
    ])
    const filter = buildScopeFilterFromRows(rows)
    expect(filter.RuleVerbose.sort()).toEqual(['rule-A', 'rule-B'])
  })

  it('sets Keyword when provided', () => {
    const rows = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])
    expect(buildScopeFilterFromRows(rows, 'login').Keyword).toBe('login')
  })

  it('leaves Keyword as undefined when not provided', () => {
    const rows = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])
    expect(buildScopeFilterFromRows(rows).Keyword).toBeUndefined()
  })

  it('leaves Keyword as undefined for an empty string keyword', () => {
    const rows = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])
    expect(buildScopeFilterFromRows(rows, '').Keyword).toBeUndefined()
  })
})

describe('buildRuleNameOptions', () => {
  it('deduplicates rule names across options, rows, and filters', () => {
    const rows = buildRuleSummaryList([makeRow('rule-A', 'v1', 1), makeRow('rule-B', 'v2', 1)])
    expect(buildRuleNameOptions(['rule-A', 'rule-C'], rows, ['rule-B', 'rule-D'])).toEqual([
      'rule-A',
      'rule-C',
      'rule-B',
      'rule-D',
    ])
  })
})

describe('buildRuleNameTagOptions', () => {
  it('maps deduplicated rule names into filter tag options', () => {
    const rows = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])
    expect(buildRuleNameTagOptions(['rule-A'], rows, ['rule-B'])).toEqual([
      { label: 'rule-A', value: 'rule-A' },
      { label: 'rule-B', value: 'rule-B' },
    ])
  })
})

describe('mergeRuleSummaryItems', () => {
  it('keeps unique rows and replaces duplicates by RowKey', () => {
    const prev = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])
    const next = buildRuleSummaryList([makeRow('rule-A', 'v1', 3), makeRow('rule-B', 'v2', 1)])
    const merged = mergeRuleSummaryItems(prev, next)

    expect(merged).toHaveLength(2)
    expect(merged.find((item) => item.RuleName === 'rule-A')?.TraceCount).toBe(3)
  })

  it('preserves prev-only items that are absent from next', () => {
    const prev = buildRuleSummaryList([makeRow('rule-A', 'v1', 1), makeRow('rule-C', 'v3', 5)])
    const next = buildRuleSummaryList([makeRow('rule-A', 'v1', 9)])
    const merged = mergeRuleSummaryItems(prev, next)

    expect(merged).toHaveLength(2)
    expect(merged.find((item) => item.RuleName === 'rule-C')?.TraceCount).toBe(5)
  })
})

describe('buildNextCheckedRuleRows', () => {
  it('adds a row only once when checked', () => {
    const row = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])[0]
    const once = buildNextCheckedRuleRows([], row, true)
    const twice = buildNextCheckedRuleRows(once, row, true)

    expect(once).toHaveLength(1)
    expect(twice).toHaveLength(1)
  })

  it('removes the row when unchecked', () => {
    const row = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])[0]
    expect(buildNextCheckedRuleRows([row], row, false)).toEqual([])
  })
})

describe('toggleCheckedRuleRow', () => {
  it('toggles the presence of a row in the checked list', () => {
    const row = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])[0]
    const checked = toggleCheckedRuleRow([], row)
    const unchecked = toggleCheckedRuleRow(checked, row)

    expect(checked).toEqual([row])
    expect(unchecked).toEqual([])
  })
})

describe('buildRuleScopeFilter', () => {
  it('uses checked rows when they exist', () => {
    const rows = buildRuleSummaryList([makeRow('rule-A', 'v1', 1, ['t1'])])
    expect(buildRuleScopeFilter(rows, ['ignored'], 'keyword')).toEqual({
      TraceID: ['t1'],
      RuleVerbose: ['rule-A'],
      Keyword: 'keyword',
    })
  })

  it('falls back to the current filters when there are no checked rows', () => {
    expect(buildRuleScopeFilter([], ['rule-A'], 'keyword')).toEqual({
      RuleVerbose: ['rule-A'],
      Keyword: 'keyword',
    })
  })

  it('returns an empty object when everything is empty', () => {
    expect(buildRuleScopeFilter([], [], undefined)).toEqual({})
  })
})

describe('getRuleDataColumnWidth', () => {
  it('returns the remaining width when there is space left', () => {
    expect(getRuleDataColumnWidth(500, 200)).toBe(300)
  })

  it('returns undefined when there is no positive space left', () => {
    expect(getRuleDataColumnWidth(100, 200)).toBeUndefined()
  })

  it('returns undefined when tableWrapWidth is 0', () => {
    expect(getRuleDataColumnWidth(0, 200)).toBeUndefined()
  })
})

describe('buildCheckedFilterRows', () => {
  it('converts checked rows into MitmExtractAggregateFlowFilterRow items', () => {
    const rows = buildRuleSummaryList([makeRow('rule-A', 'v1', 1)])
    expect(buildCheckedFilterRows(rows)).toEqual([{ RuleVerbose: 'rule-A', DisplayData: 'v1' }])
  })
})
