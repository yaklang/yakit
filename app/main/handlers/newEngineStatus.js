const {ipcMain} = require("electron")
const childProcess = require("child_process")
const {GLOBAL_YAK_SETTING} = require("../state")
const {getLocalYaklangEngine, YakitProjectPath} = require("../filePath")
const {engineLogOutputFileAndUI, engineLogOutputUI} = require("../logFile")

// 引擎连接过程中涉及到能中断的执行任务
const runningTasks = new Map()

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
        /** check校验 */
        const asyncAllowSecretLocal = async (win, params) => {
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
                    let successDetected = false
                    const taskKey = "check_" + checkId
                    let cleaned = false

                    const killFun = (timeOut = false) => {
                        if (killed) return
                        killed = true
                        cleanTask()
                        clearTimeout(timeoutId)
                        !timeOut && engineLogOutputFileAndUI(win, `----- 执行中止 check -----`)
                        try {
                            subprocess.kill()
                            if (process.platform === "win32") {
                                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
                            } else {
                                process.kill(subprocess.pid, "SIGKILL")
                            }
                        } catch {}
                    }

                    runningTasks.set(taskKey, killFun)

                    const cleanTask = () => {
                        if (cleaned) return
                        cleaned = true
                        runningTasks.delete(taskKey)
                    }

                    const timeoutId = setTimeout(() => {
                        if (checkId !== currentCheckId || successDetected || killed) return
                        killFun(true)
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
                        cleanTask()
                        clearTimeout(timeoutId)
                        engineLogOutputFileAndUI(win, `----- 检查随机密码模式失败 -----`)
                        engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
                        reject({status: "process_error", message: error.message})
                    })

                    subprocess.on("close", (code) => {
                        if (checkId !== currentCheckId || killed) return
                        cleanTask()
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
                            successDetected = true
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
        /** 修复数据库 */
        const asyncFixupDatabase = async (win, params) => {
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
                    let successDetected = false

                    const killFun = () => {
                        if (killed) return
                        killed = true
                        clearTimeout(timeoutId)
                        try {
                            subprocess.kill()
                            if (process.platform === "win32") {
                                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
                            } else {
                                process.kill(subprocess.pid, "SIGKILL")
                            }
                        } catch {}
                    }

                    const timeoutId = setTimeout(() => {
                        if (checkId !== currentFixId || successDetected || killed) return
                        killFun()
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
                            successDetected = true
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

        let currentReclaimId = 0 // 全局任务标识
        /** 回收数据空间 */
        const asyncReclaimDatabaseSpace = async (win, params) => {
            const checkId = ++currentReclaimId // 本次任务唯一 ID
            const {dbPath} = params

            return new Promise((resolve, reject) => {
                try {
                    const command = getLocalYaklangEngine()
                    const args = ["vacuum-sqlite"]
                    dbPath.forEach((item) => {
                        args.push("--db-file")
                        args.push(item)
                    })

                    engineLogOutputFileAndUI(win, `----- 回收数据库空间 -----`)
                    engineLogOutputFileAndUI(win, `执行命令: ${command} ${args.join(" ")}`)

                    const subprocess = childProcess.spawn(command, args, {
                        stdio: ["ignore", "pipe", "pipe"],
                        env: {YAK_VACUUM_SQLITE_JSON: true}
                    })

                    let stdout = ""
                    let stderr = ""

                    subprocess.stdout.on("data", (data) => {
                        if (checkId !== currentReclaimId) return // 已过期任务不打印
                        const output = data.toString("utf-8")
                        stdout += output
                        engineLogOutputFileAndUI(win, output)
                    })

                    subprocess.stderr.on("data", (data) => {
                        if (checkId !== currentReclaimId) return
                        const output = data.toString("utf-8")
                        stderr += output
                        engineLogOutputFileAndUI(win, output)
                    })

                    subprocess.on("error", (error) => {
                        if (checkId !== currentReclaimId) return
                        engineLogOutputFileAndUI(win, `----- 回收数据库空间失败 -----`)
                        engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
                        reject({status: "process_error", message: error.message})
                    })

                    const formatBytes = (bytes, fractionDigits = 2) => {
                        if (bytes === 0) return "0 B"
                    
                        const abs = Math.abs(bytes)
                        const units = ["B", "KB", "MB", "GB", "TB", "PB"]
                    
                        let unitIndex = 0
                        let value = abs
                    
                        while (value >= 1024 && unitIndex < units.length - 1) {
                            value /= 1024
                            unitIndex++
                        }
                    
                        const sign = bytes < 0 ? "-" : ""
                    
                        return `${sign}${value.toFixed(fractionDigits)} ${units[unitIndex]}`
                    }

                    const formatVacuumResultToHumanLog = (result) => {
                        const logs = []

                        logs.push("----- 数据库空间回收已完成 -----")
                        logs.push(`数据库数量：${result.total_databases}`)
                        logs.push(`成功处理：${result.successful}`)
                        logs.push(`失败：${result.failed}`)
                        logs.push("")

                        result.databases.forEach((db) => {
                            const delta = formatBytes(db.saved_bytes)

                            logs.push(`路径：${db.path}`)

                            if (db.success) {
                                if (db.saved_bytes > 0) {
                                    logs.push(`空间变化：减少 ${delta}`)
                                } else if (db.saved_bytes < 0) {
                                    logs.push(`空间变化：增加 ${formatBytes(-db.saved_bytes)}`)
                                } else {
                                    logs.push("空间变化：无变化")
                                }
                            } else {
                                logs.push("状态：处理失败")
                            }

                            logs.push("")
                        })

                        if (result.total_databases > 1) {
                            const totalDelta = formatBytes(result.total_saved_bytes)
                            if (result.total_saved_bytes > 0) {
                                logs.push(`总体空间变化：减少 ${totalDelta}`)
                            } else if (result.total_saved_bytes < 0) {
                                logs.push(`总体空间变化：增加 ${formatBytes(-result.total_saved_bytes)}`)
                            } else {
                                logs.push("总体空间变化：无变化")
                            }
                        }

                        logs.push("--------------------------------------")

                        return logs
                    }

                    subprocess.on("close", (code) => {
                        if (checkId !== currentReclaimId) return
                        const combinedOutput = (stdout + stderr).trim()
                        engineLogOutputFileAndUI(win, `----- 回收数据库空间结束，退出码: ${code} -----`)
                        // 提取 JSON
                        const match = combinedOutput.match(
                            /<52ed804604e783e3b12860e8676f78a1>\s*(\{[\s\S]*?\})\s*<52ed804604e783e3b12860e8676f78a1>/
                        )
                        let json = null
                        if (match) {
                            try {
                                json = JSON.parse(match[1].trim())
                            } catch (e) {
                                engineLogOutputFileAndUI(win, `JSON 解析失败: ${e.message}`)
                            }
                        }

                        if (json) {
                            const humanLogs = formatVacuumResultToHumanLog(json)
                            humanLogs.forEach((line) => {
                                engineLogOutputFileAndUI(win, line)
                            })
                            return resolve({status: "success", json})
                        }

                        engineLogOutputFileAndUI(win, `----- 回收数据库空间失败 -----`)
                        reject({status: "unknown", message: "未知错误，请查看详细日志信息"})
                    })
                } catch (e) {
                    if (checkId !== currentReclaimId) return
                    engineLogOutputFileAndUI(win, `----- 执行回收数据库空间发生异常 -----`)
                    engineLogOutputFileAndUI(win, `exception：${e}`)
                    reject({status: "exception", message: e.message || String(e)})
                }
            }).catch(async (err) => {
                return Promise.reject({ok: false, ...err})
            })
        }
        ipcMain.handle(ipcEventPre + "reclaimDatabaseSpace", async (e, params) => {
            try {
                const result = await asyncReclaimDatabaseSpace(win, params)
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
        /** 启动引擎 */
        const asyncStartSecretLocalYakEngineServer = async (win, params) => {
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
                    const taskKey = "start_" + checkId
                    let cleaned = false
                    let pollIntervalId = null
                    const timeoutMs = 60000 // 增加到 60 秒，配合轮询检测

                    /** 轮询检测引擎连接状态 */
                    const startConnectionPolling = () => {
                        engineLogOutputFileAndUI(win, `开始轮询检测引擎连接状态 (每 2 秒一次)...`)
                        win.webContents.send("startUp-engine-msg", "正在等待引擎完全启动")

                        pollIntervalId = setInterval(() => {
                            if (successDetected || killed || checkId !== currentStartId) {
                                cleanup()
                                return
                            }

                            // 尝试连接引擎
                            const addr = `127.0.0.1:${port}`
                            engineLogOutputFileAndUI(win, `轮询尝试连接引擎: ${addr}`)

                            try {
                                callback(addr, "", password)
                                newClient().Echo({text: ECHO_TEST_MSG}, (err, data) => {
                                    if (successDetected || killed) return

                                    if (err) {
                                        engineLogOutputFileAndUI(win, `轮询连接失败，继续等待...`)
                                        return
                                    }

                                    if (data && data["result"] === ECHO_TEST_MSG) {
                                        onSuccess(
                                            "引擎启动成功（通过连接检测）",
                                            `轮询检测到引擎连接成功 (Echo 测试通过)！`
                                        )
                                    }
                                })
                            } catch (e) {
                                engineLogOutputFileAndUI(win, `轮询连接异常: ${e.message || e}`)
                            }
                        }, 2000) // 每 2 秒检测一次
                    }
                    // 延迟 2 秒开始轮询，给引擎一点启动时间
                    setTimeout(() => {
                        if (!successDetected && !killed && checkId === currentStartId) {
                            startConnectionPolling()
                        }
                    }, 2000)
                    /** 清理轮询 */
                    const cleanup = () => {
                        if (pollIntervalId) {
                            clearInterval(pollIntervalId)
                            pollIntervalId = null
                        }
                    }

                    const killFun = (timeOut = false) => {
                        if (killed) return
                        killed = true
                        cleanup()
                        cleanTask()
                        clearTimeout(timeoutId)
                        !timeOut && engineLogOutputFileAndUI(win, `----- 执行中止 启动本地引擎  -----`)
                        try {
                            subprocess.kill()
                            if (process.platform === "win32") {
                                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
                            } else {
                                process.kill(subprocess.pid, "SIGKILL")
                            }
                        } catch {}
                    }

                    runningTasks.set(taskKey, killFun)
                    const cleanTask = () => {
                        if (cleaned) return
                        cleaned = true
                        runningTasks.delete(taskKey)
                    }

                    const timeoutId = setTimeout(() => {
                        if (checkId !== currentStartId || successDetected || killed) return
                        killFun(true)
                        engineLogOutputFileAndUI(win, `----- 启动本地引擎超时 (60s) -----`)
                        reject({status: "timeout", message: "启动本地引擎超时"})
                    }, timeoutMs)

                    /** 成功回调，确保只触发一次 */
                    const onSuccess = (msg1, msg2) => {
                        if (checkId !== currentStartId || successDetected || killed) return
                        successDetected = true
                        cleanup()
                        cleanTask()
                        clearTimeout(timeoutId)
                        engineLogOutputFileAndUI(win, msg2)
                        resolve({status: "success", msg1})
                    }

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
                            win.webContents.send("startUp-engine-msg", "数据库正在初始化中...")
                        }

                        // 保留原有的 yak grpc ok 检测方式
                        if (/yak grpc ok/i.test(output)) {
                            onSuccess("引擎启动成功（通过 yak grpc ok 检测）", `检测到 'yak grpc ok'，引擎启动成功！`)
                        }
                    })

                    subprocess.stderr.on("data", (data) => {
                        if (checkId !== currentStartId) return
                        const output = data.toString("utf-8")
                        stderr += output
                        engineLogOutputFileAndUI(win, output)
                    })

                    process.on("exit", () => {
                        killFun()
                    })

                    subprocess.on("error", (err) => {
                        if (checkId !== currentStartId) return
                        cleanup()
                        cleanTask()
                        clearTimeout(timeoutId)
                        engineLogOutputFileAndUI(win, `启动引擎出错: ${err.message}`)
                        win.webContents.send("start-yaklang-engine-error", `本地引擎遭遇错误，错误原因为：${err}`)
                        reject({status: "process_error", message: err.message})
                    })

                    subprocess.on("close", (code) => {
                        if (checkId !== currentStartId || killed || successDetected) return
                        cleanup()
                        cleanTask()
                        clearTimeout(timeoutId)
                        engineLogOutputFileAndUI(win, `----- 引擎进程退出，退出码: ${code} -----`)
                        reject({status: "exit", message: `引擎进程提前退出 (${code})`})
                    })
                } catch (e) {
                    reject({status: "exception", message: e.message || String(e)})
                }
            }).catch(async (err) => {
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

        // 中断连接 取消所有正在执行的任务
        ipcMain.handle(ipcEventPre + "cancel-all-tasks", () => {
            if (runningTasks.size === 0) {
                return {ok: true, canceled: 0}
            }

            let count = 0

            for (const [, cancel] of runningTasks) {
                try {
                    cancel()
                    count++
                } catch {}
            }

            runningTasks.clear()

            return {
                ok: true,
                canceled: count
            }
        })
    }
}
