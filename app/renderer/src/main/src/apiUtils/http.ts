import {yakitNotify} from "@/utils/notification"
import {APIFunc} from "./type"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {UploadImgTypeProps} from "@/hook/useUploadOSS/useUploadOSS"

const {ipcRenderer} = window.require("electron")

export interface HttpUploadImgBaseRequest {
    type?: UploadImgTypeProps
    filedHash?: string
}

const isUploadImg = (params: HttpUploadImgBaseRequest) => {
    const {type, filedHash} = params
    let enable = true
    switch (type) {
        case "notepad":
            if (!filedHash) {
                enable = false
                yakitNotify("error", "httpUploadImgPath:type为notepad,filedHash必传")
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
/** @name 上传图片(文件路径) */
export const httpUploadImgPath: APIFunc<HttpUploadImgPathRequest, string> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        // console.log("http-upload-img-path|api:upload/img", JSON.stringify({...request}))

        if (!isUploadImg({type: request.type, filedHash: request.filedHash})) {
            reject("参数错误")
            return
        }
        ipcRenderer
            .invoke("http-upload-img-path", request)
            .then((res) => {
                if (res?.code === 200 && res?.data) {
                    resolve(res.data)
                } else {
                    const message = res?.message || res?.data?.reason || "未知错误"
                    if (!hiddenError) yakitNotify("error", "上传图片失败:" + message)
                    reject(message)
                }
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "上传图片失败:" + e)
                reject(e)
            })
    })
}

export interface HttpUploadImgBase64Request extends HttpUploadImgBaseRequest {
    base64: string
    imgInfo: {filename?: string; contentType?: string}
}
/** @name 上传图片(base64) */
export const httpUploadImgBase64: APIFunc<HttpUploadImgBase64Request, string> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        // console.log("http-upload-img-path|api:upload/img", JSON.stringify({...request, base64: "base64"}))
        if (!isUploadImg({type: request.type, filedHash: request.filedHash})) {
            reject("参数错误")
            return
        }
        ipcRenderer
            .invoke("http-upload-img-base64", request)
            .then((res) => {
                if (res?.code === 200 && res?.data) {
                    resolve(res.data)
                } else {
                    const message = res?.message || res?.data?.reason || "未知错误"
                    if (!hiddenError) yakitNotify("error", "上传图片失败:" + message)
                    reject(message)
                }
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "上传图片失败:" + e)
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
        ipcRenderer
            .invoke("http-upload-file", request)
            .then((res) => {
                if (res?.code === 200 && res?.data) {
                    resolve(res.data)
                } else {
                    const message = res?.message || res?.data?.reason || "未知错误"
                    if (!hiddenError) yakitNotify("error", "上传文件失败:" + message)
                    reject(message)
                }
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "上传文件失败:" + e)
                reject(e)
            })
    })
}

/** @name 删除 OSS 资源 */
export const httpDeleteOSSResource: APIFunc<API.DeleteOssResource, API.ActionSucceeded> = (info, hiddenError) => {
    return new Promise((resolve, reject) => {
        // console.log("method:delete|api:oss/resource\n", JSON.stringify(info))
        NetWorkApi<API.DeleteOssResource, API.ActionSucceeded>({
            method: "delete",
            url: "oss/resource",
            data: info
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "删除OSS资源失败:" + err)
                reject(err)
            })
    })
}
