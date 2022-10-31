const {ipcMain} = require("electron")
const fs = require("fs")
const childProcess = require("child_process")
const _sudoPrompt = require("sudo-prompt")
const { Global_YAK_SETTING } = require("../state")

const isWindows = process.platform === "win32"

const getLatestYakLocalEngine = require("./upgradeUtil").getLatestYakLocalEngine

function generateWindowsSudoCommand(file, args) {
    const cmds = args === "" ? `"'${file}'"` : `"'${file}'" "'${args}'"`
    return `powershell.exe start-process -verb runas -WindowStyle hidden -filepath ${cmds}`
}

function sudoExec(cmd, opt, callback) {
    if (isWindows) {
        childProcess.exec(cmd, {maxBuffer: 1000 * 1000 * 1000}, (err) => {
            callback(err)
        })
    } else {
        _sudoPrompt.exec(cmd, {...opt, env: {YAKIT_HOME: path.join(os.homedir(), "yakit-projects/")}}, callback)
    }
}

/**
 * 引擎当前启动状态
 */
let IsEngineState = false

module.exports = (win, getClient) => {
    ipcMain.handle("yak-version", () => {
        try {
            getClient().Version({}, async (err, data) => {
                if (win && data.Version) {
                    win.webContents.send("client-yak-version", data.Version)
                }
            })
        } catch (e) {
            if (win && data.Version) {
                win.webContents.send("client-yak-version", "")
            }
        }
    })

    ipcMain.handle("engine-status", () => {
        try {
            const text = "hello yak grpc engine"
            getClient().Echo({text}, (err, data) => {
                if (win) {
                    if (data?.result === text) {
                        win.webContents.send("client-engine-status-ok")
                    } else {
                        win.webContents.send("client-engine-status-error")
                    }
                }
            })
        } catch (e) {
            if (win) {
                win.webContents.send("client-engine-status-error")
            }
        }
    })

    // 判断引擎是否安装
    ipcMain.handle("is-yaklang-engine-installed", () => {
        /**
         * @return {Boolean}
         */
        return fs.existsSync(getLatestYakLocalEngine())
    })

    /**
     *
     * @param {Object} params
     * @param {Boolean} params.sudo 是否使用管理员权限启动yak
     */
    const asyncStartLocalYakEngineServer = (params) => {
        return new Promise((resolve, reject) => {
            const {sudo} = params

            let randPort = 40000 + getRandomInt(9999)
            try {
                // 管理员权限逻辑未检查测试
                if (sudo) {
                    if (isWindows) {
                        childProcess
                            .exec(generateWindowsSudoCommand(getLatestYakLocalEngine(), `grpc --port ${randPort}`), {
                                maxBuffer: 1000 * 1000 * 1000
                            })
                            .on("error", (err) => {
                                if (err) reject(err)
                            })
                            .on("spawn", () => resolve())
                            .on("close", (e) => console.log("close", e))
                    } else {
                        const cmd = `${getLatestYakLocalEngine()} grpc --port ${randPort}`
                        sudoExec(
                            cmd,
                            {
                                name: `yak grpc port ${randPort}`
                            },
                            function (error) {
                                if (error) {
                                    reject(error)
                                } else {
                                    resolve()
                                }
                            }
                        )
                    }
                } else {
                    const subprocess = childProcess.spawn(getLatestYakLocalEngine(), ["grpc", "--port", `${randPort}`])
                    subprocess.on("error", (err) => {
                        if (err) {
                            fs.writeFileSync("/tmp/yakit-yak-process-from-callback.txt", new Buffer(`${err}`))
                            reject(err)
                        }
                    })
                    subprocess.on("close", (e) => console.log("close", e))
                    Global_YAK_SETTING.defaultYakGRPCAddr=`localhost:${randPort}`
                }
            } catch (e) {
                reject(e)
            }
        })
    }
    // 本地启动yaklang引擎
    ipcMain.handle("start-local-yaklang-engine", () => {})
}
