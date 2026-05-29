import { describe, expect, it } from 'vitest'
import type { HTTPFlow } from '@/components/HTTPFlowTable/HTTPFlowTable'
import type { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import {
  buildHistoryFilterLinkedQueries,
  buildHistoryFilterSideResizeBoxProps,
  buildHTTPFlowPacketWindowData,
  buildHTTPFlowQueryRequestParams,
  buildHTTPHistoryFilterQueryFromConfig,
  buildLegacyHTTPHistoryFilterConfig,
  getHTTPFlowExportPageSize,
  mergeHTTPFlowsById,
} from '@/pages/hTTPHistoryAnalysis/HTTPHistory/HTTPHistoryFilter.utils'

const defaultFilterConfig: Parameters<typeof buildLegacyHTTPHistoryFilterConfig>[0] = {
  filterMode: 'shield',
  shield: {
    hostName: [],
    urlPath: [],
    fileSuffix: [],
    searchContentType: [],
    excludeKeywords: [],
    statusCode: '',
  },
  show: {
    hostName: [],
    urlPath: [],
    fileSuffix: [],
    searchContentType: [],
  },
}

const makeHTTPFlow = (overrides: Partial<HTTPFlow> = {}): HTTPFlow =>
  ({
    Id: 1,
    Url: 'https://example.com',
    Tags: '',
    Request: new Uint8Array(),
    Response: new Uint8Array(),
    Method: 'GET',
    StatusCode: 200,
    IsHTTPS: true,
    IsWebsocket: false,
    Hash: 'hash-1',
    RequestString: '',
    ResponseString: '',
    Path: '/',
    BodyLength: 0,
    ContentType: '',
    SourceType: 'mitm',
    RequestHeader: [],
    ResponseHeader: [],
    GetParamsTotal: 0,
    PostParamsTotal: 0,
    CookieParamsTotal: 0,
    CreatedAt: 0,
    UpdatedAt: 0,
    GetParams: [],
    PostParams: [],
    CookieParams: [],
    IsTooLargeResponse: false,
    TooLargeResponseHeaderFile: '',
    TooLargeResponseBodyFile: '',
    DisableRenderStyles: false,
    FromPlugin: '',
    ...overrides,
  }) as HTTPFlow

describe('buildHistoryFilterSideResizeBoxProps', () => {
  it('uses the rules width when the rules tab is open', () => {
    expect(buildHistoryFilterSideResizeBoxProps('rules', true)).toEqual({
      firstRatio: '470px',
      secondRatio: '80%',
    })
  })

  it('collapses to the compact width when the tabs are hidden', () => {
    expect(buildHistoryFilterSideResizeBoxProps('web-tree', false)).toEqual({
      firstRatio: '24px',
      secondRatio: '80%',
    })
  })
})

describe('buildHistoryFilterLinkedQueries', () => {
  it('splits a valid query string into the tree, process, and rules views', () => {
    const queryParams = JSON.stringify({
      IncludeInUrl: ['example.com'],
      ProcessName: ['chrome'],
      Tags: ['tag-1'],
      SearchURL: 'test',
    })

    expect(buildHistoryFilterLinkedQueries(queryParams)).toEqual({
      treeQueryparams: JSON.stringify({ ProcessName: ['chrome'], Tags: ['tag-1'], SearchURL: 'test' }),
      processQueryparams: JSON.stringify({ IncludeInUrl: ['example.com'], SearchURL: 'test' }),
      rulesQueryparams: queryParams,
    })
  })

  it('returns undefined for invalid query strings', () => {
    expect(buildHistoryFilterLinkedQueries('{bad json')).toBeUndefined()
  })
})

describe('buildLegacyHTTPHistoryFilterConfig', () => {
  it('builds a shield config from legacy cache values', () => {
    expect(
      buildLegacyHTTPHistoryFilterConfig(defaultFilterConfig, {
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
      buildLegacyHTTPHistoryFilterConfig(defaultFilterConfig, {
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

describe('buildHTTPHistoryFilterQueryFromConfig', () => {
  it('maps the advanced filter config into the HTTP flow query fields', () => {
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

    expect(buildHTTPHistoryFilterQueryFromConfig(filterConfig)).toEqual({
      SearchContentType: 'json',
      ExcludeContentType: ['html'],
      HostnameFilter: ['show-host'],
      ExcludeInUrl: ['shield-host'],
      IncludePath: ['/api'],
      ExcludePath: [],
      IncludeSuffix: ['js'],
      ExcludeSuffix: [],
      ExcludeKeywords: ['token'],
      ExcludeStatusCode: '500',
    })
  })
})

describe('buildHTTPFlowPacketWindowData', () => {
  it('builds the packet window payload from the selected flow', () => {
    const selectedFlow = makeHTTPFlow({ Id: 5, Url: 'https://example.com/login' })

    expect(buildHTTPFlowPacketWindowData(selectedFlow)).toEqual({
      showParentPacketCom: {
        components: 'HTTPFlowDetailMini',
        props: {
          noHeader: true,
          id: 5,
          sendToWebFuzzer: true,
          selectedFlow,
          showEditTag: false,
          showJumpTree: false,
        },
      },
    })
  })
})

describe('mergeHTTPFlowsById', () => {
  it('appends only the rows whose ids do not already exist', () => {
    const prev = [makeHTTPFlow({ Id: 1, Hash: 'hash-1' }), makeHTTPFlow({ Id: 2, Hash: 'hash-2' })]
    const next = [makeHTTPFlow({ Id: 2, Hash: 'hash-2' }), makeHTTPFlow({ Id: 3, Hash: 'hash-3' })]

    expect(mergeHTTPFlowsById(prev, next).map((item) => item.Id)).toEqual([1, 2, 3])
  })
})

describe('buildHTTPFlowQueryRequestParams', () => {
  it('builds the query request and strips UI-only fields for tab sync', () => {
    const query = {
      Methods: ['GET', 'POST'],
      SearchURL: 'example.com',
      ContentType: ['json'],
      bodyLength: true,
      UpdatedAt: 1234567890,
      'UpdatedAt-time': '2026-01-01',
      SourceType: 'mitm',
    } as unknown as YakQueryHTTPFlowRequest

    const { requestParams, tabQueryParams } = buildHTTPFlowQueryRequestParams(
      query,
      { Page: 1, Limit: 30, Order: 'desc', OrderBy: 'Id' },
      2,
      { order: 'asc', orderBy: 'Id' },
      88,
    )

    expect(requestParams).toMatchObject({
      Methods: 'GET,POST',
      OffsetId: 88,
      SearchURL: 'example.com',
      Pagination: {
        Page: 2,
        Limit: 30,
        Order: 'asc',
        OrderBy: 'Id',
      },
    })
    expect(requestParams).not.toHaveProperty('ContentType')
    expect(requestParams).not.toHaveProperty('bodyLength')
    expect(requestParams).not.toHaveProperty('UpdatedAt')
    expect(requestParams).not.toHaveProperty('UpdatedAt-time')
    expect(JSON.parse(tabQueryParams)).toEqual({
      Methods: 'GET,POST',
      SearchURL: 'example.com',
      SourceType: 'mitm',
    })
  })
})

describe('getHTTPFlowExportPageSize', () => {
  it('uses the small page size for small exports', () => {
    expect(getHTTPFlowExportPageSize(999)).toBe(100)
  })

  it('uses the capped page size for very large exports', () => {
    expect(getHTTPFlowExportPageSize(5001)).toBe(500)
  })

  it('rounds medium exports to the nearest hundred block', () => {
    expect(getHTTPFlowExportPageSize(3200)).toBe(300)
  })
})
