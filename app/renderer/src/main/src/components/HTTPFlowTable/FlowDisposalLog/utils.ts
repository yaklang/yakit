import { httpUploadImgBase64 } from '@/apiUtils/http'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { yakitNotify } from '@/utils/notification'
import type {
  FlowDisposalLogsResponse,
  PublishFlowDisposalCommentRequest,
  UploadDisposalImageRequest,
} from './types'

/** 流量处置日志图片上传（占位：待后端联调） */
export const apiUploadFlowDisposalImage = (request: UploadDisposalImageRequest): Promise<string> => {
  return httpUploadImgBase64({
    ...request,
    type: 'comment',
  })
}

/** 流量处置日志列表（占位：待后端联调） */
export const apiGetFlowDisposalLogs = (params: {
  flow_id?: number
  hash?: string
  beforeId?: number
  limit?: number
}): Promise<FlowDisposalLogsResponse> => {
  return new Promise((resolve, reject) => {
    // xxx--- 等待后端联调
    NetWorkApi<typeof params, FlowDisposalLogsResponse>({
      method: 'get',
      url: 'httpflow/disposal/logs',
      params,
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `查询流量处置日志失败: ${e}`)
        reject(e)
      })
  })
}

/** 发布/回复评论（占位） */
export const apiPublishFlowDisposalComment = (
  data: PublishFlowDisposalCommentRequest,
): Promise<API.ActionSucceeded> => {
  return new Promise((resolve, reject) => {
    // xxx--- 等待后端联调
    NetWorkApi<PublishFlowDisposalCommentRequest, API.ActionSucceeded>({
      method: 'post',
      url: 'httpflow/disposal/comment',
      data,
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `发布评论失败: ${e}`)
        reject(e)
      })
  })
}

/** 删除评论（占位） */
export const apiDeleteFlowDisposalComment = (logId: number): Promise<API.ActionSucceeded> => {
  return new Promise((resolve, reject) => {
    // xxx--- 等待后端联调
    NetWorkApi<{ logId: number }, API.ActionSucceeded>({
      method: 'delete',
      url: 'httpflow/disposal/comment',
      params: { logId },
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `删除评论失败: ${e}`)
        reject(e)
      })
  })
}
