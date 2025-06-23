const {ipcMain, app} = require("electron")
const fs = require("fs")
const https = require("https")
const {getLocalYaklangEngine} = require("../filePath")
const {
    fetchLatestYakEngineVersion,
    fetchLatestYakitEEVersion,
    fetchLatestYakitVersion,
    fetchLatestYakitIRifyVersion,
    fetchLatestYakitIRifyEEVersion,
    getAvailableOSSDomain,
    fetchSpecifiedYakVersionHash
} = require("../handlers/utils/network")
const {testEngineAvaiableVersion} = require("../ipc")
const {engineLogOutputFileAndUI} = require("../logFile")
const spawn = require("cross-spawn")

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
        const {config, releaseEditionName} = params
        return new Promise((resolve, reject) => {
            const versionFetchers = {
                Yakit: fetchLatestYakitVersion,
                EnpriTrace: fetchLatestYakitEEVersion,
                IRify: fetchLatestYakitIRifyVersion,
                "IRify-EnpriTrace": fetchLatestYakitIRifyEEVersion
            }
            const fetchPromise = versionFetchers[releaseEditionName]
                ? versionFetchers[releaseEditionName]
                : fetchLatestYakitVersion
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

    // 获取有效的引擎启动端口
    const asyncGetAvaiablePort = (params) => {
        return new Promise((resolve, reject) => {
            const commandParams = ["get-random-port", "-type", "tcp", "-json"]
            engineLogOutputFileAndUI(win, "----- 获取启动引擎可用端口号 -----")
            engineLogOutputFileAndUI(win, `执行命令: ${getLocalYaklangEngine()} ${commandParams.join(" ")}`)

            const child = spawn(getLocalYaklangEngine(), commandParams, {timeout: 5200})
            let stdout = ""
            let stderr = ""
            let finished = false
            const timer = setTimeout(() => {
                if (!finished) {
                    finished = true
                    child.kill()
                    engineLogOutputFileAndUI(win, "----- 引擎获取端口超时 -----")
                    reject("引擎获取端口超时，请重置内置引擎")
                }
            }, 5000)
            child.stdout.on("data", (data) => {
                stdout += data.toString()
            })
            child.stderr.on("data", (data) => {
                stderr += data.toString()
            })
            child.on("error", (err) => {
                if (finished) return
                finished = true
                clearTimeout(timer)
                engineLogOutputFileAndUI(win, `err: ${err.toString()}`)
                reject(`[YakEnginePort] ${err.name}: ${err.message}`)
            })
            child.on("close", (code) => {
                if (finished) return
                engineLogOutputFileAndUI(win, stdout)
                const arr = stdout
                    .split("\n")
                    .map((item) => item.trim())
                    .map((item) => {
                        const val =
                            item.match(
                                /^<f345213fb48cc9370b2abc97429f8e6e98d07fa0bad8577626af6bc8067c1d18>({.*})<\/f345213fb48cc9370b2abc97429f8e6e98d07fa0bad8577626af6bc8067c1d18>$/
                            ) || []
                        const match = val[1]
                        return match
                    })
                    .filter(Boolean)
                if (arr.length === 0) {
                    engineLogOutputFileAndUI(win, "----- 引擎无法获取可用端口号 -----")
                    if (code !== 0 || stderr) {
                        engineLogOutputFileAndUI(win, stderr || `Process exited with code ${code}`) // 只在失败时输出stderr
                    }
                    reject("引擎无法获取可用端口号, 请重置内置引擎")
                    return
                }
                try {
                    const cleanedOutput = arr[0].trim()
                    const result = JSON.parse(cleanedOutput)
                    finished = true
                    clearTimeout(timer)
                    engineLogOutputFileAndUI(win, `----- 获取启动引擎可用端口成功: ${result.port} -----`)
                    resolve(result.port)
                } catch (parseError) {
                    engineLogOutputFileAndUI(win, "[YakEnginePort] 解析stdout异常: " + parseError)
                    reject(parseError)
                }
            })
        })
    }
    ipcMain.handle("get-avaiable-port", async (e, params) => {
        return await asyncGetAvaiablePort(params)
    })

    // 获取运行引擎的适配版本
    ipcMain.handle("determine-adapted-version-engine", async (e, params) => {
        return await testEngineAvaiableVersion(params)
    })

    ipcMain.handle("fetch-local-engine-path", async () => {
        return getLocalYaklangEngine()
    })
}
