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
const {handleIPCError} = require("../handleIPC")
const handlerHelper = require("./handleStreamWithContext")

/**
 * @typedef {Object} ClientConfig
 * @property {MCPClient} client - MCP客户端实例，提供与消息通信协议服务端的交互能力
 * @property {Boolean} link - 连接状态标识，true表示已建立有效连接
 */
/**
 * @name client pool
 * @type {Map<string, ClientConfig>}
 */
const clients = new Map()

/**
 * @typedef {Object} ErrorCount
 * @property {NodeJS.Timeout} timer - 取消错误计数的定时器
 * @property {Number} count - 报错次数
 */
/**
 * @name Client-Error-Count
 * @type {Map<string, ErrorCount>}
 * @description 连续报错5次后，默认关闭客户端，报错间隔时间为10秒，10秒重置报错次数
 */
const errorCount = new Map()
// client error handling
const handleClientError = (win, token, error) => {
    const info = errorCount.get(token)
    if (info) {
        const {timer, count} = info
        if (count >= 5) {
            clearTimeout(timer)
            deleteClient(token)
            closeClient(token)
            if (win) win.webContents.send("mcp-client-error", token, handleIPCError(error))
        } else {
            clearTimeout(timer)
            errorCount.set(token, {
                timer: setTimeout(() => errorCount.delete(token), 10000),
                count: count + 1
            })
        }
    } else {
        errorCount.set(token, {
            timer: setTimeout(() => errorCount.delete(token), 10000),
            count: 1
        })
    }
}

// connect mcp client
const connectClient = (win, setting) => {
    return new Promise(async (resolve, reject) => {
        const info = clients.get(setting.id) || {}
        if (info && info.link) {
            try {
                const version = await info.client.getServerVersion()
                if (version && version.name) {
                    // tools
                    const {tools} = (await client.listTools()) || {}
                    // resourcesTemplates
                    const {resourceTemplates} = (await client.listResourceTemplates()) || {}
                    resolve({tools: tools, resourceTemplates: resourceTemplates})
                    return
                }
            } catch (error) {}
        }

        try {
            const {url, id, type, ...rest} = setting
            const transport = setting.type === "sse" ? await newSSE(url) : new StdioClientTransport({...rest})
            let client = info.client
            if (!client) {
                client = new Client(
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
            }
            await client.connect(transport)

            client.onerror = (error) => {
                handleClientError(win, id, error)
            }
            client.onclose = () => {
                // 客户端被关闭后，更新连接状态
                if (clients.has(id)) {
                    clients.set(id, {...clients.get(id), link: false})
                }
            }

            // tools
            const {tools} = (await client.listTools()) || {}
            // resourcesTemplates
            const {resourceTemplates} = (await client.listResourceTemplates()) || {}

            clients.set(id, {client: client, link: true})
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

/**
 * @name task pool, 任务通道池
 * @type {Map<string, AbortController>}
 */
const taskPools = new Map()
// 生成信号控制器
const newAbortController = (token) => {
    const controller = new AbortController()
    taskPools.set(token, controller)
    return controller
}

// call-tool
const handleCallTool = (win, tokens, request) => {
    return new Promise(async (resolve, reject) => {
        const {clientID, taskID} = tokens
        const server = clients.get(clientID)
        if (!server) {
            return reject("client no exist")
        }
        if (taskPools.has(taskID)) {
            return reject("client is busy")
        }
        if (!server.link) {
            return reject("Client is not connected")
        }

        try {
            const signal = newAbortController(taskID).signal
            console.log("request", request)
            server.client
                .callTool(request, undefined, {
                    onprogress: (progress) => {
                        if (win && progress) {
                            win.webContents.send(`mcp-${taskID}-progress`, progress)
                        }
                    },
                    signal: signal
                })
                .then((res) => {
                    if (win && res) {
                        win.webContents.send(`mcp-${taskID}-end`, res)
                    }
                })
                .catch((err) => {
                    if (win && err) {
                        win.webContents.send(`mcp-${taskID}-error`, handleIPCError(err))
                    }
                })
                .finally(() => {
                    taskPools.has(taskID) && taskPools.delete(taskID)
                })
            resolve("")
        } catch (error) {
            reject(error)
        }
    })
}
// cancel call-tool
const handleCancelCallTool = (token) => {
    return new Promise(async (resolve, reject) => {
        const task = taskPools.get(token)
        if (!task) {
            return reject("task no exist")
        }
        task.abort()
        resolve("")
    })
}

module.exports = (win, getClient) => {
    ipcMain.handle("connect-mcp-client", async (e, param) => {
        return await connectClient(win, param)
    })
    ipcMain.handle("close-mcp-client", async (e, token) => {
        return await closeClient(token)
    })
    ipcMain.handle("delete-mcp-client", async (e, token) => {
        return await deleteClient(token)
    })

    ipcMain.handle("callTool-mcp-client", async (e, token, request) => {
        return await handleCallTool(win, token, request)
    })
    ipcMain.handle("cancel-callTool-mcp-client", async (e, token) => {
        return await handleCancelCallTool(token)
    })

    let aiChatStreamPool = new Map()
    // 开始执行 AI Agent 聊天
    ipcMain.handle("start-ai-agent-chat", async (e, token, params) => {
        let stream = getClient().StartAITask()
        handlerHelper.registerHandler(win, stream, aiChatStreamPool, token)
        try {
            stream.write({...params})
        } catch (error) {
            throw new Error(error)
        }
    })
    // 聊天过程发送 AI Agent 聊天消息
    ipcMain.handle("send-ai-agent-chat", async (e, token, params) => {
        const currentStream = aiChatStreamPool.get(token)
        if (!currentStream) {
            return Promise.reject("stream no exist")
        }
        try {
            currentStream.write({...params})
        } catch (error) {
            throw new Error(error)
        }
    })
    // 取消 AI Agent 聊天F
    ipcMain.handle("cancel-ai-agent-chat", handlerHelper.cancelHandler(aiChatStreamPool))

    const asyncGetAIToolList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAIToolList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    /**获取工具列表 */
    ipcMain.handle("GetAIToolList", async (e, param) => {
        return await asyncGetAIToolList(param)
    })

    const asyncToggleAIToolFavorite = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ToggleAIToolFavorite(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    /**获取工具列表 */
    ipcMain.handle("ToggleAIToolFavorite", async (e, param) => {
        return await asyncToggleAIToolFavorite(param)
    })
}
