const {ipcMain} = require("electron")
const childProcess = require("child_process")
const _sudoPrompt = require("sudo-prompt")
const {GLOBAL_YAK_SETTING} = require("../state")
const {testRemoteClient} = require("../ipc")
const {getLocalYaklangEngine, engineLog, YakitProjectPath} = require("../filePath")
const net = require("net")
const fs = require("fs")
const path = require("path")
const {getNowTime} = require("../toolsFunc")

/** 引擎错误日志 */
const logPath = path.join(engineLog, `engine-log-${getNowTime()}.txt`)
let out = null
fs.open(logPath, "a", (err, fd) => {
    if (err) {
        console.log("获取本地引擎日志错误：", err)
    } else {
        out = fd
    }
})

let dbFile = undefined

/** 本地引擎随机端口启动重试次数(防止无限制的随机重试，最大重试次数: 5) */
let engineCount = 0

function isPortAvailable(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer({})
        server.on("listening", () => {
            server.close((err) => {
                if (err === undefined) {
                    resolve()
                } else {
                    reject(err)
                }
            })
        })
        server.on("error", (err) => {
            reject(err)
        })
        server.listen(port, () => {})
    })
}

function isPortOpen(port) {}

const isWindows = process.platform === "win32"

/** @name 生成windows系统的管理员权限命令 */
// function generateWindowsSudoCommand(file, args) {
//     const cmds = args === "" ? `"'${file}'"` : `"'${file}'" "'${args}'"`
//     return `powershell.exe start-process -verb runas -WindowStyle hidden -filepath ${cmds}`
// }
/** @name 以管理员权限执行命令 */
// function sudoExec(cmd, opt, callback) {
//     if (isWindows) {
//         childProcess.exec(cmd, {maxBuffer: 1000 * 1000 * 1000}, (err, stdout, stderr) => {
//             callback(err)
//         })
//     } else {
//         _sudoPrompt.exec(cmd, {...opt, env: {YAKIT_HOME: YakitProjectPath}}, callback)
//     }
// }

const engineStdioOutputFactory = (win) => (buf) => {
    if (win) {
        win.webContents.send("live-engine-stdio", buf.toString("utf-8"))
    }
}

const engineLogOutputFactory = (win) => (message) => {
    if (win) {
        console.info(message)
        win.webContents.send("live-engine-log", message + "\n")
    }
}

const ECHO_TEST_MSG = "Hello Yakit!"

module.exports = (win, callback, getClient, newClient) => {
    // 输出到欢迎页面的 output 中
    const toStdout = engineStdioOutputFactory(win)
    // 输出到日志中
    const toLog = engineLogOutputFactory(win)

    /** 获取本地引擎版本号 */
    ipcMain.handle("fetch-yak-version", () => {
        try {
            getClient().Version({}, async (err, data) => {
                if (win && data.Version) win.webContents.send("fetch-yak-version-callback", data.Version)
                else win.webContents.send("fetch-yak-version-callback", "")
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

    // asyncGetRandomPort wrapper
    const asyncGetRandomPort = () => {
        return new Promise((resolve, reject) => {
            const port = 40000 + Math.floor(Math.random() * 9999)
            isPortAvailable(port)
                .then(() => {
                    resolve(port)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }
    ipcMain.handle("get-random-local-engine-port", async (e) => {
        return await asyncGetRandomPort()
    })

    // asyncIsPortAvailable wrapper
    const asyncIsPortAvailable = (params) => {
        return isPortAvailable(params)
    }
    ipcMain.handle("is-port-available", async (e, port) => {
        /**
         * @port: 判断端口是否是可以被监听的
         */
        return await asyncIsPortAvailable(port)
    })

    /**
     * @name 手动启动yaklang引擎进程
     * @param {Object} params
     * @param {Boolean} params.sudo 是否使用管理员权限启动yak
     * @param {Number} params.port 本地缓存数据里的引擎启动端口号
     * @param {Boolean} params.isEnpriTraceAgent 本地缓存数据里的引擎启动端口号
     */
    const asyncStartLocalYakEngineServer = (win, params) => {
        engineCount += 1

        const {port, isEnpriTraceAgent} = params
        return new Promise((resolve, reject) => {
            try {
                console.log('process.env',JSON.stringify(process.env))
                toLog("已启动本地引擎进程")
                const log = out ? out : "ignore"

                const grpcPort = ["grpc", "--port", `${port}`]
                const extraParams = dbFile ? [...grpcPort, "--profile-db", dbFile] : grpcPort
                const resultParams = isEnpriTraceAgent ? [...extraParams, "--disable-output"] : extraParams

                const subprocess = childProcess.spawn(getLocalYaklangEngine(), resultParams, {
                    // stdio: ["ignore", "ignore", "ignore"]
                    detached: false,
                    windowsHide: true,
                    stdio: ["ignore", log, log],
                    env: {
                        ...process.env,
                        YAKIT_HOME: YakitProjectPath
                    }
                })

                // subprocess.unref()
                process.on("exit", () => {
                    // 终止子进程
                    subprocess.kill()
                })
                subprocess.on("error", (err) => {
                    toLog(`本地引擎遭遇错误，错误原因为：${err}`)
                    win.webContents.send("start-yaklang-engine-error", `本地引擎遭遇错误，错误原因为：${err}`)
                    reject(err)
                })
                subprocess.on("close", async (e) => {
                    toLog(`本地引擎退出，退出码为：${e}`)
                    fs.readFile(engineLog, (err, data) => {
                        if (err) {
                            console.log("读取引擎文件失败", err)
                        } else {
                            toStdout(data)
                            setTimeout(() => {
                                try {
                                    fs.unlinkSync(engineLog)
                                } catch (e) {
                                    console.info(`unlinkSync 'engine.log' local cache failed: ${e}`, e)
                                }
                            }, 1000)
                        }
                    })
                })
                resolve()
            } catch (e) {
                reject(e)
            }
        })
    }

    /** 本地启动yaklang引擎 */
    ipcMain.handle("start-local-yaklang-engine", async (e, params) => {
        if (!params["port"]) {
            throw Error("启动本地引擎必须指定端口")
        }
        return await asyncStartLocalYakEngineServer(win, params)
    })

    /** 判断远程缓存端口是否已开启引擎 */
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
        return await judgeRemoteEngineStarted(win, params)
    })

    /** 连接引擎 */
    ipcMain.handle("connect-yaklang-engine", async (e, params) => {
        /**
         * connect yaklang engine 实际上是为了设置参数，实际上他是不知道远程还是本地
         * params 中的参数应该有如下：
         *  @Host: 主机名，可能携带端口
         *  @Port: 端口
         *  @Sudo: 是否是管理员权限
         *  @IsTLS?: 是否是 TLS 加密的
         *  @PemBytes?: Uint8Array 是 CaPem
         *  @Password?: 登陆密码
         */
        const hostRaw = `${params["Host"] || "127.0.0.1"}`
        let portFromRaw = `${params["Port"] || 8087}`
        let hostFormatted = hostRaw
        if (hostRaw.lastIndexOf(":") >= 0) {
            portFromRaw = `${parseInt(hostRaw.substr(hostRaw.lastIndexOf(":") + 1))}`
            hostFormatted = `${hostRaw.substr(0, hostRaw.lastIndexOf(":"))}`
        }
        const addr = `${hostFormatted}:${portFromRaw}`
        toLog(`原始参数为: ${JSON.stringify(params)}`)
        toLog(`开始连接引擎地址为：${addr} Host: ${hostRaw} Port: ${portFromRaw}`)
        GLOBAL_YAK_SETTING.defaultYakGRPCAddr = addr

        callback(
            GLOBAL_YAK_SETTING.defaultYakGRPCAddr,
            Buffer.from(params["PemBytes"] === undefined ? "" : params["PemBytes"]).toString("utf-8"),
            params["Password"] || ""
        )
        return await new Promise((resolve, reject) => {
            newClient().Echo({text: ECHO_TEST_MSG}, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                if (data["result"] === ECHO_TEST_MSG) {
                    resolve(data)
                } else {
                    reject(Error(`ECHO ${ECHO_TEST_MSG} ERROR`))
                }
            })
        })
    })

    /** 断开引擎(暂未使用) */
    ipcMain.handle("break-yaklalng-engine", () => {})

    /** 输出到欢迎界面的日志中 */
    ipcMain.handle("output-log-to-welcome-console", (e, msg) => {
        toLog(`${msg}`)
    })

    /** 调用命令生成运行节点 */
    ipcMain.handle("call-command-generate-node", (e, params) => {
        return new Promise((resolve, reject) => {
            // 运行节点
            const subprocess = childProcess.spawn(getLocalYaklangEngine(), [
                "mq",
                "--server",
                params.ipOrdomain,
                "--server-port",
                params.port,
                "--id",
                params.nodename
            ])
            subprocess.stdout.on("data", (data) => {
                resolve(subprocess.pid)
            })
            subprocess.on("error", (error) => {
                reject(error)
            })
            subprocess.stderr.on("data", (data) => {
                reject(data)
            })
        })
    })
    /** 删除运行节点 */
    ipcMain.handle("kill-run-node", (e, params) => {
        return new Promise((resolve, reject) => {
            if (isWindows) {
                childProcess.exec(`taskkill /F /PID ${params.pid}`, (error, stdout, stderr) => {
                    if (error) {
                        reject(error)
                    }
                    if (stderr) {
                        reject(stderr)
                    }
                    resolve("")
                })
            } else {
                childProcess.exec(`kill -9 ${params.pid}`, (error, stdout, stderr) => {
                    if (error) {
                        reject(error)
                    }
                    if (stderr) {
                        reject(stderr)
                    }
                    resolve("")
                })
            }
        })
    })
}
