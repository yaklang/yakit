import {yakitNotify} from "@/utils/notification"
import {QueryRisksRequest, QueryRisksResponse} from "./YakitRiskTableType"
import {Risk} from "../schema"
import {FieldName, Fields} from "../RiskTable"
import {defQueryRisksRequest} from "./constants"
import i18n from "@/i18n/i18n"
const {ipcRenderer} = window.require("electron")
/** QueryRisks */
export const apiQueryRisks: (query?: QueryRisksRequest) => Promise<QueryRisksResponse> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryRisks", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", i18n.language === "zh" ? "查询失败：" : "Query failed:" + `${e}`)
                reject(e)
            })
    })
}
/** 获取风险与漏洞的总数 通过RuntimeId */
export const apiQueryRisksTotalByRuntimeId: (RuntimeId: string) => Promise<QueryRisksResponse> = (RuntimeId) => {
    return new Promise((resolve, reject) => {
        const params: QueryRisksRequest = {
            ...defQueryRisksRequest,
            Pagination: {
                ...defQueryRisksRequest.Pagination,
                Page: 1,
                Limit: 1
            },
            RuntimeId
        }
        ipcRenderer
            .invoke("QueryRisks", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify(
                    "error",
                    i18n.language === "zh"
                        ? "apiQueryRisksTotalByRuntimeId 获取总数失败："
                        : "Failed to get total count in apiQueryRisksTotalByRuntimeId:" + `${e}`
                )
                reject(e)
            })
    })
}
/** 获取风险与漏洞的总数 通过RuntimeIds */
export const apiQueryRisksTotalByRuntimeIds: (RuntimeIds: string[]) => Promise<QueryRisksResponse> = (RuntimeIds) => {
    return new Promise((resolve, reject) => {
        const params: QueryRisksRequest = {
            ...defQueryRisksRequest,
            Pagination: {
                ...defQueryRisksRequest.Pagination,
                Page: 1,
                Limit: 1
            },
            RuntimeIds
        }
        ipcRenderer
            .invoke("QueryRisks", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify(
                    "error",
                    i18n.language === "zh"
                        ? "apiQueryRisksTotalByRuntimeIds 获取总数失败："
                        : "Failed to get total count in apiQueryRisksTotalByRuntimeIds:" + `${e}`
                )
                reject(e)
            })
    })
}
/**
 * @description QueryRisks 获取降序的增量数据
 */
export const apiQueryRisksIncrementOrderDesc: (params: QueryRisksRequest) => Promise<QueryRisksResponse> = (params) => {
    const newParams: QueryRisksRequest = {...params, UntilId: 0}
    return apiQueryRisks(newParams)
}
export interface NewRiskReadRequest {
    /**@deprecated */
    AfterId?: string
    /**传空数组代表全部已读 */
    Ids?: number[]
    Filter?: QueryRisksRequest
}
export const apiNewRiskRead: (query?: NewRiskReadRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("set-risk-info-read", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", i18n.language === "zh" ? "已读失败：" : "Mark as read failed:" + `${e}`)
                reject(e)
            })
    })
}

export interface DeleteRiskRequest {
    Id?: number
    Hash?: string
    Filter?: QueryRisksRequest
    Ids?: number[]
    DeleteAll?: boolean
    DeleteRepetition?: boolean
}
/** DeleteRisk */
export const apiDeleteRisk: (query?: DeleteRiskRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteRisk", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", i18n.language === "zh" ? "删除失败：" : "Delete failed:" + `${e}`)
                reject(e)
            })
    })
}
export interface ExportHtmlProps {
    htmlContent: string
    fileName: string
    data: Risk[]
}
/** export-risk-html */
export const apiExportHtml: (params: ExportHtmlProps) => Promise<string> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("export-risk-html", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", i18n.language === "zh" ? "导出失败：" : "Export failed:" + `${e}`)
                reject(e)
            })
    })
}

export interface QueryRiskTagsResponse {
    RiskTags: FieldGroup[]
}
export interface FieldGroup {
    Name: string
    Total: number
}
/** QueryRiskTags */
export const apiQueryRiskTags: () => Promise<QueryRiskTagsResponse> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryRiskTags")
            .then(resolve)
            .catch((e) => {
                yakitNotify(
                    "error",
                    i18n.language === "zh" ? "查询QueryRiskTags失败：" : "Query QueryRiskTags failed:" + `${e}`
                )
                reject(e)
            })
    })
}

/** QueryAvailableRiskType */
export const apiQueryAvailableRiskType: () => Promise<FieldName[]> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryAvailableRiskType")
            .then((res: Fields) => {
                const {Values = []} = res
                if (Values.length > 0) {
                    const data = Values.sort((a, b) => b.Total - a.Total)
                    resolve(data)
                } else {
                    resolve([])
                }
            })
            .catch((e) => {
                yakitNotify(
                    "error",
                    i18n.language === "zh" ? "查询QueryRiskTags失败：" : "Query QueryRiskTags failed:" + `${e}`
                )
                reject(e)
            })
    })
}

export interface SetTagForRiskRequest {
    Id: number
    Hash: string
    Tags: string[]
}
/** SetTagForRisk */
export const apiSetTagForRisk: (params: SetTagForRiskRequest) => Promise<SetTagForRiskRequest> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SetTagForRisk", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", i18n.language === "zh" ? "设置失败：" : "Setting failed:" + `${e}`)
                reject(e)
            })
    })
}

export interface RiskFieldGroupResponse {
    RiskIPGroup: FieldGroup[]
    RiskLevelGroup: FieldName[]
    RiskTypeGroup: FieldName[]
}
/** RiskFieldGroup */
export const apiRiskFieldGroup: () => Promise<RiskFieldGroupResponse> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("RiskFieldGroup")
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", i18n.language === "zh" ? "查询失败：" : "Query failed:" + `${e}`)
                reject(e)
            })
    })
}

export interface UploadRiskToOnlineRequest {
    Token: string
    ProjectName?: string
    Hash: string[]
}
/** RiskFeedbackToOnline */
export const apiRiskFeedbackToOnline: (params: UploadRiskToOnlineRequest) => Promise<unknown> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("RiskFeedbackToOnline", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", i18n.language === "zh" ? "反馈失败：" : "Feedback failed:" + `${e}`)
                reject(e)
            })
    })
}
