const {service, httpApi} = require("../httpServer")
const {ipcMain} = require("electron")
const {USER_INFO} = require("../state")

module.exports = (win, getClient) => {
    ipcMain.handle("get-token", async (e, params) => {
        return Promise.resolve(USER_INFO.token)
    })
    ipcMain.handle("fetch-user-list", async (e, params) => {
        return httpApi("get", "user/ordinary", params)
    })
    ipcMain.handle("fetch-trust-user-list", async (e, params) => {
        return httpApi("get", "user", params)
    })
    ipcMain.handle("add-or-remove-user", async (e, params) => {
        return httpApi("post", "user", params)
    })
}
