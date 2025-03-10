const {ipcMain} = require("electron")
const {Client} = require("@modelcontextprotocol/sdk/client/index.js")
const {StdioClientTransport} = require("@modelcontextprotocol/sdk/client/stdio.js")
// 动态 import
async function sse(params) {
    const {SSEClientTransport} = await import("@modelcontextprotocol/sdk/client/sse.js")
    const transport = new SSEClientTransport({...params})
    return transport
}

// Verify Transport Parameter
/**
 * type StdioServerParameters = {
 *     command: string;
 *     args?: string[];
 *     env?: Record<string, string>;
 *     cwd?: string;
 * }
 */
const verifyTransport = (value) => {
    if (typeof value !== "object" || !value || !value.type) {
        return "invalid transport"
    }
    if (value.type === "sse") {
        if (typeof value.url !== "string") {
            return "url must be a string"
        }
    }

    if (value.type === "stdio") {
        if (typeof value.command !== "string") {
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

// client pool
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
            return reject("client already exists")
        }

        const transport = rest.type === "sse" ? await sse({url: rest.url}) : new StdioClientTransport({...rest})
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

        clients.set(id, {transport, client, link: false})
        resolve("mcp client created")
    })
}

// connect mcp client
const connectClient = (token) => {
    return new Promise(async (resolve, reject) => {
        if (!clients.has(token)) {
            return reject("client no exists")
        }

        const {transport, client, link} = clients.get(token)
        if (link) {
            return reject("client already connected")
        }

        await client.connect(transport)

        try {
            // tools
            const tools = await client.listTools()
            // resourcesTemplates
            const resourcesTemplates = await client.listResourceTemplates()

            clients.set(token, {...clients.get(token), link: true})
            resolve({tools, resourcesTemplates})
        } catch (error) {
            reject(error)
        }
    })
}

// close mcp client
const closeClient = (token) => {
    return new Promise(async (resolve, reject) => {
        if (!clients.has(token)) {
            return Promise.reject("client no exists")
        }

        const {transport, client, link} = clients.get(token)
        if (!link) {
            return Promise.reject("client already closed")
        }

        await client.close()
        clients.delete(token)
        resolve()
    })
}

// delete mcp client
const deleteClient = (token) => {
    return new Promise(async (resolve, reject) => {
        if (!clients.has(token)) {
            return Promise.reject("client no exists")
        }

        const {transport, client, link} = clients.get(token)
        if (link) {
            return Promise.reject("client already connected")
        }

        clients.delete(token)
        resolve()
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
}
