const { ipcMain, app } = require("electron")
const path = require("path")
const fs = require("fs")
const https = require("https")
const process = require("process");
const { getLocalYaklangEngine, loadExtraFilePath } = require("../filePath")
const { fetchLatestYakEngineVersion } = require("../handlers/utils/network")
const { getCheckTextUrl } = require("../handlers/utils/network")

module.exports = (win, getClient) => {
    /** yaklang引擎是否安装 */
    ipcMain.handle("is-yaklang-engine-installed", () => {
        /** @returns {Boolean} */
        return fs.existsSync(getLocalYaklangEngine())
    })

    /** 获取Yaklang引擎最新版本号 */
    const asyncFetchLatestYaklangVersion = () => {
        return new Promise((resolve, reject) => {
            fetchLatestYakEngineVersion()
                .then((version) => {
                    resolve(`${version}`.trim())
                })
                .catch((err) => {
                    reject(err)
                })
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

    /** 以更新引擎但未关闭内存中的老版本引擎进程(mac) */
    ipcMain.handle("kill-old-engine-process", (e, type) => {
        win.webContents.send("kill-old-engine-process-callback", type)
    })

    /** 获取软件当前版本对应的引擎版本号 */
    ipcMain.handle("fetch-built-in-engine-version", (e) => {
        const versionPath = loadExtraFilePath(path.join("bins", "engine-version.txt"))
        if (fs.existsSync(versionPath)) {
            try {
                return fs.readFileSync(versionPath).toString("utf8")
            } catch (error) {
                return ""
            }
        } else {
            return ""
        }
    })

    /** 获取Yaklang所有版本 */
    const asyncFetchYaklangVersionList = () => {
        return new Promise((resolve, reject) => {
            let rsp = https.get("https://aliyun-oss.yaklang.com/yak/version-info/active_versions.txt")
            rsp.on("response", (rsp) => {
                rsp.on("data", (data) => {
                    resolve(Buffer.from(data).toString("utf8"))
                }).on("error", (err) => reject(err))
            })
            rsp.on("error", reject)
        })
    }
    /** 获取Yaklang所有版本 */
    ipcMain.handle("fetch-yaklang-version-list", async (e) => {
        return await asyncFetchYaklangVersionList()
    })

    const asyncFetchCheckYaklangSource = (version) => {
        return new Promise((resolve, reject) => {
            let url = getCheckTextUrl()
            if (url === '') {
                reject(`Unsupported platform: ${process.platform}`)
            }
            let rsp = https.get(url)
            rsp.on("response", (rsp) => {
                rsp.on("data", (data) => {
                    if (rsp.statusCode == 200) {
                        resolve(Buffer.from(data).toString("utf8"))
                    } else {
                        reject('校验值不存在')
                    }
                }).on("error", (err) => reject(err))
            })
            rsp.on("error", reject)
        })
    }
    /** 校验Yaklang来源是否正确 */
    ipcMain.handle("fetch-check-yaklang-source", async (e, version) => {
        return await asyncFetchCheckYaklangSource(version)
    })
}
