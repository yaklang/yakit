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

/** xxx--- 等待后端联调 */
export interface SetHTTPFlowMarkRequest {
  Ids: number[]
  ProblemType?: string
  Severity?: string
  DisposalStatus?: string
  DisposalNote?: string
}
