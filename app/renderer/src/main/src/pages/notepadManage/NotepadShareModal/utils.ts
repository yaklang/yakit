import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

interface DirectoryProps {
    filePaths: string[]
}
export const openDirectory: APINoRequestFunc<DirectoryProps> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件夹",
                properties: ["openDirectory"]
            })
            .then(resolve)
            .catch((err) => {
                yakitNotify("error", "打开文件夹失败：" + err)
                reject(err)
            })
    })
}

export interface UserSearchQuery {
    keywords: string
}

/**
 * @description 获取用户
 * @param query
 * @returns
 */
export const apiGetUserSearch: APIFunc<UserSearchQuery, API.UserOrdinaryResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<UserSearchQuery, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/search",
                params: {
                    ...query
                }
            })
                .then(resolve)
                .catch((err) => {
                    yakitNotify("error", "apiGetUserSearch获取普通用户失败:" + err)
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @description 分享笔记本权限
 * @param query
 * @returns
 */
export const apiSetNotepadPermission: APIFunc<API.PostNotepadPermissionRequest, API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PostNotepadPermissionRequest, API.ActionSucceeded>({
                method: "post",
                url: "notepad/permission",
                data: query
            })
                .then(resolve)
                .catch((err) => {
                    yakitNotify("error", "设置笔记本权限失败：" + err)
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}
