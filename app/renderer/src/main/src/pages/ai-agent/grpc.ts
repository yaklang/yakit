import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {RenderMCPClientInfo} from "./aiAgentType"
import {MCPCallToolRequest, MCPClientResource} from "./type/mcpClient"
import {AIEventQueryRequest, AIEventQueryResponse} from "./type/aiChat"
import {AIForge, AIForgeFilter, QueryAIForgeRequest, QueryAIForgeResponse} from "./AIForge/type"

const {ipcRenderer} = window.require("electron")

// #region 本地 MCP 服务器相关 grpc 接口
/** @name 连接mcp服务器 */
export const grpcConnectMCPClient: APIFunc<RenderMCPClientInfo, MCPClientResource> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("connect-mcp-client", param)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "连接mcp服务器失败:" + e)
                reject(e)
            })
    })
}

/** @name 断开mcp服务器 */
export const grpcCloseMCPClient: APIFunc<string, string> = (token, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("close-mcp-client", token)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "关闭mcp服务器失败:" + e)
                reject(e)
            })
    })
}

/** @name 删除mcp服务器 */
export const grpcDeleteMCPClient: APIFunc<string, string> = (token, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("delete-mcp-client", token)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", " 删除mcp服务器失败:" + e)
                reject(e)
            })
    })
}

/** @name mcp服务器-执行callTool */
export const grpcMCPClientCallTool: APIFunc<MCPCallToolRequest, string> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        const {clientID, taskID, request} = params
        ipcRenderer
            .invoke("callTool-mcp-client", {clientID, taskID}, request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", " 执行CallTool失败:" + e)
                reject(e)
            })
    })
}

/** @name mcp服务器-停止执行callTool */
export const grpcMCPClientCancelCallTool: APIFunc<string, string> = (token, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("cancel-callTool-mcp-client", token)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", " 停止CallTool失败:" + e)
                reject(e)
            })
    })
}

/**@name 查询AI事件 */
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
export const grpcGetAIForge: APIFunc<number, AIForge> = (param, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        const id = Number(param) || 0
        if (!id) {
            if (!hiddenError) yakitNotify("error", `获取Forge详情失败: ID(${param})数据异常`)
            reject(new Error("`获取Forge详情失败: ID(${param})数据异常`"))
            return
        }

        ipcRenderer
            .invoke("GetAIForge", {ID: id})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询Forge详情失败:" + e)
                reject(e)
            })
    })
}
// #endregion
