const { ipcMain} = require("electron")
const {asyncKillDynamicControl,asyncStartDynamicControl,asyncAliveDynamicControlStatus,getCloseFlag} = require("./dynamicControlFun")

module.exports = (win, getClient) => {

    /** 启动远程控制服务 */
    ipcMain.handle("start-dynamic-control", async (e, params) => {
        return await asyncStartDynamicControl(win, params)
    })

    /** 关闭远程控制服务 */
    ipcMain.handle("kill-dynamic-control", async () => {
        return await asyncKillDynamicControl()
    })

    /** 监听服务状态 */
    ipcMain.handle("alive-dynamic-control-status", async (e, params) => {
        return await asyncAliveDynamicControlStatus()
        
    })

    /** 退出远程控制 */
    ipcMain.handle("lougin-out-dynamic-control", async (e, params) => {
        // params参数决定退出远程后是否退出登录
        win.webContents.send("login-out-dynamic-control-callback",params)
    })

    /** 退出远程控制中页面 */
    ipcMain.handle("lougin-out-dynamic-control-page", async (e, params) => {
        win.webContents.send("lougin-out-dynamic-control-page-callback")
    })

    /** 退出登录 */
    ipcMain.handle("ipc-sign-out", async (e, params) => {
        win.webContents.send("ipc-sign-out-callback")
    })
}
