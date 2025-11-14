const {ipcMain} = require("electron")
const fs = require("fs")
const {getLocalYaklangEngine} = require("../filePath")
const {fetchLatestYakEngineVersion, getAvailableOSSDomain} = require("../handlers/utils/network")

module.exports = {
    registerNewIPC: (win, getClient, ipcEventPre) => {
        /** yaklang引擎是否安装 */
        ipcMain.handle(ipcEventPre + "is-yaklang-engine-installed", () => {
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
        ipcMain.handle(ipcEventPre + "fetch-latest-yaklang-version", async (e) => {
            return await asyncFetchLatestYaklangVersion()
        })

        ipcMain.handle(ipcEventPre + "get-available-oss-domain", async () => {
            return await getAvailableOSSDomain()
        })
    }
}
