import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { yakitNotify } from '@/utils/notification'
import type { SetHTTPFlowMarkRequest } from './HTTPFlowMark.constants'

/**
 * 批量/单条修改流量标记
 * xxx--- 等待后端联调
 */
export const apiSetHTTPFlowMark = (data: SetHTTPFlowMarkRequest): Promise<API.ActionSucceeded> => {
  return new Promise((resolve, reject) => {
    NetWorkApi<SetHTTPFlowMarkRequest, API.ActionSucceeded>({
      method: 'post',
      url: 'httpflow/mark',
      data,
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `修改流量标记失败: ${e}`)
        reject(e)
      })
  })
}
