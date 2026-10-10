import type { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import type { HTTPFlow } from './HTTPFlowTable.constants'

export interface HTTPFlowMarkScope {
  ids: number[]
  filter?: YakQueryHTTPFlowRequest
}

/** 全选按当前筛选条件更新；局部选择只按显式 ID 更新。 */
export const resolveHTTPFlowMarkScope = (
  isAllSelect: boolean,
  ids: number[],
  filter: YakQueryHTTPFlowRequest,
): HTTPFlowMarkScope => (isAllSelect ? { ids: [], filter } : { ids })

const HTTP_FLOW_MARK_FIELDS = ['IssueType', 'Severity', 'Status', 'StatusReason'] as const

/** 同一流量的表格数据更新后，只同步标记字段，保留详情已加载的报文等完整数据。 */
export const mergeHTTPFlowDetailMark = (current?: HTTPFlow, incoming?: HTTPFlow): HTTPFlow | undefined => {
  if (!current || !incoming || Number(current.Id) !== Number(incoming.Id)) return current

  const patch: Partial<HTTPFlow> = {}
  let changed = false
  HTTP_FLOW_MARK_FIELDS.forEach((field) => {
    if (incoming[field] !== undefined && incoming[field] !== current[field]) {
      patch[field] = incoming[field]
      changed = true
    }
  })
  return changed ? { ...current, ...patch } : current
}
