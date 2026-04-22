import React from 'react'
import { yakitHTTPFlow } from '@/services/electronBridge'

export type HistoryPluginSearchType = 'all' | 'request' | 'response'

/** 与 grpc MITMExtractAggregateFlowFilterRow 一致，用于聚合左栏多选联动流量 */
export interface MitmExtractAggregateFlowFilterRow {
  RuleVerbose?: string
  DisplayData?: string
}

export interface YakQueryHTTPFlowRequest {
  SourceType?: string
  Pagination?: Paging
  SearchURL?: string
  StatusCode?: string
  ExcludeStatusCode?: string
  Methods?: string
  HaveCommonParams?: boolean
  HaveBody?: boolean
  SearchContentType?: string
  ExcludeContentType?: string[]
  Keyword?: string
  KeywordType?: HistoryPluginSearchType
  OnlyWebsocket?: boolean
  IncludeInUrl?: string[]
  ExcludeInUrl?: string[]
  HostnameFilter?: string[]
  IncludePath?: string[]
  ExcludePath?: string[]
  IncludeSuffix?: string[]
  ExcludeSuffix?: string[]
  ExcludeId?: number[]
  IncludeId?: number[]
  Tags?: string[]
  HaveParamsTotal?: string
  BeforeUpdatedAt?: number
  AfterUpdatedAt?: number
  AfterBodyLength?: number
  BeforeBodyLength?: number
  Color?: string[]
  IsWebsocket?: string
  FromPlugin?: string
  RuntimeId?: string
  WithPayload?: boolean
  RuntimeIDs?: string[]
  Full?: boolean
  ProcessName?: string[]
  ExcludeKeywords?: string[]
  AnalyzedIds?: number[]
  /** 与 extracted_data.trace_id 对应的 http_flows.hidden_index */
  HiddenIndex?: string[]
  /** MITM 提取聚合行多选 OR 过滤 */
  MitmExtractAggregateFilterRows?: MitmExtractAggregateFlowFilterRow[]
}

/** QueryMITMExtractedAggregate 返回行（IPC/JSON 可能为 PascalCase 或 camelCase） */
export interface MitmExtractedAggregateRowNormalized {
  RuleVerbose: string
  DisplayData: string
  HitCount: number
  LatestUpdatedAt: number
  SampleTraceIds?: string[]
}

/**
 * MITM 实时表会用 AfterUpdatedAt 做增量窗口；聚合查询若原样带入 HttpFlowFilter，
 * 容易与 extracted_data / join 范围不一致而出现「右侧有流量、左侧聚合空」。
 */
export function stripMitmAggregateHttpFlowLiveWindow(f: YakQueryHTTPFlowRequest): YakQueryHTTPFlowRequest {
  const o: YakQueryHTTPFlowRequest = { ...f }
  delete o.AfterUpdatedAt
  delete o.BeforeUpdatedAt
  return o
}

/** 流量表 onQueryParams 回传的 JSON 里可能仍带上一轮的聚合联动字段；合并进下一次 QueryHTTPFlows 前应先剥掉，由页面显式写入。 */
export function stripMitmAggregateTableFeedback(
  f: YakQueryHTTPFlowRequest | undefined,
): YakQueryHTTPFlowRequest | undefined {
  if (!f) return undefined
  const o: YakQueryHTTPFlowRequest = { ...f }
  delete o.MitmExtractAggregateFilterRows
  delete o.HiddenIndex
  return o
}

/** 兼容主进程 IPC 返回的字段大小写差异 */
export function normalizeQueryMITMExtractedAggregateResponse(rsp: any): {
  rows: MitmExtractedAggregateRowNormalized[]
  total: number
  distinctRuleGroups: string[]
} {
  const rowsRaw = rsp?.Data ?? rsp?.data
  const list = Array.isArray(rowsRaw) ? rowsRaw : []
  const rows: MitmExtractedAggregateRowNormalized[] = list.map((raw: any) => ({
    RuleVerbose: String(raw?.RuleVerbose ?? raw?.ruleVerbose ?? ''),
    DisplayData: String(raw?.DisplayData ?? raw?.displayData ?? ''),
    HitCount: Number(raw?.HitCount ?? raw?.hitCount ?? 0),
    LatestUpdatedAt: Number(raw?.LatestUpdatedAt ?? raw?.latestUpdatedAt ?? 0),
    SampleTraceIds: (raw?.SampleTraceIds ?? raw?.sampleTraceIds) as string[] | undefined,
  }))
  const total = Number(rsp?.Total ?? rsp?.total ?? 0)
  const g = rsp?.DistinctRuleGroups ?? rsp?.distinctRuleGroups
  const distinctRuleGroups = Array.isArray(g) ? g.map((x: any) => String(x)) : []
  return { rows, total, distinctRuleGroups }
}

export interface Paging {
  Page: number
  Limit: number
  Order?: 'asc' | 'desc' | string
  OrderBy?: 'created_at' | 'updated_at' | string
  RawOrder?: string
}

export const yakQueryHTTPFlow = (
  params: YakQueryHTTPFlowRequest,
  onOk?: (rsp: any) => any,
  onFailed?: (e: any) => any,
  onFinally?: () => any,
) => {
  yakitHTTPFlow.queryHistory(params).then(onOk).catch(onFailed).finally(onFinally)
}
