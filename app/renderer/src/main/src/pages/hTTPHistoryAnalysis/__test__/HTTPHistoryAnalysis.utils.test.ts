import { describe, expect, it } from 'vitest'
import { defaultHTTPHistoryAnalysisPageInfo, footerTabs } from '@/defaultConstants/hTTPHistoryAnalysis'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import type { PageNodeItemProps } from '@/store/pageInfo'
import {
  buildHTTPHistoryAnalysisResizeBoxProps,
  buildHTTPFlowRuleDetailMiniProps,
  filterHTTPFlowRuleTableData,
  getSafeHTTPRequest,
  hasHTTPFlowRuleTableFilter,
  type HTTPFlowRuleData,
  type QueryAnalyzedHTTPFlowRuleFilter,
  isFilterSectionActive,
  resolveHTTPHistoryAnalysisPageInfo,
  safeParse,
  shouldUpdateHTTPFlowRuleSelection,
  toHTTPFlowIds,
} from '@/pages/hTTPHistoryAnalysis/HTTPHistoryAnalysis.utils'

const makeHTTPFlowRuleRow = (overrides: Partial<HTTPFlowRuleData> = {}): HTTPFlowRuleData => ({
  Id: 1,
  HTTPFlowId: 101,
  Method: 'GET',
  StatusCode: '200',
  Url: 'https://example.com/login',
  IPAddress: '127.0.0.1',
  RuleVerboseName: 'Sensitive Token',
  Rule: 'token',
  ExtractedContent: 'Bearer abc',
  ...overrides,
})

const createHTTPFlowRuleQuery = (
  overrides: Partial<QueryAnalyzedHTTPFlowRuleFilter> = {},
): QueryAnalyzedHTTPFlowRuleFilter => ({
  Methods: [],
  SearchURL: '',
  StatusCode: '',
  RuleVerboseName: '',
  ExtractedContent: '',
  ...overrides,
})

describe('getSafeHTTPRequest', () => {
  it('returns RequestString when InvalidForUTF8Request is false', () => {
    expect(getSafeHTTPRequest({ InvalidForUTF8Request: false, RequestString: 'GET / HTTP/1.1' })).toBe('GET / HTTP/1.1')
  })

  it('returns RequestString when InvalidForUTF8Request is undefined', () => {
    expect(getSafeHTTPRequest({ RequestString: 'POST /api HTTP/1.1' })).toBe('POST /api HTTP/1.1')
  })

  it('returns SafeHTTPRequest when InvalidForUTF8Request is true', () => {
    expect(
      getSafeHTTPRequest({
        InvalidForUTF8Request: true,
        SafeHTTPRequest: 'GET /safe HTTP/1.1',
        RequestString: 'corrupted',
      }),
    ).toBe('GET /safe HTTP/1.1')
  })

  it('returns empty string when InvalidForUTF8Request is true but SafeHTTPRequest is undefined', () => {
    expect(getSafeHTTPRequest({ InvalidForUTF8Request: true })).toBe('')
  })

  it('returns empty string when both fields are absent', () => {
    expect(getSafeHTTPRequest({})).toBe('')
  })

  it('returns empty string when the selected field is an empty string', () => {
    expect(getSafeHTTPRequest({ InvalidForUTF8Request: false, RequestString: '' })).toBe('')
  })
})

describe('safeParse', () => {
  it('returns undefined for undefined input', () => {
    expect(safeParse(undefined)).toBeUndefined()
  })

  it('returns undefined for an empty string', () => {
    expect(safeParse('')).toBeUndefined()
  })

  it('parses a valid JSON object', () => {
    expect(safeParse('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses a valid JSON array', () => {
    expect(safeParse('["x","y"]')).toEqual(['x', 'y'])
  })

  it('parses a JSON primitive (number)', () => {
    expect(safeParse('42')).toBe(42)
  })

  it('returns undefined for malformed JSON', () => {
    expect(safeParse('{bad json')).toBeUndefined()
  })

  it('returns undefined for a plain non-JSON string', () => {
    expect(safeParse('hello')).toBeUndefined()
  })
})

describe('isFilterSectionActive', () => {
  it('returns false for an empty object', () => {
    expect(isFilterSectionActive({})).toBe(false)
  })

  it('returns false when all arrays are empty and strings are empty', () => {
    expect(
      isFilterSectionActive({
        hostName: [],
        urlPath: [],
        fileSuffix: [],
        searchContentType: [],
        excludeKeywords: [],
        statusCode: '',
      }),
    ).toBe(false)
  })

  it('returns true when at least one array has entries', () => {
    expect(
      isFilterSectionActive({
        hostName: ['example.com'],
        urlPath: [],
        fileSuffix: [],
        searchContentType: [],
      }),
    ).toBe(true)
  })

  it('returns true when at least one string is non-empty', () => {
    expect(
      isFilterSectionActive({
        hostName: [],
        statusCode: '200',
      }),
    ).toBe(true)
  })

  it('returns true when multiple fields are active', () => {
    expect(
      isFilterSectionActive({
        hostName: ['example.com'],
        fileSuffix: ['.js'],
        statusCode: '404',
      }),
    ).toBe(true)
  })
})

describe('resolveHTTPHistoryAnalysisPageInfo', () => {
  it('merges params onto the default page info', () => {
    expect(
      resolveHTTPHistoryAnalysisPageInfo({
        webFuzzer: true,
        pageId: 'page-1',
      }),
    ).toEqual({
      ...defaultHTTPHistoryAnalysisPageInfo,
      webFuzzer: true,
      pageId: 'page-1',
    })
  })

  it('returns cached page params when the page node contains history analysis data', () => {
    const currentItem = {
      id: '1',
      routeKey: 'route',
      pageGroupId: 'group',
      pageId: 'page-2',
      pageName: 'name',
      sortFieId: 1,
      pageParamsInfo: {
        hTTPHistoryAnalysisPageInfo: {
          webFuzzer: true,
          runtimeId: ['runtime-1'],
          sourceType: 'webfuzzer',
          pageId: 'cached-page',
        },
      },
    } as PageNodeItemProps

    expect(resolveHTTPHistoryAnalysisPageInfo(undefined, currentItem)).toEqual({
      webFuzzer: true,
      runtimeId: ['runtime-1'],
      sourceType: 'webfuzzer',
      pageId: 'cached-page',
    })
  })

  it('falls back to the default page info when no params are available', () => {
    expect(resolveHTTPHistoryAnalysisPageInfo()).toEqual(defaultHTTPHistoryAnalysisPageInfo)
  })
})

describe('toHTTPFlowIds', () => {
  it('converts selected string ids into numbers', () => {
    expect(toHTTPFlowIds(['1', '2', '30'])).toEqual([1, 2, 30])
  })

  it('returns an empty array when ids are missing', () => {
    expect(toHTTPFlowIds()).toEqual([])
  })
})

describe('buildHTTPHistoryAnalysisResizeBoxProps', () => {
  it('keeps the saved ratio when the bottom area is open', () => {
    expect(buildHTTPHistoryAnalysisResizeBoxProps({ firstRatio: '45%', secondRatio: '55%' }, true)).toEqual({
      firstRatio: '45%',
      secondRatio: '55%',
      style: {
        height: 'calc(100% - 24px)',
      },
      secondNodeStyle: {
        padding: 0,
        display: 'block',
        minHeight: '400px',
      },
      lineStyle: { display: '' },
    })
  })

  it('collapses the bottom area when the tab panel is closed', () => {
    expect(buildHTTPHistoryAnalysisResizeBoxProps({ firstRatio: '45%', secondRatio: '55%' }, false)).toEqual({
      firstRatio: '100%',
      secondRatio: '0%',
      style: {
        height: 'calc(100% - 24px)',
      },
      secondNodeStyle: {
        padding: 0,
        display: 'none',
        minHeight: '0',
      },
      lineStyle: { display: '' },
    })
  })
})

describe('buildHTTPFlowRuleDetailMiniProps', () => {
  it('builds the HTTPFlowDetailMini props from a rule row', () => {
    expect(buildHTTPFlowRuleDetailMiniProps(makeHTTPFlowRuleRow())).toEqual({
      noHeader: true,
      id: 101,
      analyzedIds: [1],
      sendToWebFuzzer: true,
      scrollID: 1,
      showEditTag: false,
      showJumpTree: false,
    })
  })

  it('falls back safely when no row is provided', () => {
    expect(buildHTTPFlowRuleDetailMiniProps()).toEqual({
      noHeader: true,
      id: 0,
      analyzedIds: undefined,
      sendToWebFuzzer: true,
      scrollID: undefined,
      showEditTag: false,
      showJumpTree: false,
    })
  })
})

describe('hasHTTPFlowRuleTableFilter', () => {
  it('returns false for an empty query', () => {
    expect(hasHTTPFlowRuleTableFilter(createHTTPFlowRuleQuery())).toBe(false)
  })

  it('returns true when any query field is active', () => {
    expect(hasHTTPFlowRuleTableFilter(createHTTPFlowRuleQuery({ RuleVerboseName: 'token' }))).toBe(true)
  })
})

describe('filterHTTPFlowRuleTableData', () => {
  const rows = [
    makeHTTPFlowRuleRow(),
    makeHTTPFlowRuleRow({
      Id: 2,
      HTTPFlowId: 102,
      Method: 'POST',
      StatusCode: '404',
      Url: 'https://example.com/api',
      RuleVerboseName: 'Account Leak',
      ExtractedContent: 'user@example.com',
    }),
  ]

  it('returns a shallow copy when no filter is active', () => {
    const result = filterHTTPFlowRuleTableData(rows, createHTTPFlowRuleQuery(), [])

    expect(result).toEqual(rows)
    expect(result).not.toBe(rows)
  })

  it('filters rows by method and parsed status code list', () => {
    expect(
      filterHTTPFlowRuleTableData(
        rows,
        createHTTPFlowRuleQuery({
          Methods: ['POST'],
          StatusCode: '404',
        }),
        [404],
      ),
    ).toEqual([rows[1]])
  })

  it('filters rows by url and case-insensitive text fields', () => {
    expect(
      filterHTTPFlowRuleTableData(
        rows,
        createHTTPFlowRuleQuery({
          SearchURL: '/login',
          RuleVerboseName: 'sensitive',
          ExtractedContent: 'bearer',
        }),
        [],
      ),
    ).toEqual([rows[0]])
  })
})

describe('shouldUpdateHTTPFlowRuleSelection', () => {
  it('returns false when selecting the same row again', () => {
    const currentRow = makeHTTPFlowRuleRow()

    expect(shouldUpdateHTTPFlowRuleSelection(currentRow, makeHTTPFlowRuleRow())).toBe(false)
  })

  it('returns true when clearing or switching the selected row', () => {
    const currentRow = makeHTTPFlowRuleRow()

    expect(shouldUpdateHTTPFlowRuleSelection(currentRow, undefined)).toBe(true)
    expect(shouldUpdateHTTPFlowRuleSelection(currentRow, makeHTTPFlowRuleRow({ Id: 2 }))).toBe(true)
  })
})

describe('footerTabs', () => {
  const t: TFunction = (keys) => (Array.isArray(keys) ? keys[0] : keys)
  const tabs = footerTabs(t)

  it('contains the expected tab keys in order', () => {
    expect(tabs.map((item) => item.key)).toEqual(['packet', 'rule', 'hot-patch'])
  })

  it('each tab has a non-empty string label', () => {
    const labels = tabs.map((item) => item.label)
    expect(labels.every((l) => typeof l === 'string' && (l as string).length > 0)).toBe(true)
  })
})

describe('defaultHTTPHistoryAnalysisPageInfo', () => {
  it('has the expected default values', () => {
    expect(defaultHTTPHistoryAnalysisPageInfo).toMatchObject({
      webFuzzer: false,
      sourceType: 'mitm',
      runtimeId: [],
      pageId: '',
    })
  })
})
