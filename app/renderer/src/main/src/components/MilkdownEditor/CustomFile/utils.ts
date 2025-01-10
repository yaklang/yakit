import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface HttpFileInfoRespose {
    fileName: string
    size: number
    type: string
}
/**通过链接获取文件基本信息 */
export const getHttpFileLinkInfo: APIFunc<string, HttpFileInfoRespose> = (onlineUrl, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("get-http-file-link-info", onlineUrl)
            .then(resolve)
            .catch((error) => {
                if (!hiddenError) yakitNotify("error", `获取链接信息错误${error}`)
                reject(error)
            })
    })
}

export interface LocalFileInfoRespose {
    size: number
}
/**通过本地路径获取文件基本信息 */
export const getLocalFileLinkInfo: APIFunc<string, LocalFileInfoRespose> = (path, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("fetch-file-info-by-path", path)
            .then((res) => {
                resolve({
                    size: res.size
                })
            })
            .catch((error) => {
                if (!hiddenError) yakitNotify("error", `获取文件信息失败:${error}`)
                reject(error)
            })
    })
}
