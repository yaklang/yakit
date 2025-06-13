import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {RenderMCPClientInfo} from "./aiAgentType"
import {MCPCallToolRequest, MCPClientResource} from "./type/mcpClient"

const {ipcRenderer} = window.require("electron")

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
