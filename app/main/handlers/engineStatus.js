const {ipcMain} = require("electron")
const fs = require("fs")
const childProcess = require("child_process")
const path = require("path")
const os = require("os")
const _sudoPrompt = require("sudo-prompt")
const {GLOBAL_YAK_SETTING} = require("../state")
const {setLocalCache, kvCache} = require("../localCache")
const {testClient, testRemoteClient} = require("../ipc")
const {getLocalYaklangEngine} = require("../filePath")

/**  获取缓存数据里本地引擎是否以管理员权限启动 */
const YaklangEngineSudo = "yaklang-engine-sudo"
/**  获取缓存数据里本地引擎启动的端口号 */
const YaklangEnginePort = "yaklang-engine-port"

/** 本地引擎随机端口启动重试次数(防止无限制的随机重试，最大重试次数: 5) */
let engineCount = 0

/** 探测yaklang引擎进程是否存活的定时器 */
let probeSurvivalTime = null
/** 探测指定端口的本地yaklang引擎是否启动 */
const probeEngineProcess = (win, port, sudo) => {
    try {
        testClient(port, async (err, result) => {
            if (!err) {
                if (kvCache.get(YaklangEnginePort) !== port) {
                    setLocalCache(YaklangEnginePort, port)
                }
                if (kvCache.get(YaklangEngineSudo) !== !!sudo) {
                    setLocalCache(YaklangEngineSudo, !!sudo)
                }
                if (GLOBAL_YAK_SETTING.defaultYakGRPCAddr !== `localhost:${port}`) {
                    GLOBAL_YAK_SETTING.sudo = !!sudo
                    GLOBAL_YAK_SETTING.defaultYakGRPCAddr = `localhost:${port}`
                }
                win.webContents.send("start-yaklang-engine-success", sudo ? "admin" : "local")
                engineCount = 0
            } else {
                GLOBAL_YAK_SETTING.sudo = false
                GLOBAL_YAK_SETTING.defaultYakGRPCAddr = `127.0.0.1:8087`
                win.webContents.send("local-yaklang-engine-end", err)
            }
        })
    } catch (e) {}
}

/** 探测 远程连接引擎 是否存活的定时器 */
let probeSurvivalRemoteTime = null
/** 探测 远程连接引擎 是否启动 */
const probeRemoteEngineProcess = (win, params) => {
    try {
        testRemoteClient(params, async (err, result) => {
            if (!!err) {
                GLOBAL_YAK_SETTING.sudo = false
                GLOBAL_YAK_SETTING.defaultYakGRPCAddr = `127.0.0.1:8087`
                GLOBAL_YAK_SETTING.caPem = ""
                GLOBAL_YAK_SETTING.password = ""
                win.webContents.send("local-yaklang-engine-end", err)
            }
        })
    } catch (e) {}
}

const isWindows = process.platform === "win32"

/** @name 生成windows系统的管理员权限命令 */
function generateWindowsSudoCommand(file, args) {
    const cmds = args === "" ? `"'${file}'"` : `"'${file}'" "'${args}'"`
    return `powershell.exe start-process -verb runas -WindowStyle hidden -filepath ${cmds}`
}
/** @name 以管理员权限执行命令 */
function sudoExec(cmd, opt, callback) {
    if (isWindows) {
        childProcess.exec(cmd, {maxBuffer: 1000 * 1000 * 1000}, (err, stdout, stderr) => {
            callback(err)
        })
    } else {
        _sudoPrompt.exec(cmd, {...opt, env: {YAKIT_HOME: path.join(os.homedir(), "yakit-projects/")}}, callback)
    }
}

module.exports = (win, callback, getClient) => {
    /** |del|已废弃，后续测试通过后可以删除 */
    // ipcMain.handle("yak-version", () => {
    //     try {
    //         getClient().Version({}, async (err, data) => {
    //             if (win && data.Version) {
    //                 win.webContents.send("client-yak-version", data.Version)
    //             }
    //         })
    //     } catch (e) {
    //         if (win && data.Version) {
    //             win.webContents.send("client-yak-version", "")
    //         }
    //     }
    // })
    /** 获取本地引擎版本号 */
    ipcMain.handle("fetch-yak-version", () => {
        try {
            getClient().Version({}, async (err, data) => {
                if (win && data.Version) win.webContents.send("fetch-yak-version-callback", data.Version)
            })
        } catch (e) {
            win.webContents.send("fetch-yak-version-callback", "")
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

    /**
     * @name 手动启动yaklang引擎进程
     * @param {Object} params
     * @param {Boolean} params.sudo 是否使用管理员权限启动yak
     * @param {Number} params.port 本地缓存数据里的引擎启动端口号
     */
    const asyncStartLocalYakEngineServer = (win, params) => {
        engineCount += 1

        const {sudo, port} = params
        let randPort = port || 40000 + Math.floor(Math.random() * 9999)

        return new Promise((resolve, reject) => {
            try {
                // 考虑如果管理员权限启动未成功该通过什么方式自启普通权限引擎进程
                if (sudo) {
                    if (probeSurvivalTime) clearInterval(probeSurvivalTime)
                    probeSurvivalTime = null
                    probeSurvivalTime = setInterval(() => probeEngineProcess(win, randPort, true), 2000)

                    if (isWindows) {
                        const subprocess = childProcess.exec(
                            generateWindowsSudoCommand(getLocalYaklangEngine(), `grpc --port ${randPort}`),
                            {maxBuffer: 1000 * 1000 * 1000}
                        )

                        subprocess.on("error", (err) => {
                            if (err) reject(err)
                        })

                        subprocess.on("close", async (e) => {
                            if (e) reject(e)
                        })
                    } else {
                        const cmd = `${getLocalYaklangEngine()} grpc --port ${randPort}`
                        sudoExec(
                            cmd,
                            {
                                name: `yak grpc port ${randPort}`
                            },
                            function (error, stdout, stderr) {
                                if (error || stderr) {
                                    if (error.message.indexOf("User did not grant permission") > -1) {
                                        asyncStartLocalYakEngineServer(win, {sudo: false, port: randPort})
                                    }
                                    reject(error || stderr)
                                }
                            }
                        )
                    }
                } else {
                    if (probeSurvivalTime) clearInterval(probeSurvivalTime)
                    probeSurvivalTime = null
                    probeSurvivalTime = setInterval(() => probeEngineProcess(win, randPort, false), 2000)

                    const subprocess = childProcess.spawn(getLocalYaklangEngine(), ["grpc", "--port", `${randPort}`], {
                        stdio: ["ignore", "ignore", "ignore"]
                    })
                    subprocess.on("error", (err) => {
                        if (err) {
                            fs.writeFileSync("/tmp/yakit-yak-process-from-callback.txt", new Buffer(`${err}`))
                            reject(err)
                        }
                    })
                    subprocess.on("close", async (e) => {
                        console.log("main-engineStatus-nosudo-close", e)
                        if (e === 0) {
                            if (engineCount === 5) {
                                if (probeSurvivalTime) clearInterval(probeSurvivalTime)
                                probeSurvivalTime = null
                                reject("多次尝试启动引擎失败，请清理端口后在重新启动yakit")
                            }

                            const result = await asyncStartLocalYakEngineServer(win, {sudo: false})
                            if (!result) resolve()
                            else reject(result)
                        }
                    })
                }
            } catch (e) {
                reject(e)
            }
        })
    }
    /** 判断缓存端口是否已开启引擎 */
    const judgeEngineStarted = (win, params) => {
        const {sudo, port} = params

        return new Promise((resolve, reject) => {
            try {
                testClient(port, async (err, result) => {
                    if (!err) {
                        if (probeSurvivalTime) clearInterval(probeSurvivalTime)
                        probeSurvivalTime = null
                        probeSurvivalTime = setInterval(() => probeEngineProcess(win, port, sudo), 2000)
                        resolve()
                    } else {
                        const err = await asyncStartLocalYakEngineServer(win, params)
                        if (!!err) reject(err)
                        else resolve()
                    }
                })
            } catch (e) {
                reject(e)
            }
        })
    }
    /** 本地启动yaklang引擎 */
    ipcMain.handle("start-local-yaklang-engine", async (e, params) => {
        if (probeSurvivalRemoteTime) clearInterval(probeSurvivalRemoteTime)
        probeSurvivalRemoteTime = null

        if (params.port) {
            return await judgeEngineStarted(win, params)
        } else {
            return await asyncStartLocalYakEngineServer(win, params)
        }
    })

    /** 判断缓存端口是否已开启引擎 */
    const judgeRemoteEngineStarted = (win, params) => {
        return new Promise((resolve, reject) => {
            try {
                testRemoteClient(params, async (err, result) => {
                    if (!err) {
                        GLOBAL_YAK_SETTING.defaultYakGRPCAddr = `${params.host}:${params.port}`
                        GLOBAL_YAK_SETTING.caPem = params.caPem || ""
                        GLOBAL_YAK_SETTING.password = params.password
                        GLOBAL_YAK_SETTING.sudo = false
                        win.webContents.send("start-yaklang-engine-success", "remote")
                        if (probeSurvivalRemoteTime) clearInterval(probeSurvivalRemoteTime)
                        probeSurvivalRemoteTime = null
                        probeSurvivalRemoteTime = setInterval(() => probeRemoteEngineProcess(win, params), 2000)
                        resolve()
                    } else reject(err)
                })
            } catch (e) {
                reject(e)
            }
        })
    }
    /** 远程连接引擎 */
    ipcMain.handle("start-remote-yaklang-engine", async (e, params) => {
        if (probeSurvivalTime) clearInterval(probeSurvivalTime)
        probeSurvivalTime = null

        return await judgeRemoteEngineStarted(win, params)
    })

    /** 连接引擎 */
    ipcMain.handle("connect-yaklang-engine", (e, isRemote) => {
        callback(
            GLOBAL_YAK_SETTING.defaultYakGRPCAddr,
            isRemote ? GLOBAL_YAK_SETTING.caPem : "",
            isRemote ? GLOBAL_YAK_SETTING.password : ""
        )
        win.webContents.send("local-yaklang-engine-start")
    })

    /** 断开引擎 */
    ipcMain.handle("break-yaklalng-engine", () => {
        win.webContents.send("local-yaklang-engine-end")
    })
}
