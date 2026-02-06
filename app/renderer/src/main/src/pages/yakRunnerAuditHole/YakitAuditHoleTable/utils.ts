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
import {DbOperateMessage} from "@/pages/layout/mainOperatorContent/utils"
import {grpcGetAIForge} from "@/pages/ai-agent/grpc"
import {GetAIForgeRequest} from "@/pages/ai-agent/type/forge"
import {JSONParseLog, JSONParseLogOption} from "@/utils/tool"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {ReActChatEventEnum} from "@/pages/ai-agent/defaultConstant"
import {YakParamProps} from "@/pages/plugins/pluginsType"
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
    TaskName: string
}

export interface GetSSARiskDisposalResponse {
    Data: SSARiskDisposalData[]
}

export const apiGetSSARiskDisposal: (params: {
    RiskId?: number
    RiskHash?: string
}) => Promise<GetSSARiskDisposalResponse> = (params) => {
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
    Filter: SSARiskDisposalsFilter
}

export interface DeleteSSARiskDisposalsResponse {
    Message: DbOperateMessage
}

export const apiDeleteSSARiskDisposals: (
    params: DeleteSSARiskDisposalsRequest
) => Promise<DeleteSSARiskDisposalsResponse> = (params) => {
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

export interface GetSSARiskFieldGroupRequest {
    Filter: SSARisksFilter
}

export interface GetSSARiskFieldGroupExResponse {
    FileField: FieldGroup[]
    SeverityField: FieldName[]
    RiskTypeField: FieldName[]
}
/** GetSSARiskFieldGroupEx */
export const apiGetSSARiskFieldGroupEx: (
    params?: GetSSARiskFieldGroupRequest
) => Promise<GetSSARiskFieldGroupExResponse> = (params = {Filter:{}}) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSSARiskFieldGroupEx", params)
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

/** 导出SSA风险请求参数 */
export interface ExportSSARiskRequest {
    Filter: SSARisksFilter
    TargetPath: string
    WithDataFlowPath?: boolean
    WithFileContent?: boolean
}

/** 导出SSA风险响应 */
export interface ExportSSARiskResponse {
    Process: number
    Verbose: string
    ExportFilePath?: string
}

/** 导入SSA风险请求参数 */
export interface ImportSSARiskRequest {
    InputPath: string
}

/** 导入SSA风险响应 */
export interface ImportSSARiskResponse {
    Process: number
    Verbose: string
}

/** ExportSSARisk - 导出SSA风险数据到JSON文件 */
export const apiExportSSARisk = (params: ExportSSARiskRequest, token: string) => {
    return ipcRenderer.invoke("ExportSSARisk", params, token)
}

/** ImportSSARisk - 从JSON文件导入SSA风险数据 */
export const apiImportSSARisk = (params: ImportSSARiskRequest, token: string) => {
    return ipcRenderer.invoke("ImportSSARisk", params, token)
}

/** 取消导出SSA风险 */
export const cancelExportSSARisk = (token: string) => {
    return ipcRenderer.invoke("cancel-ExportSSARisk", token)
}

/** 取消导入SSA风险 */
export const cancelImportSSARisk = (token: string) => {
    return ipcRenderer.invoke("cancel-ImportSSARisk", token)
}

export const openAIForge = (params: {
    query: GetAIForgeRequest
    handleParamsUIConfig: (v: YakParamProps) => YakParamProps
    jsonParseLogParams: JSONParseLogOption
}) => {
    const {query, handleParamsUIConfig, jsonParseLogParams} = params
    grpcGetAIForge(query, true)
        .then((res) => {
            if (!res) {
                yakitNotify("warning", "暂无ForgeName匹配项")
                return
            }
            if (!res.ParamsUIConfig) {
                yakitNotify("warning", "暂无ParamsUIConfig配置项")
                return
            }
            let paramsUIConfig: YakParamProps = JSONParseLog(res.ParamsUIConfig, jsonParseLogParams)
            paramsUIConfig = handleParamsUIConfig(paramsUIConfig)
            let newRes = {...res, ParamsUIConfig: JSON.stringify(paramsUIConfig)}
            emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_Agent}))
            setTimeout(() => {
                emiter.emit(
                    "onReActChatEvent",
                    JSON.stringify({
                        type: ReActChatEventEnum.OPEN_FORGE_FORM,
                        params: {value: newRes},
                        useForge: true
                    })
                )
            }, 100)
        })
        .catch((e) => {
            yakitNotify("error", "匹配ForgeName异常:" + e)
        })
}
