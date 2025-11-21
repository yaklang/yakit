const {ipcMain} = require("electron")
const isDev = require("electron-is-dev")

module.exports = {
    registerNewIPC: (win, getClient, ipcEventPre) => {
        // 本地环境(打包/开发)
        ipcMain.handle(ipcEventPre + "is-dev", () => {
            return isDev
        })
    }
}
