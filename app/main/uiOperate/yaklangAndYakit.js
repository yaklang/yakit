const {ipcMain, app} = require("electron")
const fs = require("fs")
const https = require("https")
const {getLocalYaklangEngine} = require("../filePath")

module.exports = (win, getClient) => {
    /** yaklang引擎是否安装 */
    ipcMain.handle("is-yaklang-engine-installed", () => {
        /** @returns {Boolean} */
        return fs.existsSync(getLocalYaklangEngine())
    })

    /** 获取Yaklang引擎最新版本号 */
    const asyncFetchLatestYaklangVersion = () => {
        return new Promise((resolve, reject) => {
            let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/version.txt")
            rsp.on("response", (rsp) => {
                rsp.on("data", (data) => {
                    resolve(`v${Buffer.from(data).toString("utf8")}`.trim())
                }).on("error", (err) => {
                    reject(err)
                })
            })
            rsp.on("error", reject)
        })
    }
    /** 获取Yaklang引擎最新版本号 */
    ipcMain.handle("fetch-latest-yaklang-version", async (e) => {
        return await asyncFetchLatestYaklangVersion()
    })

    /** 获取Yakit最新版本号 */
    const asyncFetchLatestYakitVersion = () => {
        return new Promise((resolve, reject) => {
            let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/yakit-version.txt")
            rsp.on("response", (rsp) => {
                rsp.on("data", (data) => {
                    resolve(`v${Buffer.from(data).toString("utf8")}`.trim())
                }).on("error", (err) => reject(err))
            })
            rsp.on("error", reject)
        })
    }
    /** 获取Yakit最新版本号 */
    ipcMain.handle("fetch-latest-yakit-version", async (e) => {
        return await asyncFetchLatestYakitVersion()
    })

    /** 获取Yakit本地版本号 */
    ipcMain.handle("fetch-yakit-version", async (e) => {
        return app.getVersion()
    })

    /** 激活 yaklang 或 yakit 的下载更新组件 */
    ipcMain.handle("receive-download-yaklang-or-yakit", (e, type) => {
        win.webContents.send("activate-download-yaklang-or-yakit", type)
    })
    /** 更新下载 yaklang 或 yakit 成功，稍后安装 */
    ipcMain.handle("download-update-wait", (e, type) => {
        win.webContents.send("download-update-wait-callback", type)
    })
    /** 更新成功后重启并连接 yaklang 引擎 */
    ipcMain.handle("update-yaklang-reconnect", (e, version) => {
        win.webContents.send("update-yaklang-reconnect-callback", version)
    })
}
