const {service, httpApi} = require("../httpServer")
const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    ipcMain.handle("fetch-user-list", async (e, params) => {
        return httpApi("get", "user/ordinary", params)
    })
    ipcMain.handle("fetch-trust-user-list", async (e, params) => {
        return httpApi("get", "user", params)
    })
}
