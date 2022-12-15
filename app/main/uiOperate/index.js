const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    ipcMain.handle("UIOperate", (e, params) => {
        switch (params) {
            case "close":
                win.close()
                return
            case "min":
                win.minimize()
                return
            case "full":
                let isMax = win.isFullScreen()
                if (isMax) win.setFullScreen(false)
                else win.setFullScreen(true)
                return
            case "max":
                if (win.isMaximized()) win.unmaximize()
                else win.maximize()
                return

            default:
                return
        }
    })

    /** 窗口最大化 */
    win.on("maximize", () => {
        win.webContents.send("callback-win-maximize")
    })
    /** 窗口退出最大化 */
    win.on("unmaximize", () => {
        win.webContents.send("callback-win-unmaximize")
    })
    /** 窗口全屏 */
    win.on("enter-full-screen", () => {
        win.webContents.send("callback-win-enter-full")
    })
    /** 窗口退出全屏 */
    win.on("leave-full-screen", () => {
        win.webContents.send("callback-win-leave-full")
    })
}
