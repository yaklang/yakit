const {ipcMain, app} = require("electron")
const path = require("path")
const fs = require("fs")
const https = require("https")
const process = require("process")
const {getLocalYaklangEngine, loadExtraFilePath} = require("../filePath")
const {
    fetchLatestYakEngineVersion,
    fetchLatestYakitEEVersion,
    fetchLatestYakitVersion,
    getAvailableOSSDomain,
    fetchSpecifiedYakVersionHash
} = require("../handlers/utils/network")
const {getCheckTextUrl} = require("../handlers/utils/network")

module.exports = (win, getClient) => {
    ipcMain.handle("get-available-oss-domain", async () => {
        return await getAvailableOSSDomain()
    })

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
    const asyncFetchLatestYakitVersion = (params) => {
        const {config, isEnterprise} = params
        return new Promise((resolve, reject) => {
            const fetchPromise = isEnterprise ? fetchLatestYakitEEVersion : fetchLatestYakitVersion
            fetchPromise(config)
                .then((version) => {
                    resolve(version)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }
    /** 获取Yakit最新版本号 */
    ipcMain.handle("fetch-latest-yakit-version", async (e, params) => {
        return await asyncFetchLatestYakitVersion(params)
    })

    /** 获取Yakit本地版本号 */
    ipcMain.handle("fetch-yakit-version", async (e) => {
        return app.getVersion()
    })

    /** 以更新引擎但未关闭内存中的老版本引擎进程(mac) */
    ipcMain.handle("kill-old-engine-process", (e, type) => {
        win.webContents.send("kill-old-engine-process-callback", type)
    })

    /** 获取Yaklang所有版本 */
    const asyncFetchYaklangVersionList = async () => {
        return new Promise(async (resolve, reject) => {
            const domain = await getAvailableOSSDomain()
            let rsp = https.get(`https://${domain}/yak/version-info/active_versions.txt`)
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

    /** 校验Yaklang来源是否正确 */
    ipcMain.handle("fetch-check-yaklang-source", async (e, version, requestConfig) => {
        return await fetchSpecifiedYakVersionHash(version, requestConfig)
    })
}
