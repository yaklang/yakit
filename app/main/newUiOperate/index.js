const {ipcMain} = require("electron")

module.exports = {
    registerNewIPC: (win, getClient, ipcEventPre) => {
        ipcMain.handle(ipcEventPre + "UIOperate", (e, params) => {
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
        /** 窗口当前是否为全屏状态 */
        ipcMain.handle(ipcEventPre + "is-full-screen", () => {
            win.webContents.send("callback-is-full-screen", win.isFullScreen())
        })

        /** 窗口全屏 */
        win.on("enter-full-screen", () => {
            win.webContents.send("callback-win-enter-full")
        })

        /** 窗口退出全屏 */
        win.on("leave-full-screen", () => {
            win.webContents.send("callback-win-leave-full")
        })

        /** 窗口当前是否为最大化 */
        ipcMain.handle(ipcEventPre + "is-maximize-screen", () => {
            win.webContents.send("callback-is-maximize-screen", win.isMaximized())
        })

        /** 窗口最大化 */
        win.on("maximize", () => {
            win.webContents.send("callback-win-maximize")
        })

        /** 窗口退出最大化 */
        win.on("unmaximize", () => {
            win.webContents.send("callback-win-unmaximize")
        })
    }
}
