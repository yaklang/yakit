import {yakitNotify} from "@/utils/notification"
import {DeleteSSARisksRequest, QuerySSARisksRequest, QuerySSARisksResponse} from "./YakitAuditHoleTableType"
import {FieldGroup} from "@/pages/risks/YakitRiskTable/utils"
const {ipcRenderer} = window.require("electron")
/** QuerySSARisks */
export const apiQuerySSARisks: (query?: QuerySSARisksRequest) => Promise<QuerySSARisksResponse> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QuerySSARisks", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `查询失败: ${e}`)
                reject(e)
            })
    })
}

/** DeleteSSARisks */
export const apiDeleteSSARisks: (query?: DeleteSSARisksRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteSSARisks", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `删除失败: ${e}`)
                reject(e)
            })
    })
}

export interface UpdateSSARiskTagsRequest {
    ID: number
    Tags: string[]
}
/** UpdateSSARiskTags */
export const apiUpdateSSARiskTags: (params: UpdateSSARiskTagsRequest) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("UpdateSSARiskTags", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `设置失败: ${e}`)
                reject(e)
            })
    })
}

export interface GetSSARiskFieldGroupResponse {
    ProgramNameField: FieldGroup[]
    SeverityField: FieldGroup[]
    RiskTypeField: FieldGroup[]
}
/** GetSSARiskFieldGroup */
export const apiGetSSARiskFieldGroup: () => Promise<GetSSARiskFieldGroupResponse> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSSARiskFieldGroup")
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `查询失败: ${e}`)
                reject(e)
            })
    })
}

export interface NewRiskReadRequest {
    /**@deprecated */
    AfterId?: string
    /**传空数组代表全部已读 */
    Ids: number[]
}
export const apiNewRiskRead: (query?: NewRiskReadRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        console.log("query---",query);
        
        ipcRenderer
            .invoke("NewSSARiskRead", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `已读失败: ${e}`)
                reject(e)
            })
    })
}
