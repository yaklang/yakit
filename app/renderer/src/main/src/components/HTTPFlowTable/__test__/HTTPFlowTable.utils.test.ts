import { describe, expect, it } from 'vitest'
import {
  buildHTTPFlowTableAdvancedQuery,
  buildLegacyHTTPFlowTableFilterConfig,
  buildRuleSummaryList,
  hasActiveHTTPFlowTableFilterConfig,
  mergeRuleSummaryItems,
  safeParseHTTPFlowTableCache,
  splitHTTPFlowTableShieldData,
  uniqStrings,
} from '@/components/HTTPFlowTable/HTTPFlowTable.utils'

const defaultFilterConfig: Parameters<typeof hasActiveHTTPFlowTableFilterConfig>[0] = {
  filterMode: 'shield',
  shield: {
    hostName: [] as string[],
    urlPath: [] as string[],
    fileSuffix: [] as string[],
    searchContentType: [] as string[],
    excludeKeywords: [] as string[],
    statusCode: '',
  },
  show: {
    hostName: [] as string[],
    urlPath: [] as string[],
    fileSuffix: [] as string[],
    searchContentType: [] as string[],
  },
}

describe('safeParseHTTPFlowTableCache', () => {
  it('parses valid json values', () => {
    expect(safeParseHTTPFlowTableCache('{"a":1}')).toEqual({ a: 1 })
  })

  it('returns undefined for invalid json values', () => {
    expect(safeParseHTTPFlowTableCache('{bad json')).toBeUndefined()
  })
})

describe('buildLegacyHTTPFlowTableFilterConfig', () => {
  it('builds a shield config from legacy cache values', () => {
    expect(
      buildLegacyHTTPFlowTableFilterConfig(defaultFilterConfig, {
        filterMode: 'shield',
        hostName: '["example.com"]',
        urlPath: '["/api"]',
        fileSuffix: '["js"]',
        searchContentType: 'html,json',
        excludeKeywords: '["token"]',
        statusCode: '404',
      }),
    ).toEqual({
      filterMode: 'shield',
      shield: {
        hostName: ['example.com'],
        urlPath: ['/api'],
        fileSuffix: ['js'],
        searchContentType: ['html', 'json'],
        excludeKeywords: ['token'],
        statusCode: '404',
      },
      show: defaultFilterConfig.show,
    })
  })

  it('builds a show config from legacy cache values', () => {
    expect(
      buildLegacyHTTPFlowTableFilterConfig(defaultFilterConfig, {
        filterMode: 'show',
        hostName: '["example.com"]',
        urlPath: '["/api"]',
        fileSuffix: '["js"]',
        searchContentType: 'html,json',
      }),
    ).toEqual({
      filterMode: 'show',
      shield: defaultFilterConfig.shield,
      show: {
        hostName: ['example.com'],
        urlPath: ['/api'],
        fileSuffix: ['js'],
        searchContentType: ['html', 'json'],
      },
    })
  })
})

describe('buildHTTPFlowTableAdvancedQuery', () => {
  it('maps the filter config and merges shield hosts without duplicates', () => {
    const filterConfig = {
      ...defaultFilterConfig,
      shield: {
        ...defaultFilterConfig.shield,
        hostName: ['shield-host'],
        searchContentType: ['html'],
        excludeKeywords: ['token'],
        statusCode: '500',
      },
      show: {
        ...defaultFilterConfig.show,
        hostName: ['show-host'],
        urlPath: ['/api'],
        fileSuffix: ['js'],
        searchContentType: ['json'],
      },
    }

    expect(buildHTTPFlowTableAdvancedQuery(filterConfig, ['shield-host', 'other-host'])).toEqual({
      SearchContentType: 'json',
      ExcludeContentType: ['html'],
      HostnameFilter: ['show-host'],
      ExcludeInUrl: ['shield-host', 'other-host'],
      IncludePath: ['/api'],
      ExcludePath: [],
      IncludeSuffix: ['js'],
      ExcludeSuffix: [],
      ExcludeKeywords: ['token'],
      ExcludeStatusCode: '500',
    })
  })
})

describe('hasActiveHTTPFlowTableFilterConfig', () => {
  it('returns false for the default config', () => {
    expect(hasActiveHTTPFlowTableFilterConfig(defaultFilterConfig)).toBe(false)
  })

  it('returns true when any field becomes active', () => {
    expect(
      hasActiveHTTPFlowTableFilterConfig({
        ...defaultFilterConfig,
        show: {
          ...defaultFilterConfig.show,
          hostName: ['example.com'],
        },
      }),
    ).toBe(true)
  })
})

describe('splitHTTPFlowTableShieldData', () => {
  it('splits mixed shield items into ids and hosts', () => {
    expect(splitHTTPFlowTableShieldData(['example.com', 10, 'test.local', 20])).toEqual({
      shieldIds: [10, 20],
      shieldHosts: ['example.com', 'test.local'],
    })
  })

  it('returns empty groups for empty input', () => {
    expect(splitHTTPFlowTableShieldData([])).toEqual({
      shieldIds: [],
      shieldHosts: [],
    })
  })
})

describe('shared rule-data helpers remain exported from the unified utils file', () => {
  it('deduplicates strings', () => {
    expect(uniqStrings(['a', 'a', 'b'])).toEqual(['a', 'b'])
  })

  it('merges rule summary items by RowKey', () => {
    const prev = buildRuleSummaryList([
      {
        RuleVerbose: 'rule-A',
        DisplayData: 'v1',
        HitCount: 1,
        LatestUpdatedAt: 0,
        SampleTraceIds: ['t1'],
      },
    ])
    const next = buildRuleSummaryList([
      {
        RuleVerbose: 'rule-A',
        DisplayData: 'v1',
        HitCount: 3,
        LatestUpdatedAt: 0,
        SampleTraceIds: ['t2'],
      },
    ])

    expect(mergeRuleSummaryItems(prev, next)[0].TraceCount).toBe(3)
  })
})
