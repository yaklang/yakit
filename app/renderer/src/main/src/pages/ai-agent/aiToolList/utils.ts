import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {AITool} from "./AIToolListType"
const {ipcRenderer} = window.require("electron")

export interface GetAIToolListRequest {
    Query: string
    ToolName: string
    Pagination: Paging
    OnlyFavorites: boolean
}
export interface GetAIToolListResponse {
    Tools: AITool[]
    Pagination: Paging
    Total:number
}

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

export interface ToggleAIToolFavoriteRequest {
    ToolName: string
}
export interface ToggleAIToolFavoriteResponse {
    IsFavorite: boolean
    Message: string
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
