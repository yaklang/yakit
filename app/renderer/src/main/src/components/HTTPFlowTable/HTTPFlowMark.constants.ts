import type { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'

/** 流量标记：问题类型 */
export const FLOW_PROBLEM_TYPE_OPTIONS = [
  'SQL注入',
  'XSS',
  'SSRF',
  '未授权访问',
  'CSRF',
  '文件上传漏洞',
  '文件包含',
  '反序列化漏洞',
  '目录遍历',
] as const

/** 流量标记：严重程度 */
export const FLOW_SEVERITY_OPTIONS = ['低危', '中危', '高危', '严重'] as const

/** 流量标记：处置状态 */
export const FLOW_DISPOSAL_STATUS_OPTIONS = ['确认', '误报', '待修复'] as const

/** BatchSetHTTPFlowIssueFields 请求（对齐 proto Set* 字段） */
export interface BatchSetHTTPFlowIssueFieldsRequest {
  Filter?: YakQueryHTTPFlowRequest
  SetIssueType?: string
  SetSeverity?: string
  SetStatus?: string
  StatusReason?: string
  Ids?: number[]
  Hashes?: string[]
  Token?: string
}

export interface BatchSetHTTPFlowIssueFieldsResponse {
  UpdatedCount?: number
}

/** 本地列表 patch 用（对齐 IssueType/Status/StatusReason） */
export interface FlowMarkPatchPayload {
  Ids: number[]
  IssueType?: string
  Severity?: string
  Status?: string
  StatusReason?: string
}
