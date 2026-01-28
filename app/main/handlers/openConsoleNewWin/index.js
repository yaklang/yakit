const {ipcMain, BrowserWindow} = require("electron")
const path = require("path")
const crypto = require("crypto")

module.exports = {
    register: (win, getClient) => {
        let childWindow = null
        // 监听主窗口发来的数据，并转发给子窗口
        ipcMain.on("forward-xterm-data", (event, data) => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.webContents.send("xterm-data", data)
            }
        })

        // 监听主窗口发送过来的主题色变量
        ipcMain.on("forward-xterm-theme", (event, data) => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.webContents.send("xterm-theme", data)
            }
        })

        // 监听主窗口关闭子窗口
        ipcMain.on("close-console-new-window", () => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.close()
            }
        })

        // 监听主窗口触发子窗口显示但不激活
        ipcMain.on("onTop-console-new-window", () => {
            if (childWindow && !childWindow.isDestroyed()) {
                childWindow.showInactive()
                childWindow.moveTop()
            }
        })

        // 监听子窗口的复制操作，转发给主窗口
        ipcMain.on("console-terminal-window-copy", (event, copyData) => {
            if (win && !win.isDestroyed()) {
                win.webContents.send("console-terminal-window-copy-data", copyData)
            }
        })

        ipcMain.handle("open-console-new-window", async (e, url) => {
            const windowHash = crypto.randomUUID()
            childWindow = new BrowserWindow({
                width: 1200,
                height: 800,
                minWidth: 900,
                minHeight: 500,
                titleBarStyle: "default",
                webPreferences: {
                    preload: path.join(__dirname, "../../preload.js"),
                    nodeIntegration: true,
                    contextIsolation: false,
                    sandbox: true
                },
                show: false
            })

            // 移除子窗口的菜单
            childWindow.setMenu(null)

            childWindow.loadFile(path.join(__dirname, "index.html"))

            // 在子窗口加载完成后，向其发送数据
            childWindow.webContents.once("did-finish-load", () => {
                childWindow.show()
                // childWindow.webContents.openDevTools()

                // 通知父窗口：带上 hash
                win.send("engineConsole-window-hash", {hash: windowHash})
            })

            childWindow.on("close", (e) => {
                e.preventDefault()
                childWindow.destroy()
                win.send("engineConsole-window-hash", {hash: ""})
            })
            childWindow.on("closed", () => {
                childWindow = null
                win.send("engineConsole-window-hash", {hash: ""})
            })
        })
    }
}
