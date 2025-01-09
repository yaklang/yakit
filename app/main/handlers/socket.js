const {ipcMain} = require("electron")
const WebSocket = require("ws")
const {HttpSetting, USER_INFO} = require("../state")

module.exports = (win, getClient) => {
    let ws = null
    let isConnect = false
    let reconnectCount = 0 // 添加重连计数器
    const MAX_RECONNECT_ATTEMPTS = 3 // 最大重连次数

    const onCloseSocket = () => {
        if (ws) {
            // 1000 是正常关闭的状态码
            ws.close(1000, "Normal closure")
            ws = null
        }
    }

    // 添加重连函数
    const reconnect = () => {
        if (reconnectCount < MAX_RECONNECT_ATTEMPTS) {
            reconnectCount++
            // console.log(`Attempting to reconnect... (${reconnectCount}/${MAX_RECONNECT_ATTEMPTS})`)
            // 延迟2秒后重连
            setTimeout(() => {
                ipcMain.emit("handle", null, "socket-start")
            }, 2000)
        } else {
            // console.log("Max reconnection attempts reached")
            win.webContents.send("client-socket-error", "Maximum reconnection attempts reached")
            reconnectCount = 0 // 重置重连计数
            onCloseSocket()
        }
    }

    // 连接 WebSocket 服务器，并在请求头中添加 Authorization
    ipcMain.handle("socket-start", (e) => {
        // 用户未登录时则拦截
        if (!USER_INFO.isLogin) return
        // 如若已经启动 则关闭后重启
        if (isConnect && ws) {
            onCloseSocket()
        }
        const {token} = USER_INFO
        const socketUrl = `${HttpSetting.wsBaseURL}api/ws`
        // console.log("USER_INFO--------------------", socketUrl, token)
        ws = new WebSocket(socketUrl, {
            headers: {
                Authorization: token // 替换为你的实际令牌
            }
        })

        // 处理 WebSocket 连接打开事件
        ws.on("open", () => {
            isConnect = true
            reconnectCount = 0 // 连接成功时重置重连计数
            win.webContents.send("client-socket-open")
        })

        // 处理接收到的消息
        ws.on("message", (data) => {
            // 在渲染端根据type区分 将其发往不同的页面
            win.webContents.send("client-socket-message", data)
        })

        // 处理连接关闭事件
        ws.on("close", () => {
            isConnect = false
            win.webContents.send("client-socket-close")
        })

        // 处理连接错误事件
        ws.on("error", (error) => {
            isConnect = false
            // 错误时 三次重连失败后关闭
            reconnect()
        })
    })

    // 发送 WebSocket 信息
    ipcMain.handle("socket-send", (e, data) => {
        if (ws) {
            // 将对象转换为 JSON 字符串
            const dataString = JSON.stringify(data)
            ws.send(dataString)
        }
    })

    // 关闭 WebSocket 服务器
    ipcMain.handle("socket-close", (e) => {
        onCloseSocket()
    })
}
