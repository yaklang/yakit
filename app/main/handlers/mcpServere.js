const {ipcMain} = require("electron")
const {Client} = require("@modelcontextprotocol/sdk/client/index.js")
const {StdioClientTransport} = require("@modelcontextprotocol/sdk/client/stdio.js")
// 动态 import
async function newSSE(url) {
    const {SSEClientTransport} = await import("@modelcontextprotocol/sdk/client/sse.js")
    const uri = new URL(url)
    const transport = new SSEClientTransport(uri)
    return transport
}

// Verify Transport Parameter
const verifyTransport = (value) => {
    if (typeof value !== "object" || !value || !value.type) {
        return "invalid transport"
    }
    if (value.type === "sse") {
        if (!value.url || typeof value.url !== "string") {
            return "url must be a string"
        }
    }

    if (value.type === "stdio") {
        if (!value.command || typeof value.command !== "string") {
            return "command must be a string"
        }
        if ("args" in value && value.args) {
            if (!Array.isArray(value.args) || !value.args.every((item) => typeof item === "string")) {
                return "args must be an array of strings"
            }
        }
        if ("env" in value && value.env) {
            if (
                typeof value.env !== "object" ||
                Array.isArray(value.env) ||
                value.env === null ||
                !Object.values(value.env).every((v) => typeof v === "string")
            ) {
                return "env must be an object of strings"
            }
        }
        if ("cwd" in value && value.env && typeof value.cwd !== "string") {
            return "cwd must be a string"
        }
    }

    return ""
}

/**
 * @typedef {Object} ClientSetting
 * @property {string} id - 客户端唯一标识
 * @property {"sse" | "stdio"} type - 传输类型，"sse"或"stdio"
 * @property {string} [url] - SSE服务的URL地址（SSE传输类型时使用）
 * @property {string} [command] - 子进程执行命令（stdio传输类型时使用）
 * @property {string[]} [args] - 子进程命令行参数（stdio传输类型时使用）
 * @property {Record<string, string>} [env] - 子进程环境变量（stdio传输类型时使用）
 * @property {string} [cwd] - 子进程工作目录路径（stdio传输类型时使用）
 */
/**
 * @typedef {Object} ClientConfig
 * @property {Transport} transport - MCP传输层实例，负责底层通信协议的处理
 * @property {MCPClient} client - MCP客户端实例，提供与消息通信协议服务端的交互能力
 * @property {Boolean} link - 连接状态标识，true表示已建立有效连接
 * @property {ClientSetting} setting - 客户端配置信息，根据传输类型不同使用不同配置参数
 */
/**
 * @name client pool
 * @type {Map<string, ClientConfig>}
 */
const clients = new Map()

// create a new mcp client
const createClient = (params, s) => {
    const {id, ...rest} = params
    return new Promise(async (resolve, reject) => {
        const result = verifyTransport(rest)
        if (result) {
            return reject(result)
        }
        if (clients.has(id)) {
            return reject("client already exist")
        }

        try {
            const client = new Client(
                {
                    name: "mcp-client",
                    version: "1.0.0"
                },
                {
                    capabilities: {
                        prompts: {},
                        resources: {},
                        tools: {}
                    }
                }
            )
            clients.set(id, {transport: null, client, link: false, setting: params})
            resolve("")
        } catch (error) {
            return reject(error)
        }
    })
}

// connect mcp client
const connectClient = (token) => {
    return new Promise(async (resolve, reject) => {
        if (!clients.has(token)) {
            return reject("client no exist")
        }

        const {client, link, setting} = clients.get(token)

        if (link) {
            return reject("client already connected")
        }

        try {
            const {url, id, type, ...rest} = setting
            const transport = setting.type === "sse" ? await newSSE(url) : new StdioClientTransport({...rest})
            await client.connect(transport)
            // tools
            const {tools} = (await client.listTools()) || {}
            // resourcesTemplates
            const {resourceTemplates} = (await client.listResourceTemplates()) || {}

            clients.set(token, {...clients.get(token), transport: transport, link: true})
            resolve({tools: tools, resourceTemplates: resourceTemplates})
        } catch (error) {
            reject(error)
        }
    })
}

// close mcp client
const closeClient = (token) => {
    return new Promise(async (resolve, reject) => {
        if (!clients.has(token)) {
            return reject("client no exist")
        }

        const {client, link} = clients.get(token)
        if (!link) {
            return reject("client already closed")
        }

        try {
            await client.close()
            clients.set(token, {...clients.get(token), link: false})
            resolve("")
        } catch (error) {
            reject(error)
        }
    })
}

// delete mcp client
const deleteClient = (token) => {
    return new Promise(async (resolve, reject) => {
        if (!clients.has(token)) {
            return reject("client no exist")
        }

        const {client, link} = clients.get(token)
        try {
            if (link) await client.close()
            clients.delete(token)
            resolve("")
        } catch (error) {
            reject(error)
        }
    })
}

// call-tool
const haneleCallTool = (token, request) => {
    return new Promise(async (resolve, reject) => {
        if (!clients.has(token)) {
            return reject("client no exist")
        }

        const {client, link} = clients.get(token)

        if (!link) {
            return reject("Client is not connected")
        }

        try {
            // const ans = await
            console.log("request", request)
            client
                .callTool(request, undefined, {
                    onprogress: (progress) => {
                        console.log("onprogress", progress)
                    }
                })
                .then((res) => {
                    console.log("ans", res)
                    resolve(res)
                })
                .catch(reject)
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = (win, getClient) => {
    ipcMain.handle("create-mcp-client", async (e, params) => {
        return await createClient(params)
    })
    ipcMain.handle("connect-mcp-client", async (e, token) => {
        return await connectClient(token)
    })
    ipcMain.handle("close-mcp-client", async (e, token) => {
        return await closeClient(token)
    })
    ipcMain.handle("delete-mcp-client", async (e, token) => {
        return await deleteClient(token)
    })

    ipcMain.handle("callTool-mcp-client", async (e, token, request) => {
        return await haneleCallTool(token, request)
    })

    let yakMCPStream = null
    ipcMain.handle("cancel-yak-mcp-server", async () => {
        if (yakMCPStream) {
            yakMCPStream.cancel()
            yakMCPStream = null
        }
    })
    ipcMain.handle("start-yak-mcp-server", async (e) => {
        if (yakMCPStream) {
            return Promise.reject("stream already exist")
        }
        yakMCPStream = getClient().StartSSEMCP({Tools: [], Resources: [], DisableTools: [], DisableResources: []})
        yakMCPStream.on("data", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("yak-mcp-server-send", e)
        })
        yakMCPStream.on("error", (e) => {
            // if (!win) {
            //     return
            // }
            // win.webContents.send("yak-mcp-server-error", e)
        })
        yakMCPStream.on("end", () => {
            if (yakMCPStream) {
                yakMCPStream.cancel()
                yakMCPStream = null
            }
            // if (!win) {
            //     return
            // }
            // win.webContents.send("yak-mcp-server-end")
        })
    })
}
