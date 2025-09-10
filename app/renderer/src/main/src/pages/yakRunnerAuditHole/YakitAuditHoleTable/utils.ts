import {yakitNotify} from "@/utils/notification"
import {
    DeleteSSARisksRequest,
    QueryNewSSARisksRequest,
    QueryNewSSARisksResponse,
    QuerySSARisksRequest,
    QuerySSARisksResponse,
    SSARisksFilter
} from "./YakitAuditHoleTableType"
import {FieldGroup} from "@/pages/risks/YakitRiskTable/utils"
import {FieldName} from "@/pages/risks/RiskTable"
import { DbOperateMessage } from "@/pages/layout/mainOperatorContent/utils"
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

export interface CreateSSARiskDisposalsRequest {
    RiskIds: number[]
    Status: string
    Comment: string
}
/** CreateSSARiskDisposals */
export const apiCreateSSARiskDisposals: (params: CreateSSARiskDisposalsRequest) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("CreateSSARiskDisposals", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `设置失败: ${e}`)
                reject(e)
            })
    })
}

export interface SSARiskDisposalData {
    Id: number
    Status: string
    Comment: string
    CreatedAt: number
    UpdatedAt: number
    RiskId: number
}

export interface GetSSARiskDisposalResponse {
    Data: SSARiskDisposalData[]
}

export const apiGetSSARiskDisposal: (params: {RiskId?: number, RiskHash?: string}) => Promise<GetSSARiskDisposalResponse> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSSARiskDisposal", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `获取失败: ${e}`)
                reject(e)
            })
    })
}

export interface SSARiskDisposalsFilter {
    ID?: number[]
    Status?: string[]
    RiskId?: number[]
    Search?: string
}

export interface DeleteSSARiskDisposalsRequest {
    Filter:SSARiskDisposalsFilter
}

export interface DeleteSSARiskDisposalsResponse {
    Message: DbOperateMessage
}

export const apiDeleteSSARiskDisposals: (params: DeleteSSARiskDisposalsRequest) => Promise<DeleteSSARiskDisposalsResponse> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteSSARiskDisposals", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `删除失败: ${e}`)
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
            .invoke("NewSSARiskRead", {Filter: query})
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `已读失败: ${e}`)
                reject(e)
            })
    })
}

export interface GroupTableColumnRequest {
    DatabaseName: "Project" | "Profile" | "SSA"
    TableName: string
    ColumnName: string
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

export interface SSARiskFeedbackToOnlineRequest {
    Token: string
    Filter: SSARisksFilter
}
/** SSARiskFeedbackToOnline */
export const apiSSARiskFeedbackToOnline: (params: SSARiskFeedbackToOnlineRequest) => Promise<unknown> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SSARiskFeedbackToOnline", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `反馈失败: ${e}`)
                reject(e)
            })
    })
}

/** QueryNewSSARisks */
export const apiQueryNewSSARisks: (query?: QueryNewSSARisksRequest) => Promise<QueryNewSSARisksResponse> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryNewSSARisks", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `查询失败: ${e}`)
                reject(e)
            })
    })
}
