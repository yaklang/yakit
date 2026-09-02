import { httpUploadImgBase64 } from '@/apiUtils/http'
import { NetWorkApi } from '@/services/fetch'
import { yakitNotify } from '@/utils/notification'
import type { API } from '@/services/swagger/resposeType'
import i18n from '@/i18n/i18n'
import type {
  DisposalLogItem,
  DisposalLogsResponse,
  PublishDisposalCommentRequest,
  UploadDisposalImageRequest,
} from './types'

const tOriginal = i18n.getFixedT(null, 'risk')

/**
 * 处置日志图片上传（占位：待后端联调）
 *
 * 后端契约占位（定稿后替换本实现）：
 * - URL: risk/disposal/upload（待定）
 * - 请求: multipart file 或 base64 + filename + contentType + type
 * - 响应: 图片 URL 字符串，或 { from: string }
 *
 * 当前临时走 upload/img（httpUploadImgBase64，经 Electron IPC）
 */
export const apiUploadDisposalImage = (request: UploadDisposalImageRequest): Promise<string> => {
  return httpUploadImgBase64({
    ...request,
    type: 'comment',
  })
}

/** 处置日志列表（占位：待后端联调） */
export const apiGetDisposalLogs = (params: {
  risk_hash: string
  beforeId?: number
  limit?: number
}): Promise<DisposalLogsResponse> => {
  return new Promise((resolve, reject) => {
    NetWorkApi<typeof params, DisposalLogsResponse>({
      method: 'get',
      url: 'risk/disposal/logs',
      params,
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `${tOriginal('RiskDisposalLog.fetch_logs_failed')}: ${e}`)
        reject(e)
      })
  })
}

/** 发布/回复评论（占位） */
export const apiPublishDisposalComment = (
  data: PublishDisposalCommentRequest,
): Promise<API.ActionSucceeded> => {
  return new Promise((resolve, reject) => {
    NetWorkApi<PublishDisposalCommentRequest, API.ActionSucceeded>({
      method: 'post',
      url: 'risk/disposal/comment',
      data,
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `${tOriginal('RiskDisposalLog.publish_comment_failed')}: ${e}`)
        reject(e)
      })
  })
}

/** 删除评论（占位） */
export const apiDeleteDisposalComment = (logId: number): Promise<API.ActionSucceeded> => {
  return new Promise((resolve, reject) => {
    NetWorkApi<{ logId: number }, API.ActionSucceeded>({
      method: 'delete',
      url: 'risk/disposal/comment',
      params: { logId },
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `${tOriginal('RiskDisposalLog.delete_comment_failed')}: ${e}`)
        reject(e)
      })
  })
}

export type { DisposalLogItem }
