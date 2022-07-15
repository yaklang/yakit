const {service} = require("../httpServer")
const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    ipcMain.handle("axios-api", async (e, params) => {
        return service(params)
    })
}
