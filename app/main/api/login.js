const {service, httpApi} = require("../httpServer")
const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    ipcMain.handle("fetch-login-url", async (e, params) => {
        return httpApi("get", "auth/from", params)
    })

    ipcMain.handle("fetch-github-token", async (e, params) => {
        return httpApi("get", "auth/from-github/callback", params)
    })

    ipcMain.handle("fetch-wechat-token", async (e, params) => {
        return httpApi("get", "auth/from-wechat/callback", params)
    })

    ipcMain.handle("fetch-qq-token", async (e, params) => {
        return httpApi("get", "auth/from-qq/callback", params)
    })
}
