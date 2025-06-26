import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {
    GetAIToolListRequest,
    GetAIToolListResponse,
    ToggleAIToolFavoriteRequest,
    ToggleAIToolFavoriteResponse
} from "../type/aiChat"
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
