const {ipcMain} = require("electron")
const childProcess = require("child_process")
const _sudoPrompt = require("sudo-prompt")
const {GLOBAL_YAK_SETTING} = require("../state")
const {testRemoteClient} = require("../ipc")
const {getLocalYaklangEngine, YakitProjectPath} = require("../filePath")
const net = require("net")
const {engineLogOutputFileAndUI, engineLogOutputUI} = require("../logFile")

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

const ECHO_TEST_MSG = "Hello Yakit!"

module.exports = (win, callback, getClient, newClient) => {
    /** 获取本地引擎版本号 */
    ipcMain.handle("fetch-yak-version", () => {
        try {
            engineLogOutputFileAndUI(win, `----- 获取正在连接引擎的版本号 -----`)
            getClient().Version({}, async (err, data) => {
                if (win && data.Version) {
                    engineLogOutputFileAndUI(win, `----- 正在连接引擎的版本号: ${data.Version} -----`)
                    win.webContents.send("fetch-yak-version-callback", data.Version)
                } else win.webContents.send("fetch-yak-version-callback", "")
            })
        } catch (e) {
            engineLogOutputFileAndUI(win, `----- 获取正在连接引擎版本号失败 -----`)
            engineLogOutputFileAndUI(win, `${e}`)
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

    const asyncStartSecretLocalYakEngineServer = (win, params) => {
        const {version} = params
        engineCount += 1

        const {isEnpriTraceAgent, isIRify} = params
        const SECRET_LOCAL_PORT = 9011

        return new Promise((resolve, reject) => {
            engineLogOutputFileAndUI(win, `----- 启动本地引擎进程(Random Local Password, Port: ${SECRET_LOCAL_PORT}) -----`)
            if (isIRify) {
                dbFile = ["--profile-db", "irify-profile-rule.db", "--project-db", "default-irify.db"]
            }
            
            try {
                const grpcParams = ["grpc", "--local-password", "admin123", "--frontend", `${version || "yakit"}`]
                const extraParams = dbFile ? [...grpcParams, ...dbFile] : grpcParams
                const resultParams = isEnpriTraceAgent ? [...extraParams, "--disable-output"] : extraParams

                engineLogOutputFileAndUI(win, `Start command: ${getLocalYaklangEngine()} ${resultParams.join(" ")}`)
                const subprocess = childProcess.spawn(getLocalYaklangEngine(), resultParams, {
                    detached: false,
                    windowsHide: true,
                    stdio: ["ignore", "pipe", "pipe"],
                    env: {
                        ...process.env,
                        YAKIT_HOME: YakitProjectPath
                    }
                })

                subprocess.unref()
                process.on("exit", () => {
                    // 终止子进程
                    subprocess.kill()
                })
                subprocess.on("error", (err) => {
                    engineLogOutputFileAndUI(win, `----- Engine encountered an error -----`)
                    engineLogOutputFileAndUI(win, err)
                    win.webContents.send("start-yaklang-engine-error", `Engine encountered an error: ${err}`)
                    reject(err)
                })
                subprocess.on("close", async (e) => {
                    engineLogOutputFileAndUI(win, `----- Engine process exited with code: ${e} -----`)
                })

                subprocess.stdout.on("data", (data) => {
                    try {
                        engineLogOutputFileAndUI(win, `${data.toString("utf-8")}`)
                    } catch (error) {}
                })
                subprocess.stderr.on("data", (data) => {
                    try {
                        engineLogOutputFileAndUI(win, `${data.toString("utf-8")}`)
                    } catch (error) {}
                })
                resolve()
            } catch (e) {
                reject(e)
            }
        })
    }

    /**
     * @name 手动启动yaklang引擎进程
     * @param {Object} params
     * @param {Boolean} params.sudo 是否使用管理员权限启动yak
     * @param {Number} params.port 本地缓存数据里的引擎启动端口号
     * @param {Boolean} params.isEnpriTraceAgent 本地缓存数据里的引擎启动端口号
     */
    const asyncStartLocalYakEngineServer = (win, params) => {
        const {version} = params
        engineCount += 1

        const {port, isEnpriTraceAgent, isIRify} = params
        return new Promise((resolve, reject) => {
            try {
                engineLogOutputFileAndUI(win, `----- 已启动本地引擎进程 -----`)
                if (isIRify) {
                    dbFile = ["--profile-db", "irify-profile-rule.db", "--project-db", "default-irify.db"]
                }

                const grpcPort = ["grpc", "--port", `${port}`, "--frontend", `${version || "yakit"}`]
                const extraParams = dbFile ? [...grpcPort, ...dbFile] : grpcPort
                const resultParams = isEnpriTraceAgent ? [...extraParams, "--disable-output"] : extraParams

                engineLogOutputFileAndUI(win, `启动命令: ${getLocalYaklangEngine()} ${resultParams.join(" ")}`)
                const subprocess = childProcess.spawn(getLocalYaklangEngine(), resultParams, {
                    detached: false,
                    windowsHide: true,
                    stdio: ["ignore", "pipe", "pipe"],
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
                    engineLogOutputFileAndUI(win, `----- 本地引擎遭遇错误，错误原因 -----`)
                    engineLogOutputFileAndUI(win, err)
                    win.webContents.send("start-yaklang-engine-error", `本地引擎遭遇错误，错误原因为：${err}`)
                    reject(err)
                })
                subprocess.on("close", async (e) => {
                    engineLogOutputFileAndUI(win, `----- 本地引擎退出，退出码为：${e} -----`)
                })

                subprocess.stdout.on("data", (data) => {
                    try {
                        // const match = data.toString("utf-8").match(/\[\w+:\d+]\s+(.*)/)[1]
                        engineLogOutputFileAndUI(win, `${data.toString("utf-8")}`)
                    } catch (error) {}
                })
                subprocess.stderr.on("data", (data) => {
                    try {
                        // const match = data.toString("utf-8").match(/\[\w+:\d+]\s+(.*)/)[1]
                        engineLogOutputFileAndUI(win, `${data.toString("utf-8")}`)
                    } catch (error) {}
                })
                resolve()
            } catch (e) {
                reject(e)
            }
        })
    }

    const asyncAllowSecretLocal = () => {
        return new Promise((resolve, reject) => {
            try {
                const command = getLocalYaklangEngine()
                const args = ['check-secret-local-grpc']
                engineLogOutputFileAndUI(win, `----- 检查本地随机密码模式支持 -----`)
                engineLogOutputFileAndUI(win, `执行命令: ${command} ${args.join(' ')}`)

                const subprocess = childProcess.spawn(command, args, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env: {
                        ...process.env,
                        YAKIT_HOME: YakitProjectPath
                    }
                })

                let stdout = ''
                let stderr = ''
                let timeoutId = setTimeout(() => {
                    subprocess.kill()
                    engineLogOutputFileAndUI(win, `----- 检查随机密码模式超时 -----`)
                    reject('检查随机密码模式超时')
                }, 30000) // 30秒超时

                subprocess.stdout.on('data', (data) => {
                    const output = data.toString('utf-8')
                    stdout += output
                    engineLogOutputFileAndUI(win, output)
                })

                subprocess.stderr.on('data', (data) => {
                    const output = data.toString('utf-8')
                    stderr += output
                    engineLogOutputFileAndUI(win, output)
                })

                subprocess.on('error', (error) => {
                    clearTimeout(timeoutId)
                    engineLogOutputFileAndUI(win, `----- 检查随机密码模式失败 -----`)
                    engineLogOutputFileAndUI(win, `错误: ${error.message}`)
                    reject(`${error.message}`)
                })

                subprocess.on('close', (code) => {
                    clearTimeout(timeoutId)
                    const combinedOutput = stdout + stderr

                    if (code !== 0) {
                        engineLogOutputFileAndUI(win, `----- 检查随机密码模式失败，退出码: ${code} -----`)
                        reject(combinedOutput)
                        return
                    }

                    // 检查输出是否包含成功标志
                    if (combinedOutput.includes('[SUCCESS] Local GRPC server with secret authentication test passed')) {
                        engineLogOutputFileAndUI(win, `----- 随机密码模式检查通过 -----`)
                        resolve(true)
                    } else {
                        engineLogOutputFileAndUI(win, `----- 随机密码模式检查失败，输出不符合预期 -----`)
                        reject(combinedOutput)
                    }
                })
            } catch (e) {
                engineLogOutputFileAndUI(win, `----- 执行检查命令时发生异常 -----`)
                engineLogOutputFileAndUI(win, `${e}`)
                reject(`${e}`)
            }
        })
    }
    ipcMain.handle("check-allow-secret-local-yaklang-engine", async (e) => {
        return await asyncAllowSecretLocal()
    })

    ipcMain.handle("start-secret-local-yaklang-engine", async(e, params) => {
        return await asyncStartSecretLocalYakEngineServer(win, params)
    })

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
        engineLogOutputFileAndUI(win, `原始参数为: ${JSON.stringify(params)}`)
        engineLogOutputFileAndUI(win, `开始连接引擎地址为：${addr} Host: ${hostRaw} Port: ${portFromRaw}`)
        GLOBAL_YAK_SETTING.defaultYakGRPCAddr = addr

        callback(
            GLOBAL_YAK_SETTING.defaultYakGRPCAddr,
            Buffer.from(params["PemBytes"] === undefined ? "" : params["PemBytes"]).toString("utf-8"),
            params["Password"] || ""
        )
        return await new Promise((resolve, reject) => {
            newClient().Echo({text: ECHO_TEST_MSG}, (err, data) => {
                if (err) {
                    reject(err + "")
                    return
                }
                if (data["result"] === ECHO_TEST_MSG) {
                    resolve(data)
                } else {
                    reject(`ECHO ${ECHO_TEST_MSG} ERROR`)
                }
            })
        })
    })

    /** 输出到欢迎界面的日志中 */
    ipcMain.handle("output-log-to-welcome-console", (e, msg) => {
        engineLogOutputUI(win, `${msg}`, true)
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
