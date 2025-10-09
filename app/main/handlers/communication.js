const {ipcMain} = require("electron")
const isDev = require("electron-is-dev")
const exec = require("child_process").exec
module.exports = (win, getClient) => {
    // 刷新主页面左侧菜单内容 / refresh the menu content on the right side of the main page
    ipcMain.handle("change-main-menu", async (e) => {
        win.webContents.send("fetch-new-main-menu")
    })
    // 刷新public版本菜单
    ipcMain.handle("refresh-public-menu", async (e) => {
        win.webContents.send("refresh-public-menu-callback")
    })
    // 远程打开一个工具页面 / open a tool page remotely
    ipcMain.handle("send-to-tab", async (e, params) => {
        win.webContents.send("fetch-send-to-tab", params)
    })

    // 缓存fuzzer内数据和配置通信
    // ipcMain.handle("send-fuzzer-setting-data", async (e, params) => {
    //     win.webContents.send("fetch-fuzzer-setting-data", params)
    // })
    // 发送插件信息到YakRunning页面
    ipcMain.handle("send-to-yak-running", async (e, params) => {
        win.webContents.send("fetch-send-to-yak-running", params)
    })

    // 本地环境(打包/开发)
    ipcMain.handle("is-dev", () => {
        return isDev
    })

    /**
     * @name ipc通信-远程关闭一级页面
     * @param {object} params
     * @param {YakitRoute} params.router 页面路由
     * @param {string} params.name 选填-router是YakitRoute.Plugin_OP时必须传入插件名称
     */
    ipcMain.handle("send-close-tab", async (e, params) => {
        win.webContents.send("fetch-close-tab", params)
    })
    /**
     * @name 远程通信打开一个页面
     * @param {object} params 打开页面的信息
     *
     * @param {YakitRoute} params.route 页面的路由
     * @param {number} pluginId 插件id(本地)
     * @param {string} pluginName 插件名称
     */
    ipcMain.handle("open-route-page", (e, params) => {
        win.webContents.send("open-route-page-callback", params)
    })
    // 打开自定义菜单
    ipcMain.handle("open-customize-menu", (e, params) => {
        win.webContents.send("fetch-open-customize-menu", params)
    })
    /** 风车切换引擎 */
    ipcMain.handle("switch-conn-refresh", (e, params) => {
        if (!params) {
            // 关闭所有菜单
            win.webContents.send("fetch-close-all-tab")
        }
        win.webContents.send("fetch-switch-conn-refresh", params)
    })
    /** License验证通信 */
    ipcMain.handle("update-judge-license", (e, params) => {
        win.webContents.send("fetch-judge-license", params)
    })

    /** 网络检测 */
    ipcMain.handle("try-network-detection", async (e, ip) => {
        return await new Promise((resolve, reject) => {
            reject("Unimplemented - use advanced network diagnose")
        })
    })

    /** 简易企业版-打开固定报告 */
    ipcMain.handle("simple-open-report", async (e, params) => {
        win.webContents.send("fetch-simple-open-report", params)
    })

    /** 打开录屏 */
    ipcMain.handle("send-open-screenCap-modal", async (e, params) => {
        win.webContents.send("open-screenCap-modal")
    })

    // 定位HTTP History
    ipcMain.handle("send-positioning-http-history", (e, params) => {
        win.webContents.send("fetch-positioning-http-history", params)
    })


    // 新建组 onAddGroup
    ipcMain.handle("send-add-group", (e, params) => {
        win.webContents.send("fetch-add-group", params)
    })
}
