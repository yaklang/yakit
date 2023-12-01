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
                if (isMax) {
                    win.setFullScreen(false)
                    if (win.isMaximized()) {
                        setTimeout(() => {
                            win.unmaximize()
                        }, 10)
                    }
                } else win.setFullScreen(true)
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
    /** 窗口当前是否为全屏状态 */
    ipcMain.handle("is-full-screen", () => {
        win.webContents.send("callback-is-full-screen", win.isFullScreen())
    })
    /** 窗口当前是否为最大化 */
    ipcMain.handle("is-maximize-screen", () => {
        win.webContents.send("callback-is-maximize-screen", win.isMaximized())
    })

    /** 打开/关闭 devtool */
    ipcMain.handle("trigger-devtool", () => {
        const flag = win.webContents.isDevToolsOpened()
        if (flag) win.webContents.closeDevTools()
        else win.webContents.openDevTools()
        return
    })
    /** 刷新缓存 */
    ipcMain.handle("trigger-reload", () => {
        win.webContents.reload()
        return
    })
    /** 强制清空刷新缓存 */
    ipcMain.handle("trigger-reload-cache", () => {
        win.webContents.reloadIgnoringCache()
        return
    })
}
