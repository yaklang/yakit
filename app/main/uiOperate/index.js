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
                return !isMax
            case "ismax":
                return win.isMaximized()
            case "max":
                if (win.isMaximized()) win.unmaximize()
                else win.maximize()
                return

            default:
                return
        }
    })
}
