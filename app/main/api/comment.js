const {service, httpApi} = require("../httpServer")
const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    ipcMain.handle("add-plugin-comment", async (e, params) => {
        return httpApi("post", "comment", params)
    })
     // 查询主评论
    ipcMain.handle("fetch-plugin-comment", async (e, params) => {
        return httpApi("get", "comment", params)
    }) 
    ipcMain.handle("fetch-plugin-comment-reply", async (e, params) => {
        return httpApi("get", "comment/reply", params)
    }) 
    ipcMain.handle("add-plugin-comment-stars", async (e, params) => {
        return httpApi("post", "comment/stars", params)
    })
}
