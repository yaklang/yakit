import {APIFunc} from "@/apiUtils/type"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface UploadBase64ImgInfo {
    base64: string
    type: string
}
/** @name 上传图片(base64) */
export const uploadBase64ImgToUrl: APIFunc<UploadBase64ImgInfo, string> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        console.log("api:upload-base64-img", JSON.stringify(request))
        ipcRenderer
            .invoke("upload-base64-img", request)
            .then((res) => {
                console.log("res", res)
                if (res?.code === 200 && res?.data) {
                    resolve(res.data)
                } else {
                    const message = res?.message || "未知错误"
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

/** @name 删除OSS图片 */
export const deleteOSSImage: APIFunc<API.DeleteOssResource, API.ActionSucceeded> = (request, hiddenError) => {
    return new Promise((resolve, reject) => {
        console.log("method:post|api:plugins", JSON.stringify(request))
        NetWorkApi<API.DeleteOssResource, API.ActionSucceeded>({
            method: "delete",
            url: "oss/resource",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "图片删除失败:" + err)
                reject(err)
            })
    })
}

export interface uploadPluginFileInfo {
    path: string
    name: string
    uuid?: string
}
/** @name 上传图片(base64) */
export const uploadPluginFile: APIFunc<uploadPluginFileInfo, string> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        console.log("api:upload-plugin-file", JSON.stringify(request))
        ipcRenderer
            .invoke("upload-plugin-file", request)
            .then((res) => {
                console.log("res", res)
                if (res?.code === 200 && res?.data) {
                    resolve(res.data)
                } else {
                    const message = res?.message || "未知错误"
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
