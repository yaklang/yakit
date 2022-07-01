const {service, httpApi} = require("../httpServer")
const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // ipcMain.handle("add-plugin-comment", async (e, params) => {
    //     const res = httpApi("post", "comment", params)
    //     res.then((data) => {
    //         if (data.ok && params.by_user_id > 0) win.webContents.send("ref-comment-child-list", params)
    //     })
    //     return res
    // })
    // 查询主评论
    // ipcMain.handle("fetch-plugin-comment", async (e, params) => {
    //     return httpApi("get", "comment", params)
    // })
    // ipcMain.handle("fetch-plugin-comment-reply", async (e, params) => {
    //     return httpApi("get", "comment/reply", params)
    // })
    // ipcMain.handle("add-plugin-comment-stars", async (e, params) => {
    //     return httpApi("post", "comment/stars", params)
    // })
}
