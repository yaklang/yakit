import type { FilterConfig } from './HTTPFlowTableFormConfiguration/HTTPFlowTableFormConfiguration'
import type { FiltersItemProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import type {
  MitmExtractAggregateFlowFilterRow,
  MitmExtractedAggregateRowNormalized,
  YakQueryHTTPFlowRequest,
} from '@/utils/yakQueryHTTPFlow'

export interface HTTPFlowTableLegacyValues {
  filterMode?: string
  hostName?: unknown
  urlPath?: unknown
  fileSuffix?: unknown
  searchContentType?: string
  excludeKeywords?: unknown
  statusCode?: string
}

export interface HTTPFlowTableShieldDataSplit {
  shieldIds: number[]
  shieldHosts: string[]
}

export const safeParseHTTPFlowTableCache = <T = unknown>(value?: string): T | undefined => {
  if (!value) return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

const normalizeLegacyListValue = (value?: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`).filter(Boolean)
  }

  if (typeof value !== 'string') {
    return value === undefined || value === null || value === '' ? [] : [`${value}`]
  }

  const parsedValue = safeParseHTTPFlowTableCache<unknown>(value)
  if (Array.isArray(parsedValue)) {
    return parsedValue.map((item) => `${item}`).filter(Boolean)
  }

  return parsedValue === undefined || parsedValue === null || parsedValue === '' ? [] : [`${parsedValue}`]
}

export const buildLegacyHTTPFlowTableFilterConfig = (
  currentConfig: FilterConfig,
  legacyValues: HTTPFlowTableLegacyValues,
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

export const buildHTTPFlowTableAdvancedQuery = (filterConfig: FilterConfig, shieldHosts: string[]) => ({
  SearchContentType: filterConfig.show.searchContentType.join(','),
  ExcludeContentType: filterConfig.shield.searchContentType,
  HostnameFilter: filterConfig.show.hostName,
  ExcludeInUrl: Array.from(new Set([...shieldHosts, ...filterConfig.shield.hostName])),
  IncludePath: filterConfig.show.urlPath,
  ExcludePath: filterConfig.shield.urlPath,
  IncludeSuffix: filterConfig.show.fileSuffix,
  ExcludeSuffix: filterConfig.shield.fileSuffix,
  ExcludeKeywords: filterConfig.shield.excludeKeywords,
  ExcludeStatusCode: filterConfig.shield.statusCode,
})

export const hasActiveHTTPFlowTableFilterConfig = (filterConfig: FilterConfig): boolean => {
  const hasActiveField = (obj: Record<string, unknown>) =>
    Object.values(obj).some((value) => {
      if (Array.isArray(value)) return value.length > 0
      return value !== ''
    })

  return hasActiveField(filterConfig.shield) || hasActiveField(filterConfig.show)
}

export const splitHTTPFlowTableShieldData = (data: Array<string | number>): HTTPFlowTableShieldDataSplit => {
  return data.reduce<HTTPFlowTableShieldDataSplit>(
    (acc, item) => {
      if (typeof item === 'string') {
        acc.shieldHosts.push(item)
      } else {
        acc.shieldIds.push(item)
      }

      return acc
    },
    {
      shieldIds: [],
      shieldHosts: [],
    },
  )
}

export interface RuleSummaryItem {
  RowKey: string
  RuleName: string
  SampleData: string
  TraceCount: number
  SampleTraceIds: string[]
}

export interface RuleScopeFilter {
  TraceID?: string[]
  RuleVerbose?: string[]
  Keyword?: string
}

export const uniqStrings = (list: string[]) => Array.from(new Set(list.filter(Boolean)))

const stripMitmAggregateHttpFlowLiveWindow = (filter: YakQueryHTTPFlowRequest): YakQueryHTTPFlowRequest => {
  const nextFilter: YakQueryHTTPFlowRequest = { ...filter }
  delete nextFilter.AfterUpdatedAt
  delete nextFilter.BeforeUpdatedAt
  return nextFilter
}

const stripMitmAggregateTableFeedback = (
  filter: YakQueryHTTPFlowRequest | undefined,
): YakQueryHTTPFlowRequest | undefined => {
  if (!filter) return undefined

  const nextFilter: YakQueryHTTPFlowRequest = { ...filter }
  delete nextFilter.MitmExtractAggregateFilterRows
  delete nextFilter.HiddenIndex
  return nextFilter
}

export const buildRuleDataFilterQuery = (
  baseParams?: YakQueryHTTPFlowRequest,
  parsedQuery?: YakQueryHTTPFlowRequest,
): YakQueryHTTPFlowRequest => {
  const nextQuery = { ...(baseParams || {}), ...(parsedQuery || {}) } as Record<string, unknown>
  delete nextQuery.Pagination
  delete nextQuery.AfterId
  delete nextQuery.BeforeId
  delete nextQuery.AnalyzedIds
  const tableOnlyQuery = stripMitmAggregateTableFeedback(nextQuery as YakQueryHTTPFlowRequest)
  return stripMitmAggregateHttpFlowLiveWindow((tableOnlyQuery || {}) as YakQueryHTTPFlowRequest)
}

export const hasHTTPFlowFilterCriteria = (query: YakQueryHTTPFlowRequest | undefined): boolean => {
  if (!query) return false
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    if (typeof value === 'boolean' && value === false) continue
    if (key === 'SourceType' || key === 'Full' || key === 'WithPayload') continue
    return true
  }
  return false
}

export const buildRuleSummaryList = (rows: MitmExtractedAggregateRowNormalized[]): RuleSummaryItem[] => {
  const rowMap = new Map<string, RuleSummaryItem>()

  rows.forEach((row) => {
    const ruleName = row.RuleVerbose || ''
    if (!ruleName) return

    const sampleData = row.DisplayData || ''
    const rowKey = `${ruleName}\0${sampleData}`
    const existing = rowMap.get(rowKey)

    if (existing) {
      existing.TraceCount += Number(row.HitCount || 0)
      if (row.SampleTraceIds?.length) {
        existing.SampleTraceIds = uniqStrings([...existing.SampleTraceIds, ...row.SampleTraceIds])
      }
      return
    }

    rowMap.set(rowKey, {
      RowKey: rowKey,
      RuleName: ruleName,
      SampleData: sampleData,
      TraceCount: Number(row.HitCount || 0),
      SampleTraceIds: Array.isArray(row.SampleTraceIds) ? [...row.SampleTraceIds] : [],
    })
  })

  return Array.from(rowMap.values())
}

export const buildRuleNameOptions = (
  ruleNameOptions: string[],
  ruleList: RuleSummaryItem[],
  ruleVerboseFilter: string[],
): string[] => uniqStrings([...ruleNameOptions, ...ruleList.map((item) => item.RuleName), ...ruleVerboseFilter])

export const buildRuleNameTagOptions = (
  ruleNameOptions: string[],
  ruleList: RuleSummaryItem[],
  ruleVerboseFilter: string[],
): FiltersItemProps[] =>
  buildRuleNameOptions(ruleNameOptions, ruleList, ruleVerboseFilter).map((name) => ({ label: name, value: name }))

export const mergeRuleSummaryItems = (prev: RuleSummaryItem[], next: RuleSummaryItem[]): RuleSummaryItem[] => {
  const mergedMap = new Map<string, RuleSummaryItem>()
  prev.forEach((item) => mergedMap.set(item.RowKey, item))
  next.forEach((item) => mergedMap.set(item.RowKey, item))
  return Array.from(mergedMap.values())
}

export const buildNextCheckedRuleRows = (
  prev: RuleSummaryItem[],
  row: RuleSummaryItem,
  checked: boolean,
): RuleSummaryItem[] => {
  if (checked) {
    const exists = prev.some((item) => item.RowKey === row.RowKey)
    return exists ? prev : [...prev, row]
  }

  return prev.filter((item) => item.RowKey !== row.RowKey)
}

export const toggleCheckedRuleRow = (prev: RuleSummaryItem[], row: RuleSummaryItem): RuleSummaryItem[] => {
  const exists = prev.some((item) => item.RowKey === row.RowKey)
  return exists ? prev.filter((item) => item.RowKey !== row.RowKey) : [...prev, row]
}

export const buildScopeFilterFromRows = (rows: RuleSummaryItem[], keyword?: string) => ({
  TraceID: uniqStrings(rows.flatMap((item) => item.SampleTraceIds)),
  RuleVerbose: uniqStrings(rows.map((item) => item.RuleName)),
  Keyword: keyword || undefined,
})

export const buildRuleScopeFilter = (
  checkedRows: RuleSummaryItem[],
  ruleVerboseFilter: string[],
  keyword?: string,
): RuleScopeFilter => {
  if (checkedRows.length > 0) {
    return buildScopeFilterFromRows(checkedRows, keyword)
  }

  const filter: RuleScopeFilter = {}
  if (ruleVerboseFilter.length > 0) filter.RuleVerbose = ruleVerboseFilter
  if (keyword) filter.Keyword = keyword
  return filter
}

export const getRuleDataColumnWidth = (tableWrapWidth: number, reservedWidth: number): number | undefined => {
  if (!tableWrapWidth) return undefined
  const width = tableWrapWidth - reservedWidth
  return width > 0 ? width : undefined
}

export const buildCheckedFilterRows = (checkedRows: RuleSummaryItem[]): MitmExtractAggregateFlowFilterRow[] =>
  checkedRows.map((item) => ({ RuleVerbose: item.RuleName, DisplayData: item.SampleData }))
