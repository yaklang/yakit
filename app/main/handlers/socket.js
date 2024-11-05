const {ipcMain} = require("electron")
const WebSocket = require("ws")
const url = require("url")
const {HttpSetting, USER_INFO} = require("../state")

const getSocketUrl = (inputUrl) => {
    // 解析 URL
    const parsedUrl = new url.URL(inputUrl)
    // 获取协议
    const protocol = parsedUrl.protocol
    // 根据协议转换为 WebSocket URL
    let wsUrl
    if (protocol === "https:") {
        wsUrl = "wss://" + parsedUrl.host + parsedUrl.pathname
    } else if (protocol === "http:") {
        wsUrl = "ws://" + parsedUrl.host + parsedUrl.pathname
    }
    return wsUrl
}

module.exports = (win, getClient) => {
    let ws = null
    let isConnect = false

    const onCloseSocket = () => {
        if (ws) {
            // 1000 是正常关闭的状态码
            ws.close(1000, "Normal closure")
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
        const socketUrl = `${getSocketUrl(HttpSetting.httpBaseURL)}api/message/ws`
        // console.log("USER_INFO--------------------", socketUrl, token)
        ws = new WebSocket(socketUrl, {
            headers: {
                Authorization: token // 替换为你的实际令牌
            }
        })

        // 处理 WebSocket 连接打开事件
        ws.on("open", () => {
            isConnect = true
            
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
            win.webContents.send("client-socket-error",error)
        })
    })

    // 关闭 WebSocket 服务器
    ipcMain.handle("socket-send", (e) => {
        if(ws){
            ws.send(data)
        }
    })

    // // 关闭 WebSocket 服务器
    ipcMain.handle("socket-close", (e) => {
        onCloseSocket()
    })
}
