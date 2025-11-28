const {ipcMain} = require("electron")
const childProcess = require("child_process")
const {GLOBAL_YAK_SETTING} = require("../state")
const {getLocalYaklangEngine, YakitProjectPath} = require("../filePath")
const {engineLogOutputFileAndUI, engineLogOutputUI} = require("../logFile")

const ECHO_TEST_MSG = "Hello Yakit!"

/** 各版本下的数据库环境变量 */
const DefaultDBFileEnv = {
    irify: {
        YAK_DEFAULT_PROFILE_DATABASE_NAME: "irify-profile-rule.db",
        YAK_DEFAULT_PROJECT_DATABASE_NAME: "default-irify.db",
        SSA_DATABASE_RAW: "default-yakssa.db"
    },
    memfit: {
        YAK_DEFAULT_PROJECT_DATABASE_NAME: "default-memfit.db"
    }
}

module.exports = {
    registerNewIPC: (win, callback, getClient, newClient, ipcEventPre) => {
        /** 输出到欢迎界面的日志中 */
        ipcMain.handle(ipcEventPre + "output-log-to-welcome-console", (e, msg) => {
            engineLogOutputUI(win, `${msg}`, true)
        })

        let currentCheckId = 0 // 全局任务标识
        const asyncAllowSecretLocal = async (win, params, attempt = 1, maxRetry = 3) => {
            const checkId = ++currentCheckId // 本次任务唯一 ID

            return new Promise((resolve, reject) => {
                try {
                    const {port, softwareVersion} = params
                    const command = getLocalYaklangEngine()
                    const args = ["check-secret-local-grpc", "--port", String(port)]

                    engineLogOutputFileAndUI(win, `----- 检查本地随机密码模式支持 -----`)
                    engineLogOutputFileAndUI(win, `执行命令: ${command} ${args.join(" ")}`)

                    const defaltEnv = {...process.env, YAKIT_HOME: YakitProjectPath}
                    const subprocess = childProcess.spawn(command, args, {
                        stdio: ["ignore", "pipe", "pipe"],
                        env: {...defaltEnv, ...(DefaultDBFileEnv[softwareVersion] || {})}
                    })

                    let stdout = ""
                    let stderr = ""
                    const timeoutMs = 11000
                    let killed = false

                    const timeoutId = setTimeout(() => {
                        killed = true
                        subprocess.kill()
                        try {
                            if (process.platform === "win32") {
                                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
                            } else {
                                process.kill(subprocess.pid, "SIGKILL")
                            }
                        } catch {}
                        engineLogOutputFileAndUI(win, `----- 检查随机密码模式超时 -----`)
                        reject({status: "timeout", message: "检查随机密码模式超时"})
                    }, timeoutMs)

                    subprocess.stdout.on("data", (data) => {
                        if (checkId !== currentCheckId) return // 已过期任务不打印
                        const output = data.toString("utf-8")
                        stdout += output
                        engineLogOutputFileAndUI(win, output)
                    })

                    subprocess.stderr.on("data", (data) => {
                        if (checkId !== currentCheckId) return
                        const output = data.toString("utf-8")
                        stderr += output
                        engineLogOutputFileAndUI(win, output)
                    })

                    subprocess.on("error", (error) => {
                        if (checkId !== currentCheckId) return
                        clearTimeout(timeoutId)
                        engineLogOutputFileAndUI(win, `----- 检查随机密码模式失败 -----`)
                        engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
                        reject({status: "process_error", message: error.message})
                    })

                    subprocess.on("close", (code) => {
                        if (checkId !== currentCheckId || killed) return

                        clearTimeout(timeoutId)
                        const combinedOutput = (stdout + stderr).trim()
                        engineLogOutputFileAndUI(win, `----- 检查随机密码模式结束，退出码: ${code} -----`)

                        // 提取 JSON
                        const match = combinedOutput.match(/<json-[\w-]+>([\s\S]*?)<\/json-[\w-]+>/)
                        let json = null
                        if (match) {
                            try {
                                json = JSON.parse(match[1].trim())
                            } catch (e) {
                                engineLogOutputFileAndUI(win, `JSON 解析失败: ${e.message}`)
                            }
                        }

                        if (json && json.ok === true) {
                            engineLogOutputFileAndUI(win, `----- 随机密码模式检查通过 -----`)
                            return resolve({status: "success", json})
                        }

                        if (json && json.ok === false) {
                            const reasons = Array.isArray(json.reason)
                                ? json.reason.map((r) => String(r))
                                : [String(json.reason || json.info || combinedOutput || "")]
                            const has = (keyword) => reasons.some((r) => r.includes(keyword))

                            if (has("net.Listen(tcp, addr) failed")) {
                                const msg = `端口 ${params.port} 已被占用，请检查是否已有其他 Yakit 实例或进程正在运行，建议用户手动释放或修改端口。`
                                engineLogOutputFileAndUI(win, `----- 检查失败: ${msg} -----`)
                                return reject({status: "port_occupied", message: msg, json})
                            } else if (has("build yak grpc server failed")) {
                                const msg = json.info
                                engineLogOutputFileAndUI(
                                    win,
                                    `----- 检查失败: build yak grpc server failed：${msg} -----`
                                )
                                return reject({
                                    status: "build_yak_error",
                                    message: msg,
                                    json
                                })
                            } else if (has("database error")) {
                                const msg = json.info
                                engineLogOutputFileAndUI(win, `----- 检查失败: database error：${msg} -----`)
                                return reject({
                                    status: "database_error",
                                    message: msg,
                                    json
                                })
                            } else if (has("dial grpc server failed")) {
                                // 远程，目前没有check处理
                                const msg = json.info
                                engineLogOutputFileAndUI(win, `----- 检查失败: dial grpc server failed：${msg} -----`)
                                return reject({
                                    status: "dial_error",
                                    message: msg,
                                    json
                                })
                            } else if (has("call Version RPC failed")) {
                                // 远程，目前没有check处理
                                const msg = json.info
                                engineLogOutputFileAndUI(win, `----- 检查失败: call Version RPC failed：${msg} -----`)
                                return reject({
                                    status: "call_error",
                                    message: msg,
                                    json
                                })
                            } else {
                                engineLogOutputFileAndUI(
                                    win,
                                    `----- 检查失败: unknownReason：${json.info || "未知原因"} -----`
                                )
                                return reject({
                                    status: "unknownReason",
                                    message: json.info || "未知原因",
                                    json
                                })
                            }
                        }

                        if (
                            !json &&
                            /(no such file or directory|The system cannot find the file specified)/i.test(
                                combinedOutput
                            )
                        ) {
                            engineLogOutputFileAndUI(win, `----- 检查失败：旧版本引擎不支持随机密码模式 -----`)
                            return reject({status: "old_version", message: "旧版本引擎不支持随机密码模式"})
                        }

                        if (!json && /(flag provided but not defined)/i.test(combinedOutput)) {
                            engineLogOutputFileAndUI(win, `----- 检查失败：旧版本无法支持某些参数 -----`)
                            return reject({status: "old_version", message: "旧版本无法支持某些参数"})
                        }

                        if (!json && !stdout && !stderr) {
                            engineLogOutputFileAndUI(win, `----- 检查失败：可能被杀软或防火墙拦截或无法找到引擎 -----`)
                            return reject({
                                status: "antivirus_blocked",
                                message: "可能被杀软或防火墙拦截或无法找到引擎"
                            })
                        }

                        engineLogOutputFileAndUI(win, `----- 检查随机密码模式失败 -----`)
                        reject({status: "unknown", message: "未知错误，请查看详细日志信息"})
                    })
                } catch (e) {
                    if (checkId !== currentCheckId) return
                    engineLogOutputFileAndUI(win, `----- 执行检查命令时发生异常 -----`)
                    engineLogOutputFileAndUI(win, `exception：${e}`)
                    reject({status: "exception", message: e.message || String(e)})
                }
            }).catch(async (err) => {
                // 超时重试逻辑
                // if (err.status === "timeout" && attempt < maxRetry) {
                //     const nextAttempt = attempt + 1
                //     engineLogOutputFileAndUI(
                //         win,
                //         `----- 第 ${attempt} 次超时，1 秒后重试（剩余 ${maxRetry - attempt} 次） -----`
                //     )
                //     await new Promise((r) => setTimeout(r, 1000))
                //     return asyncAllowSecretLocal(win, params, nextAttempt, maxRetry)
                // }

                return Promise.reject({ok: false, ...err})
            })
        }
        ipcMain.handle(ipcEventPre + "check-allow-secret-local-yaklang-engine", async (e, params) => {
            try {
                const result = await asyncAllowSecretLocal(win, params)
                return {ok: true, ...result}
            } catch (err) {
                const safeError = typeof err === "object" && err !== null ? err : {message: String(err)}
                return {
                    ok: false,
                    status: safeError.status,
                    message: safeError.message,
                    json: safeError.json || null
                }
            }
        })

        let currentFixId = 0 // 全局任务标识
        const asyncFixupDatabase = async (win, params, attempt = 1, maxRetry = 3) => {
            const checkId = ++currentFixId // 本次任务唯一 ID

            return new Promise((resolve, reject) => {
                try {
                    const {softwareVersion} = params
                    const command = getLocalYaklangEngine()
                    const args = ["fixup-database"]

                    engineLogOutputFileAndUI(win, `----- 启动修复数据库 -----`)
                    engineLogOutputFileAndUI(win, `执行命令: ${command} ${args.join(" ")}`)

                    const defaltEnv = {...process.env, YAKIT_HOME: YakitProjectPath}
                    const subprocess = childProcess.spawn(command, args, {
                        stdio: ["ignore", "pipe", "pipe"],
                        env: {...defaltEnv, ...(DefaultDBFileEnv[softwareVersion] || {})}
                    })

                    let stdout = ""
                    let stderr = ""
                    const timeoutMs = 11000
                    let killed = false

                    const timeoutId = setTimeout(() => {
                        killed = true
                        subprocess.kill()
                        try {
                            if (process.platform === "win32") {
                                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
                            } else {
                                process.kill(subprocess.pid, "SIGKILL")
                            }
                        } catch {}
                        engineLogOutputFileAndUI(win, `----- 修复数据库超时 -----`)
                        reject({status: "timeout", message: "修复数据库超时"})
                    }, timeoutMs)

                    subprocess.stdout.on("data", (data) => {
                        if (checkId !== currentFixId) return // 已过期任务不打印
                        const output = data.toString("utf-8")
                        stdout += output
                        engineLogOutputFileAndUI(win, output)
                    })

                    subprocess.stderr.on("data", (data) => {
                        if (checkId !== currentFixId) return
                        const output = data.toString("utf-8")
                        stderr += output
                        engineLogOutputFileAndUI(win, output)
                    })

                    subprocess.on("error", (error) => {
                        if (checkId !== currentFixId) return
                        clearTimeout(timeoutId)
                        engineLogOutputFileAndUI(win, `----- 修复数据库失败 -----`)
                        engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
                        reject({status: "process_error", message: error.message})
                    })

                    subprocess.on("close", (code) => {
                        if (checkId !== currentFixId || killed) return
                        clearTimeout(timeoutId)
                        const combinedOutput = (stdout + stderr).trim()
                        engineLogOutputFileAndUI(win, `----- 修复数据库结束，退出码: ${code} -----`)

                        // 提取 JSON
                        const match = combinedOutput.match(/<json-[\w-]+>([\s\S]*?)<\/json-[\w-]+>/)
                        let json = null
                        if (match) {
                            try {
                                json = JSON.parse(match[1].trim())
                            } catch (e) {
                                engineLogOutputFileAndUI(win, `JSON 解析失败: ${e.message}`)
                            }
                        }

                        if (json && json.ok === true) {
                            engineLogOutputFileAndUI(win, `----- 修复数据库成功 -----`)
                            return resolve({status: "success", json})
                        }

                        if (json && json.ok === false) {
                            const msg = json.info
                            engineLogOutputFileAndUI(win, `----- 修复失败: fix_database_error：${msg} -----`)
                            return reject({
                                status: "fix_database_error",
                                message: msg,
                                json: json
                            })
                        }

                        engineLogOutputFileAndUI(win, `----- 修复数据库失败 -----`)
                        reject({status: "unknown", message: "未知错误，请查看详细日志信息"})
                    })
                } catch (e) {
                    if (checkId !== currentFixId) return
                    engineLogOutputFileAndUI(win, `----- 执行修复数据库命令时发生异常 -----`)
                    engineLogOutputFileAndUI(win, `exception：${e}`)
                    reject({status: "exception", message: e.message || String(e)})
                }
            }).catch(async (err) => {
                // 超时重试逻辑
                // if (err.status === "timeout" && attempt < maxRetry) {
                //     const nextAttempt = attempt + 1
                //     engineLogOutputFileAndUI(
                //         win,
                //         `----- 第 ${attempt} 次超时，1 秒后重试（剩余 ${maxRetry - attempt} 次） -----`
                //     )
                //     await new Promise((r) => setTimeout(r, 1000))
                //     return asyncFixupDatabase(win, params, nextAttempt, maxRetry)
                // }

                return Promise.reject({ok: false, ...err})
            })
        }
        ipcMain.handle(ipcEventPre + "fixup-database", async (e, params) => {
            try {
                const result = await asyncFixupDatabase(win, params)
                return {ok: true, ...result}
            } catch (err) {
                const safeError = typeof err === "object" && err !== null ? err : {message: String(err)}
                return {
                    ok: false,
                    status: safeError.status,
                    message: safeError.message,
                    json: safeError.json || null
                }
            }
        })

        /** 连接引擎 */
        ipcMain.handle(ipcEventPre + "connect-yaklang-engine", async (e, params) => {
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
            let portFromRaw = `${params["Port"]}`
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

        let currentStartId = 0 // 全局启动任务标识
        const asyncStartSecretLocalYakEngineServer = async (win, params, attempt = 1, maxRetry = 3) => {
            const checkId = ++currentStartId
            const {version, port, password, isEnpriTraceAgent, softwareVersion} = params

            return new Promise((resolve, reject) => {
                engineLogOutputFileAndUI(win, `----- 启动本地引擎进程 (Random Local Password, Port: ${port})  -----`)

                try {
                    const grpcParams = [
                        "grpc",
                        "--local-password",
                        password,
                        "--frontend",
                        `${version || "yakit"}`,
                        "--port",
                        port
                    ]
                    const resultParams = isEnpriTraceAgent ? [...grpcParams, "--disable-output"] : grpcParams

                    const command = getLocalYaklangEngine()
                    engineLogOutputFileAndUI(win, `启动命令: ${command} ${resultParams.join(" ")}`)

                    const defaltEnv = {...process.env, YAKIT_HOME: YakitProjectPath}
                    const subprocess = childProcess.spawn(command, resultParams, {
                        detached: false,
                        windowsHide: true,
                        stdio: ["ignore", "pipe", "pipe"],
                        env: {...defaltEnv, ...(DefaultDBFileEnv[softwareVersion] || {})}
                    })

                    subprocess.unref()

                    let stdout = ""
                    let stderr = ""
                    let successDetected = false
                    let killed = false  
                    const timeoutMs = 20000

                    const timeoutId = setTimeout(() => {
                        if (successDetected || killed) return
                        killed = true
                        subprocess.kill()
                        try {
                            if (process.platform === "win32") {
                                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
                            } else {
                                process.kill(subprocess.pid, "SIGKILL")
                            }
                        } catch {}
                        engineLogOutputFileAndUI(win, `----- 启动本地引擎超时 -----`)
                        reject({status: "timeout", message: "启动本地引擎超时"})
                    }, timeoutMs)

                    subprocess.stdout.on("data", (data) => {
                        if (checkId !== currentStartId) return
                        const output = data.toString("utf-8")
                        stdout += output
                        engineLogOutputFileAndUI(win, output)

                        const regex =
                            /<json-f97f966eb7f8ba8fdb63e4d29109c058>(.*?)<json-f97f966eb7f8ba8fdb63e4d29109c058>/

                        const match = output.match(regex)

                        if (match) {
                            // 数据库正在初始化中...
                            engineLogOutputFileAndUI(win, `----- 数据库正在初始化中... -----`)
                            win.webContents.send("db-init-ing", '数据库正在初始化中...')
                        }

                        if (/yak grpc ok/i.test(output)) {
                            successDetected = true
                            clearTimeout(timeoutId)
                            engineLogOutputFileAndUI(win, `检测到 'yak grpc ok'，引擎启动成功！`)
                            resolve({status: "success", message: "引擎启动成功"})
                        }
                    })

                    subprocess.stderr.on("data", (data) => {
                        if (checkId !== currentStartId) return
                        const output = data.toString("utf-8")
                        stderr += output
                        engineLogOutputFileAndUI(win, output)
                    })

                    process.on("exit", () => {
                        subprocess.kill()
                        try {
                            if (process.platform === "win32") {
                                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
                            } else {
                                process.kill(subprocess.pid, "SIGKILL")
                            }
                        } catch {}
                    })

                    subprocess.on("error", (err) => {
                        if (checkId !== currentStartId) return
                        clearTimeout(timeoutId)
                        engineLogOutputFileAndUI(win, `启动引擎出错: ${err.message}`)
                        win.webContents.send("start-yaklang-engine-error", `本地引擎遭遇错误，错误原因为：${err}`)
                        reject({status: "process_error", message: err.message})
                    })

                    subprocess.on("close", (code) => {
                        if (checkId !== currentStartId || killed || successDetected) return
                        clearTimeout(timeoutId)
                        engineLogOutputFileAndUI(win, `----- 引擎进程退出，退出码: ${code} -----`)
                        reject({status: "exit", message: `引擎进程提前退出 (${code})`})
                    })
                } catch (e) {
                    reject({status: "exception", message: e.message || String(e)})
                }
            }).catch(async (err) => {
                // 超时或异常重试
                // if (attempt < maxRetry && (err.status === "timeout" || err.status === "exit")) {
                //     const nextAttempt = attempt + 1
                //     engineLogOutputFileAndUI(
                //         win,
                //         `----- 启动失败 (${err.status})，将在 1 秒后重试 (${nextAttempt}/${maxRetry}) -----`
                //     )
                //     await new Promise((r) => setTimeout(r, 1000))
                //     return asyncStartSecretLocalYakEngineServer(win, params, nextAttempt, maxRetry)
                // }

                return Promise.reject({ok: false, ...err})
            })
        }
        ipcMain.handle(ipcEventPre + "start-secret-local-yaklang-engine", async (e, params) => {
            try {
                const result = await asyncStartSecretLocalYakEngineServer(win, params)
                return {ok: true, ...result}
            } catch (err) {
                const safeError = typeof err === "object" && err !== null ? err : {message: String(err)}
                return {
                    ok: false,
                    status: safeError.status,
                    message: safeError.message
                }
            }
        })
    }
}
