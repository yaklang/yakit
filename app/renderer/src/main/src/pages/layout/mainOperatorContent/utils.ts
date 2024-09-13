import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface SaveFuzzerConfigRequest {
    Data: FuzzerConfig[]
}

export interface QueryFuzzerConfigRequest {
    Limit: number
}

export interface QueryFuzzerConfigResponse {
    Data: FuzzerConfig[]
}

export interface FuzzerConfig {
    PageId: string
    Type: "page" | "pageGroup"
    Config: string
}

export const apiSaveFuzzerConfig: APIFunc<SaveFuzzerConfigRequest, null> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("SaveFuzzerConfig", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "保存fuzzer历史失败:" + e)
                reject(e)
            })
    })
}

export const apiQueryFuzzerConfig: APIFunc<QueryFuzzerConfigRequest, QueryFuzzerConfigResponse> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryFuzzerConfig", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询fuzzer历史失败:" + e)
                reject(e)
            })
    })
}