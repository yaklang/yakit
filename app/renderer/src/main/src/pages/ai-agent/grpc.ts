import {APIOptionalFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {RenderMCPClientInfo} from "./aiAgentType"
import {MCPClientResource} from "./mcpClient/type"

const {ipcRenderer} = window.require("electron")

/** @name 创建mcp服务器 */
export const grpcCreateMCPClient: APIOptionalFunc<RenderMCPClientInfo, string> = (info, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("create-mcp-client", info)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "创建mcp服务器失败:" + e)
                reject(e)
            })
    })
}

/** @name 连接mcp服务器 */
export const grpcConnectMCPClient: APIOptionalFunc<string, MCPClientResource> = (token, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("connect-mcp-client", token)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "连接mcp服务器失败:" + e)
                reject(e)
            })
    })
}

/** @name 断开mcp服务器 */
export const grpcCloseMCPClient: APIOptionalFunc<string, string> = (token, hiddenError) => {
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
export const grpcDeleteMCPClient: APIOptionalFunc<string, string> = (token, hiddenError) => {
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
