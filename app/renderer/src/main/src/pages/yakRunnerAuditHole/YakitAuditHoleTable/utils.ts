import {yakitNotify} from "@/utils/notification"
import {DeleteSSARisksRequest, QuerySSARisksRequest, QuerySSARisksResponse, SSARisksFilter} from "./YakitAuditHoleTableType"
import {FieldGroup} from "@/pages/risks/YakitRiskTable/utils"
import { FieldName } from "@/pages/risks/RiskTable"
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
    FileField: FieldGroup[]
    SeverityField: FieldName[]
    RiskTypeField: FieldName[]
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

export const apiNewRiskRead: (query?: SSARisksFilter) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("NewSSARiskRead", {Filter:query})
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `已读失败: ${e}`)
                reject(e)
            })
    })
}

export interface GroupTableColumnRequest {
    DatabaseName: "Project"|"Profile"|"SSA"
    TableName: string
    ColumnName:string
}

export interface GroupTableColumnResponse {
    Data: string[]
}

export const apiGroupTableColumn: (query: GroupTableColumnRequest) => Promise<GroupTableColumnResponse> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GroupTableColumn", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `已读失败: ${e}`)
                reject(e)
            })
    })
}

