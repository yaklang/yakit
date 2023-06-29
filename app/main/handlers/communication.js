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
    // 发送专项漏洞页面目标和类型参数
    ipcMain.handle("send-to-bug-test", async (e, params) => {
        win.webContents.send("fetch-send-to-bug-test", params)
    })
    // 请求包通过通信打开一个数据包插件执行弹窗
    ipcMain.handle("send-to-packet-hack", async (e, params) => {
        win.webContents.send("fetch-send-to-packet-hack", params)
    })
    // 缓存fuzzer内数据和配置通信
    ipcMain.handle("send-fuzzer-setting-data", async (e, params) => {
        win.webContents.send("fetch-fuzzer-setting-data", params)
    })
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

    // tab 新建插件后，刷新插件仓库的本地插件列表
    ipcMain.handle("send-local-script-list", async (e, params) => {
        win.webContents.send("ref-local-script-list", params)
    })

    /** 缩放日志的打开通信 */
    ipcMain.handle("shrink-console-log", async (e, params) => {
        win.webContents.send("callback-shrink-console-log", params)
    })

    /** 方向日志的打开通信 */
    ipcMain.handle("direction-console-log", async (e, params) => {
        win.webContents.send("callback-direction-console-log", params)
    })
    // 打开自定义菜单
    ipcMain.handle("open-customize-menu", (e, params) => {
        win.webContents.send("fetch-open-customize-menu", params)
    })
    /** 顶部菜单拖拽开启通信 */
    ipcMain.handle("update-yakit-header-title-drop", (e, params) => {
        win.webContents.send("fetch-yakit-header-title-drop", params)
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
            exec(`ping ${ip}`, (error, stdout, stderr) => {
                if (error) {
                    resolve(false)
                } else {
                    resolve(true)
                }
            })
        })
    })

    /** 简易企业版-刷新tabs颜色展示 */
    ipcMain.handle("refresh-tabs-color", async (e, params) => {
        win.webContents.send("fetch-new-tabs-color", params)
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

    // webfuzzer 打开提取器和匹配器Modal
    ipcMain.handle("send-open-matcher-and-extraction", (e, params) => {
        win.webContents.send("fetch-open-matcher-and-extraction", params)
    })
}
