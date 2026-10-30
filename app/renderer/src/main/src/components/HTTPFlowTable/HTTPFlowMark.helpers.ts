import type { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import cloneDeep from 'lodash/cloneDeep'
import type { HTTPFlow } from './HTTPFlowTable.constants'

export interface HTTPFlowMarkScope {
  ids: number[]
  filter?: YakQueryHTTPFlowRequest
}

/** 保留当前筛选与排序；局部选择额外使用完整 ID 集合作为筛选限定。 */
export const resolveHTTPFlowMarkScope = (
  isAllSelect: boolean,
  ids: number[],
  filter: YakQueryHTTPFlowRequest,
): HTTPFlowMarkScope => ({ ids: isAllSelect ? [] : [...ids], filter: cloneDeep(filter) })

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
