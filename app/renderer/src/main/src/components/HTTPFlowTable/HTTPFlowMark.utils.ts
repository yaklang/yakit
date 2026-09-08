import { yakitNotify } from '@/utils/notification'
import type {
  BatchSetHTTPFlowIssueFieldsRequest,
  BatchSetHTTPFlowIssueFieldsResponse,
} from './HTTPFlowMark.constants'

const { ipcRenderer } = window.require('electron')

/** BatchSetHTTPFlowIssueFields：批量/单条修改流量标记 */
export const apiBatchSetHTTPFlowIssueFields = (
  data: BatchSetHTTPFlowIssueFieldsRequest,
): Promise<BatchSetHTTPFlowIssueFieldsResponse> => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('BatchSetHTTPFlowIssueFields', data)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `修改流量标记失败: ${e}`)
        reject(e)
      })
  })
}
