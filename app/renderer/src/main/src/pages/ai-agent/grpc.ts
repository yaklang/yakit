import {APIFunc, APIOptionalFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {
    AIEventDeleteRequest,
    AIEventQueryRequest,
    AIEventQueryResponse,
    AITaskDeleteRequest,
    ExportAILogsRequest,
    ExportAILogsResponse,
    GetRandomAIMaterialsRequest,
    GetRandomAIMaterialsResponse
} from "../ai-re-act/hooks/grpcApi"
import {DbOperateMessage} from "@/pages/layout/mainOperatorContent/utils"
import {
    AIForge,
    AIForgeFilter,
    GetAIForgeRequest,
    QueryAIFocusRequest,
    QueryAIFocusResponse,
    QueryAIForgeRequest,
    QueryAIForgeResponse
} from "./type/forge"
import {YakQueryHTTPFlowResponse} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {AIChatQSData, AIChatQSDataTypeEnum} from "../ai-re-act/hooks/aiRender"
import {genBaseAIChatData, isToolExecStream} from "../ai-re-act/hooks/utils"
import {Uint8ArrayToString} from "@/utils/str"
import {convertNodeIdToVerbose} from "../ai-re-act/hooks/defaultConstant"

const {ipcRenderer} = window.require("electron")

/**
 * @name 查询AI事件
 * - 查执行工具的 call_tool 和 tool_stdout
 */
export const grpcQueryAIEvent: APIFunc<AIEventQueryRequest, AIEventQueryResponse> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryAIEvent", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询QueryAIEvent失败:" + e)
                reject(e)
            })
    })
}

/**
 * @name 查询工具详情前端显示数据
 * - 查执行工具的 call_tool 和 tool_stdout
 */
export const grpcQueryAIToolDetails: APIFunc<AIEventQueryRequest, AIChatQSData[]> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        grpcQueryAIEvent(param)
            .then((res: AIEventQueryResponse) => {
                const {Events} = res
                const list: AIChatQSData[] = []
                Events.filter((ele) => {
                    if (ele.Type === AIChatQSDataTypeEnum.STREAM && isToolExecStream(ele.NodeId)) return true
                    if (ele.Type === AIChatQSDataTypeEnum.TOOL_CALL_RESULT) return true
                    return false
                }).forEach((item) => {
                    let ipcContent = ""
                    let ipcStreamDelta = ""
                    try {
                        ipcContent = Uint8ArrayToString(item.Content) || ""
                        ipcStreamDelta = Uint8ArrayToString(item.StreamDelta) || ""
                    } catch (error) {}
                    const current: AIChatQSData = {
                        ...genBaseAIChatData(item),
                        chatType:"reAct", // 随机写的，后面需要开发UI时通过传入参数设置
                        type: AIChatQSDataTypeEnum.STREAM,
                        data: {
                            CallToolID: item.CallToolID,
                            NodeId: item.NodeId,
                            NodeIdVerbose: item.NodeIdVerbose || convertNodeIdToVerbose(item.NodeId),
                            content: ipcContent + ipcStreamDelta,
                            ContentType: item.ContentType,
                            EventUUID: item.EventUUID,
                            status: "end"
                        }
                    }
                    list.push(current)
                })
                resolve(list)
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询 grpcQueryAIToolDetails 失败:" + e)
                reject(e)
            })
    })
}

/** @name 删除 AI 事件（支持 ClearAll） */
export const grpcDeleteAIEvent: APIFunc<AIEventDeleteRequest, DbOperateMessage> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteAIEvent", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除DeleteAIEvent失败:" + e)
                reject(e)
            })
    })
}
/** @name 删除 AI 任务（支持 ClearAll） */
export const grpcDeleteAITask: APIFunc<AITaskDeleteRequest, DbOperateMessage> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteAITask", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除DeleteAITask失败:" + e)
                reject(e)
            })
    })
}
// #endregion

// #region AI-Forge 相关 grpc 接口
/** @name 创建 AI-Forge */
export const grpcCreateAIForge: APIFunc<AIForge, {CreateID: number}> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreateAIForge", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "创建AI-Forge失败:" + e)
                reject(e)
            })
    })
}
/** @name 编辑 AI-Forge */
export const grpcUpdateAIForge: APIFunc<AIForge, undefined> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateAIForge", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "修改AI-Forge失败:" + e)
                reject(e)
            })
    })
}
/** @name 删除 AI-Forge */
export const grpcDeleteAIForge: APIFunc<AIForgeFilter, undefined> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteAIForge", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除AI-Forge失败:" + e)
                reject(e)
            })
    })
}
/** @name 查询 AI-Forge 列表 */
export const grpcQueryAIForge: APIFunc<QueryAIForgeRequest, QueryAIForgeResponse> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryAIForge", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询AI-Forge失败:" + e)
                reject(e)
            })
    })
}
/** @name 查询 AI-Forge 单个详情 */
export const grpcGetAIForge: APIFunc<GetAIForgeRequest, AIForge> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("GetAIForge", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcGetAIForge 查询Forge详情失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取 HTTP 流列表 */
export const grpcQueryHTTPFlows: APIFunc<YakQueryHTTPFlowRequest, YakQueryHTTPFlowResponse> = async (
    param,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryHTTPFlows", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcQueryHTTPFlows 查询HTTP流失败:" + e)
                reject(e)
            })
    })
}
// #endregion

export const grpcGetRandomAIMaterials: APIFunc<GetRandomAIMaterialsRequest, GetRandomAIMaterialsResponse> = (
    param,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("GetRandomAIMaterials", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询 GetRandomAIMaterials 失败:" + e)
                reject(e)
            })
    })
}

export const grpcExportAILogs: APIFunc<ExportAILogsRequest, ExportAILogsResponse> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("ExportAILogs", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "导出 AI 日志失败:" + e)
                reject(e)
            })
    })
}

export const grpcQueryAIFocus: APIOptionalFunc<QueryAIFocusRequest, QueryAIFocusResponse> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryAIFocus", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "QueryAIFocus 查询详情失败:" + e)
                reject(e)
            })
    })
}
