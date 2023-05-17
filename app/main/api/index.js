const {service} = require("../httpServer")
const {ipcMain} = require("electron")

module.exports = () => {
    ipcMain.handle("axios-api", async (e, params) => {
        return service(params)
    })
}
