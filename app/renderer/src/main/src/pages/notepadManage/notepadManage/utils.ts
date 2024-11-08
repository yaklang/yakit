import {APIFunc} from "@/apiUtils/type"
import {PluginListPageMeta} from "@/pages/plugins/baseTemplateType"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"

export interface SearchParamsProps {
    /** 关键词 */
    keyword: string
    /** 用户名 */
    userName: string
    /** 搜索类型 */
    type: "keyword" | "userName"
}
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
            // onDownloadProgress:(progress)=>{
            //     console.log('onDownloadProgress',progress)
            // }
        })
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "下载记事本失败:" + err)
                reject(err)
            })
    })
}
