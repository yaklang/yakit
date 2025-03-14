import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {RenderMCPClientInfo} from "./aiAgentType"
import {MCPClientResource} from "./mcpClient/type"

const {ipcRenderer} = window.require("electron")

/** @name 创建mcp服务器 */
export const grpcCreateMCPClient: APIFunc<RenderMCPClientInfo, string> = (info, hiddenError) => {
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
export const grpcConnectMCPClient: APIFunc<string, MCPClientResource> = (token, hiddenError) => {
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
export const grpcMCPClientCallTool: APIFunc<string, any> = (token, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("callTool-mcp-client", token, {
                name: "port_scan",
                arguments: {
                    targets: ["127.0.0.1"],
                    ports: ["1 - 65535"],
                    mode: "all",
                    proto: ["tcp"],
                    active: true,
                    fingerprintMode: "all",
                    saveToDB: true
                }
            })
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", " 执行CallTool失败:" + e)
                reject(e)
            })
    })
}

/** @name 启动默认mcp服务器 */
export const grpcStartYakMcp: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("start-yak-mcp-server")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "启动引擎内置 mcp 服务器失败:" + e)
                reject(e)
            })
    })
}

/** @name 断开默认mcp服务器 */
export const grpcCancelYakMcp: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("cancel-yak-mcp-server")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "关闭引擎内置 mcp 服务器失败:" + e)
                reject(e)
            })
    })
}
