import { defaultHTTPHistoryAnalysisPageInfo } from '@/defaultConstants/hTTPHistoryAnalysis'
import type { HTTPHistoryAnalysisPageInfo, PageNodeItemProps } from '@/store/pageInfo'
import type { HTTPFlowDetailProp } from '@/components/HTTPFlowDetail'

export interface QueryAnalyzedHTTPFlowRuleFilter {
  Methods: string[]
  SearchURL: string
  StatusCode: string
  RuleVerboseName: string
  ExtractedContent: string
}

export interface HTTPFlowRuleData {
  Id: number
  HTTPFlowId: number
  Method: string
  StatusCode: string
  Url: string
  IPAddress: string
  RuleVerboseName: string
  Rule: string
  ExtractedContent: string
}

export const getSafeHTTPRequest = (flow: {
  InvalidForUTF8Request?: boolean
  SafeHTTPRequest?: string
  RequestString?: string
}): string => {
  return (flow.InvalidForUTF8Request ? flow.SafeHTTPRequest : flow.RequestString) || ''
}

export const resolveHTTPHistoryAnalysisPageInfo = (
  params?: HTTPHistoryAnalysisPageInfo,
  currentItem?: PageNodeItemProps,
): HTTPHistoryAnalysisPageInfo => {
  if (params) {
    return { ...defaultHTTPHistoryAnalysisPageInfo, ...params }
  }

  const historyAnalysisPageInfo = currentItem?.pageParamsInfo.hTTPHistoryAnalysisPageInfo
  if (historyAnalysisPageInfo) {
    return { ...historyAnalysisPageInfo }
  }

  return { ...defaultHTTPHistoryAnalysisPageInfo }
}

export const toHTTPFlowIds = (selectedHttpFlowIds?: string[]): number[] => {
  return selectedHttpFlowIds?.map((id) => Number(id)) || []
}

export const buildHTTPHistoryAnalysisResizeBoxProps = (
  lastRatio: { firstRatio: string; secondRatio: string },
  openBottomTabsFlag: boolean,
) => {
  return {
    firstRatio: openBottomTabsFlag ? lastRatio.firstRatio : '100%',
    secondRatio: openBottomTabsFlag ? lastRatio.secondRatio : '0%',
    style: {
      height: 'calc(100% - 24px)',
    },
    secondNodeStyle: {
      padding: 0,
      display: openBottomTabsFlag ? 'block' : 'none',
      minHeight: openBottomTabsFlag ? '400px' : '0',
    },
    lineStyle: { display: '' },
  }
}

export const buildHTTPFlowRuleDetailMiniProps = (value?: HTTPFlowRuleData) =>
  ({
    noHeader: true,
    id: value?.HTTPFlowId || 0,
    analyzedIds: value?.Id ? [value.Id] : undefined,
    sendToWebFuzzer: true,
    scrollID: value?.Id,
    showEditTag: false,
    showJumpTree: false,
  }) satisfies HTTPFlowDetailProp

export const hasHTTPFlowRuleTableFilter = (tableQuery: QueryAnalyzedHTTPFlowRuleFilter): boolean => {
  return !!(
    tableQuery.Methods.length > 0 ||
    tableQuery.StatusCode ||
    tableQuery.SearchURL ||
    tableQuery.RuleVerboseName ||
    tableQuery.ExtractedContent
  )
}

const includesIgnoreCase = (source: string, keyword: string): boolean => {
  return source.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
}

export const filterHTTPFlowRuleTableData = (
  tableData: HTTPFlowRuleData[],
  tableQuery: QueryAnalyzedHTTPFlowRuleFilter,
  statusCodes: number[],
): HTTPFlowRuleData[] => {
  if (!hasHTTPFlowRuleTableFilter(tableQuery)) {
    return [...tableData]
  }

  return tableData.filter((record) => {
    if (tableQuery.Methods.length > 0 && !tableQuery.Methods.includes(record.Method)) {
      return false
    }

    if (statusCodes.length > 0 && !statusCodes.some((code) => record.StatusCode + '' === code + '')) {
      return false
    }

    if (tableQuery.SearchURL && !record.Url.includes(tableQuery.SearchURL)) {
      return false
    }

    if (tableQuery.RuleVerboseName && !includesIgnoreCase(record.RuleVerboseName, tableQuery.RuleVerboseName)) {
      return false
    }

    if (tableQuery.ExtractedContent && !includesIgnoreCase(record.ExtractedContent, tableQuery.ExtractedContent)) {
      return false
    }

    return true
  })
}

export const shouldUpdateHTTPFlowRuleSelection = (
  currentSelectItem?: HTTPFlowRuleData,
  nextSelectItem?: HTTPFlowRuleData,
): boolean => {
  if (!nextSelectItem) {
    return true
  }

  return nextSelectItem.Id !== currentSelectItem?.Id
}

export const safeParse = <T = unknown>(val?: string): T | undefined => {
  if (!val) return undefined
  try {
    return JSON.parse(val) as T
  } catch {
    return undefined
  }
}

export const isFilterSectionActive = (obj: Record<string, unknown>): boolean =>
  Object.values(obj).some((val) => {
    if (Array.isArray(val)) return val.length > 0
    return val !== ''
  })
