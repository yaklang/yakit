import {APIOptionalFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {AIAgentServerInfo} from "./aiAgentType"

const {ipcRenderer} = window.require("electron")

/** @name 创建mcp服务器 */
export const grpcCreateMCPServer: APIOptionalFunc<AIAgentServerInfo, string> = (info, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("create-mcp-client", info)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "创建 mcp 服务器失败:" + e)
                reject(e)
            })
    })
}

interface MCPServerConnectRes {
    tools: {tools: any[]}
    resourcesTemplates: {resourcesTemplates: any[]}
}
/** @name 连接mcp服务器 */
export const grpcConnectMCPServer: APIOptionalFunc<string, MCPServerConnectRes> = (token, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("connect-mcp-client", token)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "连接 mcp 服务器失败:" + e)
                reject(e)
            })
    })
}

/** @name 断开mcp服务器 */
export const grpcCloseMCPServer: APIOptionalFunc<string, string> = (token, hiddenError) => {
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
export const grpcDeleteMCPServer: APIOptionalFunc<string, string> = (token, hiddenError) => {
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
