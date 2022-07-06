const {service, httpApi} = require("../httpServer")
const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // ipcMain.handle("fetch-plugin-list-unlogged", async (e, params) => {
    //     return httpApi("get", "yakit/plugin/unlogged", params)
    // })
    // ipcMain.handle("fetch-plugin-list-logged", async (e, params) => {
    //     return httpApi("get", "yakit/plugin", params)
    // })

    ipcMain.handle("fetch-plugin-detail", async (e, params) => {
        return httpApi("get", "yakit/plugin/detail", params)
    })
    // ipcMain.handle("fetch-plugin-detail-unlogged", async (e, params) => {
    //     return httpApi("get", "yakit/plugin/detail-unlogged", params)
    // })

    // ipcMain.handle("fetch-plugin-audit", async (e, params) => {
    //     return httpApi("post", "yakit/plugin/audit", params)
    // })
    ipcMain.handle("fetch-plugin-stars", async (e, params) => {
        return httpApi("post", "yakit/plugin/stars", params)
    })

    // ipcMain.handle("upload-plugin", async (e, params) => {
    //     return httpApi("post", "yakit/plugin", params)
    // })
}
