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
  ExcludeTags?: string[]
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
  /** 问题类型筛选（占位：待后端对齐） */
  ProblemType?: string
  /** 严重程度筛选（占位：待后端对齐） */
  Severity?: string
  /** 处置状态筛选（占位：待后端对齐） */
  DisposalStatus?: string
  /** 与 extracted_data.trace_id 对应的 http_flows.hidden_index */
  HiddenIndex?: string[]
  /** MITM 提取聚合行多选 OR 过滤 */
  MitmExtractAggregateFilterRows?: MitmExtractAggregateFlowFilterRow[]
  AfterId?: number
  BeforeId?: number
  /** 请求后端附带有界的链路诊断数据；不改变查询结果。 */
  IncludeSystemTiming?: boolean
  /** 列表不返回原始响应包；详情通过 GetHTTPFlowById 按需获取。 */
  ExcludeResponseRaw?: boolean
  /** 列表不返回原始请求包；需要数据包的交互通过 GetHTTPFlowById 按需获取。 */
  ExcludeRequestRaw?: boolean
  /** 已有游标的 MITM 实时增量查询跳过精确 Total；初始/历史/周期校准不得使用。 */
  SkipTotal?: boolean
  /** 仅前端用于 BodyLength 筛选图标状态，不会传给后端 */
  bodyLength?: boolean
  /** 仅前端用于 Id 列筛选图标状态（排序或搜索），不会传给后端 */
  idFilter?: boolean
}

export interface YakDeleteHTTPFlowRequest {
  DeleteAll?: boolean
  Id?: number[]
  ItemHash?: string[]
  URLPrefix?: string
  Filter?: YakQueryHTTPFlowRequest
  URLPrefixBatch?: string[]
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
