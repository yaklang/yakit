import {yakitNotify} from "@/utils/notification"
import {QueryRisksRequest, QueryRisksResponse} from "./YakitRiskTableType"
import {Risk} from "../schema"

const {ipcRenderer} = window.require("electron")
/** QueryRisks */
export const apiQueryRisks: (query?: QueryRisksRequest) => Promise<QueryRisksResponse> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryRisks", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `查询失败: ${e}`)
                reject(e)
            })
    })
}

export interface NewRiskReadRequest {
    AfterId?: string
    Ids: number[]
}
export const apiNewRiskRead: (query?: NewRiskReadRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("set-risk-info-read", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `已读失败: ${e}`)
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
                yakitNotify("error", `删除失败: ${e}`)
                reject(e)
            })
    })
}
export interface ExportHtmlProps {
    htmlContent: string
    fileName: string
    data: Risk[]
}
/** DeleteRisk */
export const apiExportHtml: (params: ExportHtmlProps) => Promise<string> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("export-risk-html", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `导出失败: ${e}`)
                reject(e)
            })
    })
}
