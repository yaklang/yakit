const {ipcMain, BrowserWindow} = require("electron")
const path = require("path")
const crypto = require("crypto")

// === 日志颜色映射 ===
const levelColorMap = {
    default: "\x1b[38;2;136;98;248m", // #8862F8 紫色
    info: "\x1b[38;2;40;192;142m", // #28C08E 绿色
    warn: "\x1b[38;2;40;192;142m", // #28C08E 绿色
    error: "\x1b[38;2;241;87;87m" // #F15757 红色
}

// === 常量配置 ===
const MAX_LOG_COUNT = 50

// === 工具函数 ===
function formatLogLine(level, timestamp, message) {
    const key = typeof level === "string" ? level.toLowerCase() : "default"
    const color = levelColorMap[key] || levelColorMap.default
    return `${color}[${level.toUpperCase()}]\x1b[0m ${timestamp} ${message}\n`
}

function safeSend(win, channel, data) {
    if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data)
    }
}

function trimMap(map, keepCount = MAX_LOG_COUNT) {
    if (map.size <= keepCount) return
    const entries = Array.from(map.entries()).slice(-keepCount)
    map.clear()
    for (const [k, v] of entries) map.set(k, v)
}

// === 主模块 ===
const aiChatLogMap = new Map()
let childWindow = null

module.exports = {
    register: (mainWindow, getClient) => {
        // === 写入单条日志 ===
        ipcMain.handle("forward-ai-chat-log-data", (event, data) => {
            if (!data || typeof data !== "object") return
            const {level, message, timestamp} = data

            const logLine = formatLogLine(level, timestamp, message)
            aiChatLogMap.set(crypto.randomUUID(), logLine)

            safeSend(childWindow, "ai-chat-log-data", logLine)
        })

        // === 清空日志 ===
        ipcMain.handle("clear-ai-chat-log-data", () => {
            aiChatLogMap.clear()
            safeSend(childWindow, "clear-ai-chat-log-data")
        })

        // === 同步 xterm 主题 ===
        ipcMain.on("forward-xterm-theme", (_, theme) => {
            safeSend(childWindow, "xterm-theme", theme)
        })

        // === 关闭日志窗口 ===
        ipcMain.on("close-ai-chat-window", () => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.close()
            }
        })

        // === 打开日志窗口 ===
        ipcMain.handle("open-ai-chat-log-window", async () => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.focus()
                return
            }
            const windowHash = crypto.randomUUID()

            // 创建子窗口
            childWindow = new BrowserWindow({
                width: 1200,
                height: 800,
                minWidth: 900,
                minHeight: 500,
                titleBarStyle: "default",
                show: false,
                webPreferences: {
                    preload: path.join(__dirname, "../../preload.js"),
                    nodeIntegration: true,
                    contextIsolation: false,
                    sandbox: true
                }
            })

            childWindow.setMenu(null)
            childWindow.loadFile(path.join(__dirname, "index.html"))

            // === 加载完成后发送日志 ===
            childWindow.webContents.once("did-finish-load", () => {
                childWindow.show()
                // childWindow.webContents.openDevTools()

                // 将已有日志推送过去
                for (const log of aiChatLogMap.values()) {
                    safeSend(childWindow, "ai-chat-log-data", log)
                }

                // 通知主窗口当前窗口状态
                mainWindow.send("ai-chat-log-window-hash", {hash: windowHash})
            })

            // === 关闭逻辑 ===
            const clearWindowState = () => {
                trimMap(aiChatLogMap, MAX_LOG_COUNT)
                childWindow = null
                mainWindow.send("ai-chat-log-window-hash", {hash: ""})
            }

            childWindow.on("close", (e) => {
                clearWindowState()
            })

            childWindow.on("closed", clearWindowState)
        })
    }
}
