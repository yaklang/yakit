import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {AIForge, AIForgeFilter, GetAIForgeRequest, QueryAIForgeRequest, QueryAIForgeResponse} from "./AIForge/type"
import {AIEventQueryRequest, AIEventQueryResponse} from "../ai-re-act/hooks/grpcApi"

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
// #endregion
