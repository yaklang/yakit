import {APIFunc} from "@/apiUtils/type"
import {PluginListPageMeta, PluginSearchParams} from "@/pages/plugins/baseTemplateType"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"
import {openABSFileLocated} from "@/utils/openWebsite"

const {ipcRenderer} = window.require("electron")

export interface SearchParamsProps extends PluginSearchParams {}
export interface NotepadQuery {
    keyWords: string
    user: string
}

/**
 * /notepad  post 将前端定义类型转换为后端接受的定义类型
 * @param {NotepadQuery} query
 * @param {PluginListPageMeta} pageParams
 * @returns {GetNotepadRequestProps}
 */
export const convertGetNotepadRequest = (
    search: SearchParamsProps,
    pageParams?: PluginListPageMeta
): GetNotepadRequestProps => {
    const data: GetNotepadRequestProps = {
        page: pageParams?.page || 1,
        limit: pageParams?.limit || 20,
        order: pageParams?.order || "desc",
        order_by: pageParams?.order_by || "",
        // search
        keywords: search.type === "keyword" ? search.keyword : "",
        user: search.type === "userName" ? search.userName : ""
    }
    return data
}

export interface GetNotepadRequestProps extends API.GetNotepadRequest, PluginListPageMeta {}
/**
 * @description 获取记事本列表
 * @param query
 * @param hiddenError
 * @returns
 */
export const apiGetNotepadList: APIFunc<GetNotepadRequestProps, API.GetNotepadResponse> = (query, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<GetNotepadRequestProps, API.GetNotepadResponse>({
            method: "get",
            url: "notepad",
            params: {
                page: query.page || 1,
                limit: query.limit || 20,
                order: query.order || "desc",
                order_by: query.order_by || "updated_at"
            },
            data: {...query}
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取记事本列表失败:" + err)
                reject(err)
            })
    })
}
/**
 * @description 保存/新建记事本
 * @param params
 * @param hiddenError
 * @returns
 */
export const apiSaveNotepadList: APIFunc<API.PostNotepadRequest, string> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.PostNotepadRequest, string>({
            method: "post",
            url: "notepad",
            data: params
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "保存/新建记事本失败:" + err)
                reject(err)
            })
    })
}

interface NotepadDetailRequest {
    hash: string
}
/**
 * @description 获取记事本详情
 * @param hash
 * @param hiddenError
 * @returns
 */
export const apiGetNotepadDetail: APIFunc<string, API.GetNotepadList> = (hash, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<NotepadDetailRequest, API.GetNotepadList>({
            method: "get",
            url: "notepad/detail",
            params: {
                hash
            }
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取记事本详情失败:" + err)
                reject(err)
            })
    })
}

/**
 * @description 删除记事本
 * @param params
 * @param hiddenError
 * @returns
 */
export const apiDeleteNotepadDetail: APIFunc<API.DeleteNotepadRequest, API.GetNotepadList> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.DeleteNotepadRequest, API.GetNotepadList>({
            method: "delete",
            url: "notepad",
            data: params
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "删除记事本失败:" + err)
                reject(err)
            })
    })
}

export const apiDownloadNotepad: APIFunc<API.NotepadDownloadRequest, API.NotepadDownloadResponse> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.NotepadDownloadRequest, API.NotepadDownloadResponse>({
            method: "post",
            url: "notepad/download",
            data: params
        })
            .then((res) => {
                console.log("notepad/download", params, res)
                resolve(res)
            })
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "下载记事本失败:" + err)
                reject(err)
            })
    })
}

export interface SaveDialogResponse {
    /**线上链接 */
    url: string
    /**本地保存地址 */
    path: string
    /** 文件名 */
    fileName: string
}
/**获取文件名称 */
const getFileName = (filePath) => {
    const match = filePath.match(/[^\\/]+$/) // 匹配最后的文件名
    return match ? match[0] : ""
}
/**
 * @description 打开保存文件框，返回保存信息(路径和文件名)
 * @param url
 * @param hiddenError
 * @returns {url:线上链接;filePath:保存的本地路径;fileName:保存后的最新文件名}
 */
export const saveDialogAndGetLocalFileInfo: APIFunc<string, SaveDialogResponse> = (url, hiddenError) => {
    return new Promise((resolve, reject) => {
        if (!url) {
            if (!hiddenError) yakitNotify("error", "下载链接为空")
            reject("下载链接为空")
            return
        }
        const fileName = getFileName(url)
        ipcRenderer
            .invoke("show-save-dialog", fileName)
            .then((res) => {
                const {filePath, name} = res
                if (filePath) {
                    const v = {
                        url: url,
                        path: filePath,
                        fileName: name
                    }
                    resolve(v)
                } else {
                    if (!hiddenError) yakitNotify("error", "获取保存文件路径错误")
                    reject("获取保存文件路径错误")
                }
            })
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", `获取保存文件路径错误${err}`)
                reject(err)
            })
    })
}

export const onOpenLocalFileByPath: APIFunc<string, boolean> = (path, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("is-file-exists", path)
            .then((flag: boolean) => {
                if (flag) {
                    openABSFileLocated(path)
                } else {
                    if (!hiddenError) yakitNotify("error", `目标文件已不存在`)
                    reject()
                }
                resolve(flag)
            })
            .catch((error) => {
                if (!hiddenError) yakitNotify("error", `目标文件已不存在${error}`)
                reject(error)
            })
    })
}
