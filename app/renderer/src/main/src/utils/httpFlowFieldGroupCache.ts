import { HTTPFlowsFieldGroupResponse } from '@/components/HTTPFlowTable/HTTPFlowTable.constants'

const { ipcRenderer } = window.require('electron')

const CACHE_TTL_MS = 60_000

let cachedResponse: HTTPFlowsFieldGroupResponse | null = null
let cachedAt = 0
let inflight: Promise<HTTPFlowsFieldGroupResponse> | null = null

/** 共享 HTTPFlowsFieldGroup 结果，避免 History/MITM 多组件切页重复拉取标签 */
export function fetchHTTPFlowsFieldGroup(refreshRequest = true): Promise<HTTPFlowsFieldGroupResponse> {
  const now = Date.now()
  if (!refreshRequest && cachedResponse && now - cachedAt < CACHE_TTL_MS) {
    return Promise.resolve(cachedResponse)
  }

  if (inflight) {
    return inflight
  }

  const request = ipcRenderer
    .invoke('HTTPFlowsFieldGroup', { RefreshRequest: refreshRequest, IsAll: true })
    .then((rsp: HTTPFlowsFieldGroupResponse) => {
      cachedResponse = rsp
      cachedAt = Date.now()
      return rsp
    })
    .finally(() => {
      inflight = null
    })

  inflight = request
  return request
}

export function invalidateHTTPFlowsFieldGroupCache() {
  cachedResponse = null
  cachedAt = 0
}
