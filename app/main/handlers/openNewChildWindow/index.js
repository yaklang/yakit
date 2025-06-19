const {ipcMain, BrowserWindow} = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const crypto = require("crypto")

module.exports = {
    register: (win, getClient) => {
        let childWindow = null

        // 主窗口发送数据到子窗口
        ipcMain.on("minWin-send-to-childWin", async (e, params) => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.webContents.send("get-parent-window-data", params)
            }
        })

        // 监听主窗口关闭子窗口
        ipcMain.on("close-childWin", () => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.close()
            }
        })

        // 监听主窗口触发子窗口获取焦点
        ipcMain.on("onTop-childWin", () => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.focus()
                childWindow.show()
            }
        })

        ipcMain.on("open-new-child-window", (event, data) => {
            const windowHash = crypto.randomUUID()
            childWindow = new BrowserWindow({
                width: 1200,
                height: 800,
                minWidth: 900,
                minHeight: 500,
                titleBarStyle: "default", // 确保 macOS 有标题栏按钮
                webPreferences: {
                    preload: path.join(__dirname, "../../preload.js"),
                    nodeIntegration: true,
                    contextIsolation: false,
                    sandbox: true
                },
                show: false
            })

            // 通知父窗口：带上 hash
            win.send("child-window-hash", {hash: windowHash})

            // 移除子窗口的菜单
            childWindow.setMenu(null)

            // 先加载loading页面
            childWindow.loadFile(path.join(__dirname, "./index.html"))

            ipcMain.once("ready-to-load-child", () => {
                // 通知 loading.html 显示“正在加载主页面...”
                childWindow.webContents.send("start-child-loading")
                if (isDev) {
                    childWindow.loadURL("http://127.0.0.1:3000/?window=child")
                } else {
                    childWindow.loadFile(path.resolve(__dirname, "../../renderer/pages/main/index.html"), {
                        search: "window=child"
                    })
                }
            })

            // 监听子窗口加载完毕主动获取数据
            ipcMain.once("request-parent-data", (event) => {
                event.sender.send("get-parent-window-data", data)
            })

            childWindow.webContents.once("did-finish-load", () => {
                childWindow.show()
                // childWindow.webContents.openDevTools()
            })

            childWindow.webContents.once("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
                win.send("child-window-hash", {hash: ""})
            })

            childWindow.on("close", (e) => {
                e.preventDefault()
                childWindow.destroy()
                win.send("child-window-hash", {hash: ""})
            })
            childWindow.on("closed", () => {
                childWindow = null
                win.send("child-window-hash", {hash: ""})
            })
        })
    }
}
