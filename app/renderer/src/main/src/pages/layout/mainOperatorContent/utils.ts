import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"

const {ipcRenderer} = window.require("electron")

export interface SaveFuzzerConfigRequest {
    Data: FuzzerConfig[]
}

export interface QueryFuzzerConfigRequest {
    PageId?: string[]
    Pagination: Paging
}

export interface QueryFuzzerConfigResponse {
    Data: FuzzerConfig[]
}

export interface FuzzerConfig {
    PageId: string
    Type: "page" | "pageGroup"
    Config: string
}
export interface DbOperateMessage {
    //表名 数据源
    TableName: string
    //操作 (增删改查)
    Operation: string
    //影响行数
    EffectRows: string
    //额外信息
    ExtraMessage: string
}
export const apiSaveFuzzerConfig: APIFunc<SaveFuzzerConfigRequest, DbOperateMessage> = (params, hiddenError) => {
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

export const apiQueryFuzzerConfig: APIFunc<QueryFuzzerConfigRequest, QueryFuzzerConfigResponse> = (
    params,
    hiddenError
) => {
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

export interface DeleteFuzzerConfigRequest {
    PageId: string[]
    DeleteAll: boolean
}
export const apiDeleteFuzzerConfig: APIFunc<DeleteFuzzerConfigRequest, DbOperateMessage> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteFuzzerConfig", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除fuzzer历史失败:" + e)
                reject(e)
            })
    })
}
