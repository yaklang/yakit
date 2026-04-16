import { yakitNotify } from '@/utils/notification'
import { APIFunc } from './type'
import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import { UploadImgTypeProps } from '@/hook/useUploadOSS/useUploadOSS'
import { yakitUpload } from '@/services/electronBridge'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, ['apiUtils', 'yakitUi'])

export interface HttpUploadImgBaseRequest {
  type?: UploadImgTypeProps
  filedHash?: string
}

const isUploadImg = (params: HttpUploadImgBaseRequest) => {
  const { type, filedHash } = params
  let enable = true
  switch (type) {
    case 'notepad':
      if (!filedHash) {
        enable = false
        yakitNotify('error', 'httpUploadImgPath: ' + tOriginal('apiUtilsHttp.notepadFiledHashRequired'))
      }
      break
    default:
      break
  }
  return enable
}
export interface HttpUploadImgPathRequest extends HttpUploadImgBaseRequest {
  path: string
}
/** @name 上传图片(文件路径/base64) */
export const httpUploadImgPath: APIFunc<HttpUploadImgPathRequest | HttpUploadImgBase64Request, string> = (
  request,
  hiddenError,
) => {
  return new Promise(async (resolve, reject) => {
    if (!isUploadImg({ type: request.type, filedHash: request.filedHash })) {
      reject(tOriginal('apiUtilsHttp.parameterError'))
      return
    }

    yakitUpload
      .splitUpload({ ...request, url: 'fragment/upload' })
      .then(({ resArr }) => {
        const res = resArr?.[0]
        if (res?.code === 200 && res?.data?.from) {
          resolve(res?.data?.from)
        } else {
          const message = res?.message || res?.data?.reason || tOriginal('YakitNotification.unknown_error')
          if (!hiddenError) yakitNotify('error', tOriginal('apiUtilsHttp.uploadImgFailed', { error: message }))
          reject(message)
        }
      })
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('apiUtilsHttp.uploadImgFailed', { error: e }))
        reject(e)
      })
  })
}

export interface HttpUploadImgBase64Request extends HttpUploadImgBaseRequest {
  base64: string
  imgInfo: { filename?: string; contentType?: string }
}
/** @name 上传图片(base64) */
export const httpUploadImgBase64: APIFunc<HttpUploadImgBase64Request, string> = (request, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    if (!isUploadImg({ type: request.type, filedHash: request.filedHash })) {
      reject(tOriginal('apiUtilsHttp.parameterError'))
      return
    }
    yakitUpload
      .uploadImgBase64(request)
      .then((res) => {
        if (res?.code === 200 && res?.data?.from) {
          resolve(res?.data?.from)
        } else {
          const message = res?.message || res?.data?.reason || tOriginal('YakitNotification.unknown_error')
          if (!hiddenError) yakitNotify('error', tOriginal('apiUtilsHttp.uploadImgFailed', { error: message }))
          reject(message)
        }
      })
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('apiUtilsHttp.uploadImgFailed', { error: e }))
        reject(e)
      })
  })
}

export interface httpUploadFileFileInfo {
  path: string
  name: string
}
/**
 * @name 上传文件
 * @description 上传大小限制5MB
 */
export const httpUploadFile: APIFunc<httpUploadFileFileInfo, string> = (request, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    // console.log("api:http-upload-file\n", JSON.stringify(request))
    yakitUpload
      .uploadFile(request)
      .then((res) => {
        if (res?.code === 200 && res?.data) {
          resolve(res.data)
        } else {
          const message = res?.message || res?.data?.reason || tOriginal('YakitNotification.unknown_error')
          if (!hiddenError) yakitNotify('error', tOriginal('apiUtilsHttp.uploadFileFailed', { error: message }))
          reject(message)
        }
      })
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('apiUtilsHttp.uploadFileFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 删除 OSS 资源 */
export const httpDeleteOSSResource: APIFunc<API.DeleteOssResource, API.ActionSucceeded> = (info, hiddenError) => {
  return new Promise((resolve, reject) => {
    // console.log("method:delete|api:oss/resource\n", JSON.stringify(info))
    NetWorkApi<API.DeleteOssResource, API.ActionSucceeded>({
      method: 'delete',
      url: 'oss/resource',
      data: info,
    })
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', tOriginal('apiUtilsHttp.deleteOSSFailed', { error: String(err) }))
        reject(err)
      })
  })
}

/** @name 删除 OSS 资源 */
export const httpDeleteNotepadFile: APIFunc<API.DeleteOssResource, API.ActionSucceeded> = (info, hiddenError) => {
  return new Promise((resolve, reject) => {
    // console.log("method:delete|api:oss/resource\n", JSON.stringify(info))
    NetWorkApi<API.DeleteOssResource, API.ActionSucceeded>({
      method: 'delete',
      url: 'notepad/file',
      data: info,
    })
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', tOriginal('apiUtilsHttp.deleteOSSFailed', { error: String(err) }))
        reject(err)
      })
  })
}
