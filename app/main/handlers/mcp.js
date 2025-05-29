const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext")

module.exports = (win, getClient) => {
    // GetToolSetList 获取工具集列表和资源集列表
    const asyncGetToolSetList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetToolSetList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("get-mcptool-list", async (e, params) => {
        return await asyncGetToolSetList(params)
    })

    // StartMcpServer 启动 MCP 服务器
    const streamStartMcpServerMap = new Map()
    ipcMain.handle("cancel-start-mcp-serve", handlerHelper.cancelHandler(streamStartMcpServerMap))
    ipcMain.handle("start-mcp-serve", (e, params, token) => {
        // 检查是否已有相同token的stream
        if (streamStartMcpServerMap.has(token)) {
            const stream = streamStartMcpServerMap.get(token)
            stream.write(params)
            return
        }
        
        // 创建新的stream并注册
        const stream = getClient().StartMcpServer(params)
        handlerHelper.registerHandler(win, stream, streamStartMcpServerMap, token)
    })
}
