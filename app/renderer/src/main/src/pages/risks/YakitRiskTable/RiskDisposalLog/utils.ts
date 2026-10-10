import { NetWorkApi } from '@/services/fetch'
import { yakitNotify } from '@/utils/notification'
import type { API } from '@/services/swagger/resposeType'
import i18n from '@/i18n/i18n'
import { yakitUpload } from '@/services/electronBridge'
import { mergeDisposalLogs } from '@/utils/disposalLog'
import type {
  DisposalLogItem,
  DisposalLogsResponse,
  PublishDisposalCommentRequest,
  UploadDisposalImageRequest,
} from './types'

const tOriginal = i18n.getFixedT(null, 'risk')

const parseFragmentUploadUrl = (res: UploadImgApiResponse | undefined): string => {
  if (res?.code === 200) {
    const data = res.data
    const url = typeof data === 'string' ? data : data?.from || ''
    if (url) return url
  }
  const data = res?.data
  const message = res?.message || (typeof data === 'object' && data ? data.reason : undefined) || 'unknown'
  throw new Error(String(message))
}

/** 漏洞处置评论贴图 → fragment/upload type=RiskComment */
export const apiUploadDisposalImage = (request: UploadDisposalImageRequest): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!request.hash) {
      const err = '缺少 risk hash'
      yakitNotify('error', `上传图片失败: ${err}`)
      reject(err)
      return
    }
    yakitUpload
      .splitUpload({
        url: 'fragment/upload',
        base64: request.base64,
        imgInfo: request.imgInfo,
        type: 'RiskComment',
        filedHash: request.hash,
      })
      .then(({ resArr }) => {
        resolve(parseFragmentUploadUrl(resArr?.[0]))
      })
      .catch((e) => {
        yakitNotify('error', `上传图片失败: ${e}`)
        reject(e)
      })
  })
}

type CommentDetailExtra = API.CommentDetail & { headImg?: string; head_img?: string }

const mapCommentDetail = (item: CommentDetailExtra): DisposalLogItem => {
  const isComment = item.recordType === 'comment'
  return {
    id: item.id || 0,
    logType: isComment ? 'comment' : 'system',
    userName: item.userName,
    headImg: item.headImg || item.head_img,
    description: item.content,
    createdAt: item.createdAt || 0,
    parentComment: item.parentId
      ? { id: item.parentId, userName: item.parentUserName || '', description: '' }
      : undefined,
  }
}

/** 处置日志列表 → POST /risk/httpflow/comment/list */
export const apiGetDisposalLogs = (params: {
  risk_hash: string
  page?: number
  limit?: number
}): Promise<DisposalLogsResponse> => {
  return new Promise((resolve, reject) => {
    NetWorkApi<API.CommentListRequest, API.CommentListResponse>({
      method: 'post',
      url: 'risk/httpflow/comment/list',
      data: {
        hash: params.risk_hash,
        targetType: 'risk',
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        order_by: 'created_at',
        order: 'desc',
      },
    })
      .then((res) => {
        resolve({
          data: mergeDisposalLogs([], (res.data || []).map(mapCommentDetail)),
          total: res.pagemeta?.total,
        })
      })
      .catch((e) => {
        yakitNotify('error', `${tOriginal('RiskDisposalLog.fetch_logs_failed')}: ${e}`)
        reject(e)
      })
  })
}

/** 发布/回复评论 → POST /risk/httpflow/comment */
export const apiPublishDisposalComment = (data: PublishDisposalCommentRequest): Promise<API.ActionSucceeded> => {
  return new Promise((resolve, reject) => {
    const payload: API.CommentRequest = {
      hash: data.risk_hash,
      targetType: 'risk',
      content: data.description,
      parentId: data.logId,
    }
    NetWorkApi<API.CommentRequest, API.ActionSucceeded>({
      method: 'post',
      url: 'risk/httpflow/comment',
      data: payload,
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `${tOriginal('RiskDisposalLog.publish_comment_failed')}: ${e}`)
        reject(e)
      })
  })
}

/** 删除评论 → DELETE /risk/httpflow/comment */
export const apiDeleteDisposalComment = (logId: number): Promise<API.ActionSucceeded> => {
  return new Promise((resolve, reject) => {
    NetWorkApi<API.CommentDeleteRequest, API.ActionSucceeded>({
      method: 'delete',
      url: 'risk/httpflow/comment',
      data: { id: logId },
    })
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `${tOriginal('RiskDisposalLog.delete_comment_failed')}: ${e}`)
        reject(e)
      })
  })
}

export type { DisposalLogItem }
