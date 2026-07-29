import type { FilterConfig } from '@/components/HTTPFlowTable/HTTPFlowTableFormConfiguration/HTTPFlowTableFormConfiguration'
import type { HTTPFlow } from '@/components/HTTPFlowTable/HTTPFlowTable'
import type { HTTPFlowDetailProp } from '@/components/HTTPFlowDetail'
import type { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import { safeParse } from '../HTTPHistoryAnalysis.utils'

export interface HTTPHistoryFilterLinkedQueries {
  treeQueryparams: string
  processQueryparams: string
  rulesQueryparams: string
}

export interface HTTPHistoryFilterLegacyValues {
  filterMode?: string
  hostName?: unknown
  urlPath?: unknown
  fileSuffix?: unknown
  searchContentType?: string
  excludeKeywords?: unknown
  statusCode?: string
}

export interface HTTPHistoryFilterPagination {
  Page: number
  Limit: number
  Order: string
  OrderBy: string
}

export interface HTTPHistoryFilterSorter {
  order?: string
  orderBy?: string
}

const normalizeLegacyListValue = (value?: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`).filter(Boolean)
  }

  if (typeof value !== 'string') {
    return value === undefined || value === null || value === '' ? [] : [`${value}`]
  }

  const parsedValue = safeParse<unknown>(value)
  if (Array.isArray(parsedValue)) {
    return parsedValue.map((item) => `${item}`).filter(Boolean)
  }

  return parsedValue === undefined || parsedValue === null || parsedValue === '' ? [] : [`${parsedValue}`]
}

export const buildHistoryFilterSideResizeBoxProps = (activeKey: string, openTabsFlag: boolean) => {
  if (activeKey === 'rules' && openTabsFlag) {
    return {
      firstRatio: '470px',
      secondRatio: '80%',
    }
  }

  return {
    firstRatio: openTabsFlag ? '20%' : '24px',
    secondRatio: '80%',
  }
}

export const buildHistoryFilterLinkedQueries = (queryParams?: string): HTTPHistoryFilterLinkedQueries | undefined => {
  if (!queryParams) {
    const emptyQuery = '{}'
    return {
      treeQueryparams: emptyQuery,
      processQueryparams: emptyQuery,
      rulesQueryparams: emptyQuery,
    }
  }

  const parsedQuery = safeParse<Record<string, unknown>>(queryParams)
  if (!parsedQuery) {
    return undefined
  }

  const treeQuery = { ...parsedQuery }
  delete treeQuery.IncludeInUrl

  const processQuery = { ...parsedQuery }
  delete processQuery.ProcessName
  delete processQuery.Tags

  return {
    treeQueryparams: JSON.stringify(treeQuery),
    processQueryparams: JSON.stringify(processQuery),
    rulesQueryparams: queryParams,
  }
}

export const buildLegacyHTTPHistoryFilterConfig = (
  currentConfig: FilterConfig,
  legacyValues: HTTPHistoryFilterLegacyValues,
): FilterConfig => {
  const filterMode = legacyValues.filterMode === 'shield' ? 'shield' : 'show'

  if (filterMode === 'shield') {
    return {
      filterMode,
      shield: {
        hostName: normalizeLegacyListValue(legacyValues.hostName),
        urlPath: normalizeLegacyListValue(legacyValues.urlPath),
        fileSuffix: normalizeLegacyListValue(legacyValues.fileSuffix),
        searchContentType: legacyValues.searchContentType ? legacyValues.searchContentType.split(',') : [],
        excludeKeywords: normalizeLegacyListValue(legacyValues.excludeKeywords),
        statusCode: legacyValues.statusCode || '',
      },
      show: currentConfig.show,
    }
  }

  return {
    filterMode,
    shield: currentConfig.shield,
    show: {
      hostName: normalizeLegacyListValue(legacyValues.hostName),
      urlPath: normalizeLegacyListValue(legacyValues.urlPath),
      fileSuffix: normalizeLegacyListValue(legacyValues.fileSuffix),
      searchContentType: legacyValues.searchContentType ? legacyValues.searchContentType.split(',') : [],
    },
  }
}

export const buildHTTPHistoryFilterQueryFromConfig = (filterConfig: FilterConfig) => ({
  SearchContentType: filterConfig.show.searchContentType.join(','),
  ExcludeContentType: filterConfig.shield.searchContentType,
  HostnameFilter: filterConfig.show.hostName,
  ExcludeInUrl: filterConfig.shield.hostName,
  IncludePath: filterConfig.show.urlPath,
  ExcludePath: filterConfig.shield.urlPath,
  IncludeSuffix: filterConfig.show.fileSuffix,
  ExcludeSuffix: filterConfig.shield.fileSuffix,
  ExcludeKeywords: filterConfig.shield.excludeKeywords,
  ExcludeStatusCode: filterConfig.shield.statusCode,
})

export const buildHTTPFlowPacketWindowData = (selectedFlow?: HTTPFlow) => ({
  showParentPacketCom: {
    components: 'HTTPFlowDetailMini',
    props: {
      noHeader: true,
      id: selectedFlow?.Id || 0,
      sendToWebFuzzer: true,
      selectedFlow,
      showEditTag: false,
      showJumpTree: false,
    } satisfies HTTPFlowDetailProp,
  },
})

export const mergeHTTPFlowsById = (prev: HTTPFlow[], next: HTTPFlow[]): HTTPFlow[] => {
  if (!prev.length) return next
  if (!next.length) return prev

  const existedIds = new Set(prev.map((item) => item.Id))
  const merged = prev.slice()
  next.forEach((item) => {
    if (existedIds.has(item.Id)) return
    existedIds.add(item.Id)
    merged.push(item)
  })
  return merged
}

export const buildHTTPFlowQueryRequestParams = (
  query: YakQueryHTTPFlowRequest,
  pagination: HTTPHistoryFilterPagination,
  page: number,
  sorter: HTTPHistoryFilterSorter | undefined,
  currentLastId?: number,
) => {
  const isInit = page === 1
  const currentOrder = sorter?.order || 'desc'
  const currentOrderBy = sorter?.orderBy || 'Id'
  const useOffsetPagination = !isInit && currentOrderBy === 'Id' && !!currentLastId

  const requestParams: Record<string, unknown> = {
    ...query,
    Methods: Array.isArray(query.Methods) ? query.Methods.join(',') : '',
    OffsetId: useOffsetPagination ? currentLastId : undefined,
    Pagination: {
      ...pagination,
      Page: page,
      Order: currentOrder,
      OrderBy: currentOrderBy,
    },
  }

  // Strip UI-only fields before sending to backend
  delete requestParams.UpdatedAt
  delete requestParams['UpdatedAt-time']
  delete requestParams.ContentType
  delete requestParams.bodyLength

  const tabQueryParams = { ...requestParams }
  delete tabQueryParams.Pagination
  delete tabQueryParams.OffsetId
  return {
    requestParams,
    tabQueryParams: JSON.stringify(tabQueryParams),
  }
}

export const getHTTPFlowExportPageSize = (total: number): number => {
  if (total > 5000) {
    return 500
  }

  if (total < 1000) {
    return 100
  }

  return Math.round(total / 1000) * 100
}
