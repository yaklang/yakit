import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {
    AITool,
    DeleteAIToolRequest,
    GetAIToolListRequest,
    GetAIToolListResponse,
    ToggleAIToolFavoriteRequest,
    ToggleAIToolFavoriteResponse
} from "../type/aiChat"
import {genDefaultPagination} from "@/pages/invoker/schema"
const {ipcRenderer} = window.require("electron")

export const grpcGetAIToolList: APIFunc<GetAIToolListRequest, GetAIToolListResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetAIToolList", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcGetAIToolList 失败:" + err)
                reject(err)
            })
    })
}

export const grpcGetAIToolById: APIFunc<number, AITool | null> = (toolId, hiddenError) => {
    return new Promise((resolve, reject) => {
        if (!toolId) {
            if (!hiddenError) yakitNotify("error", `获取AITool详情失败: id(${toolId})数据异常`)
            reject(new Error(`获取AITool详情失败: id(${toolId})数据异常`))
            return
        }
        const query: GetAIToolListRequest = {
            Query: "",
            ToolName: "",
            Pagination: genDefaultPagination(1),
            OnlyFavorites: false,
            ToolID: toolId
        }
        ipcRenderer
            .invoke("GetAIToolList", query)
            .then((res: GetAIToolListResponse) => {
                if (res && res.Tools && res.Tools.length > 0) {
                    resolve(res.Tools[0])
                } else {
                    resolve(null)
                }
            })
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcGetAIToolByName 失败:" + err)
                reject(err)
            })
    })
}

export const grpcToggleAIToolFavorite: APIFunc<ToggleAIToolFavoriteRequest, ToggleAIToolFavoriteResponse> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("ToggleAIToolFavorite", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcToggleAIToolFavorite 失败:" + err)
                reject(err)
            })
    })
}

export const grpcDeleteAITool: APIFunc<DeleteAIToolRequest, ToggleAIToolFavoriteResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteAITool", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcDeleteAITool 失败:" + err)
                reject(err)
            })
    })
}
