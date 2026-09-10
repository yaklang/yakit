const { ipcMain } = require('electron')
const childProcess = require('child_process')
const { GLOBAL_YAK_SETTING } = require('../state')
const { getLocalYaklangEngine, getYakitHome } = require('../filePath')
const { engineLogOutputFileAndUI, engineLogOutputUI } = require('../logFile')
const { createEngineStartup, validLocalPassword } = require('./utils/engineStartup')

// 引擎连接过程中涉及到能中断的执行任务
const runningTasks = new Map()

/** 各版本下的数据库环境变量 */
const DefaultDBFileEnv = {
  irify: {
    YAK_DEFAULT_PROFILE_DATABASE_NAME: 'irify-profile-rule.db',
    YAK_DEFAULT_PROJECT_DATABASE_NAME: 'default-irify.db',
    SSA_DATABASE_RAW: 'default-yakssa.db',
  },
  memfit: {
    YAK_DEFAULT_PROJECT_DATABASE_NAME: 'default-memfit.db',
  },
}

module.exports = {
  registerNewIPC: (win, callback, getClient, newClient, ipcEventPre) => {
    /** 输出到欢迎界面的日志中 */
    ipcMain.handle(ipcEventPre + 'output-log-to-welcome-console', (e, msg) => {
      engineLogOutputUI(win, `${msg}`, true)
    })

    const startup = createEngineStartup({
      getCommand: getLocalYaklangEngine,
      getEnv: (softwareVersion) => ({
        ...process.env,
        YAKIT_HOME: getYakitHome(),
        ...(DefaultDBFileEnv[softwareVersion] || {}),
      }),
      createClient: (connection) => newClient(connection),
      commitConnection: ({ defaultYakGRPCAddr, caPem, password }) => {
        callback(defaultYakGRPCAddr, caPem, password)
        GLOBAL_YAK_SETTING.defaultYakGRPCAddr = defaultYakGRPCAddr
      },
      log: (message) => engineLogOutputFileAndUI(win, message),
      notify: (message) => {
        if (!win.isDestroyed()) win.webContents.send('startUp-engine-msg', message)
      },
    })
    process.once('exit', startup.killOnExit)
    win.once('closed', () => {
      void startup.dispose().finally(() => process.removeListener('exit', startup.killOnExit))
    })
    ipcMain.handle(ipcEventPre + 'check-allow-secret-local-yaklang-engine', (e, params) => startup.check(params))

    let currentFixId = 0 // 全局任务标识
    /** 修复数据库 */
    const asyncFixupDatabase = async (win, params) => {
      const checkId = ++currentFixId // 本次任务唯一 ID

      return new Promise((resolve, reject) => {
        try {
          const { softwareVersion } = params
          const command = getLocalYaklangEngine()
          const args = ['fixup-database']

          engineLogOutputFileAndUI(win, `----- 启动修复数据库 -----`)
          engineLogOutputFileAndUI(win, `执行命令: ${command} ${args.join(' ')}`)

          const defaltEnv = { ...process.env, YAKIT_HOME: getYakitHome() }
          const subprocess = childProcess.spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...defaltEnv, ...(DefaultDBFileEnv[softwareVersion] || {}) },
          })

          let stdout = ''
          let stderr = ''
          const timeoutMs = 11000
          let killed = false
          let successDetected = false

          const killFun = () => {
            if (killed) return
            killed = true
            clearTimeout(timeoutId)
            try {
              subprocess.kill()
              if (process.platform === 'win32') {
                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
              } else {
                process.kill(subprocess.pid, 'SIGKILL')
              }
            } catch {}
          }

          const timeoutId = setTimeout(() => {
            if (checkId !== currentFixId || successDetected || killed) return
            killFun()
            engineLogOutputFileAndUI(win, `----- 修复数据库超时 -----`)
            reject({ status: 'timeout', message: '修复数据库超时' })
          }, timeoutMs)

          subprocess.stdout.on('data', (data) => {
            if (checkId !== currentFixId) return // 已过期任务不打印
            const output = data.toString('utf-8')
            stdout += output
            engineLogOutputFileAndUI(win, output)
          })

          subprocess.stderr.on('data', (data) => {
            if (checkId !== currentFixId) return
            const output = data.toString('utf-8')
            stderr += output
            engineLogOutputFileAndUI(win, output)
          })

          subprocess.on('error', (error) => {
            if (checkId !== currentFixId) return
            clearTimeout(timeoutId)
            engineLogOutputFileAndUI(win, `----- 修复数据库失败 -----`)
            engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
            reject({ status: 'process_error', message: error.message })
          })

          subprocess.on('close', (code) => {
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
              return resolve({ status: 'success', json })
            }

            if (json && json.ok === false) {
              const msg = json.info
              engineLogOutputFileAndUI(win, `----- 修复失败: fix_database_error：${msg} -----`)
              return reject({
                status: 'fix_database_error',
                message: msg,
                json: json,
              })
            }

            engineLogOutputFileAndUI(win, `----- 修复数据库失败 -----`)
            reject({ status: 'unknown', message: '未知错误，请查看详细日志信息' })
          })
        } catch (e) {
          if (checkId !== currentFixId) return
          engineLogOutputFileAndUI(win, `----- 执行修复数据库命令时发生异常 -----`)
          engineLogOutputFileAndUI(win, `exception：${e}`)
          reject({ status: 'exception', message: e.message || String(e) })
        }
      }).catch(async (err) => {
        return Promise.reject({ ok: false, ...err })
      })
    }
    ipcMain.handle(ipcEventPre + 'fixup-database', async (e, params) => {
      try {
        const result = await asyncFixupDatabase(win, params)
        return { ok: true, ...result }
      } catch (err) {
        const safeError = typeof err === 'object' && err !== null ? err : { message: String(err) }
        return {
          ok: false,
          status: safeError.status,
          message: safeError.message,
          json: safeError.json || null,
        }
      }
    })

    let currentReclaimId = 0 // 全局任务标识
    /** 回收数据空间 */
    const asyncReclaimDatabaseSpace = async (win, params) => {
      const checkId = ++currentReclaimId // 本次任务唯一 ID
      const { dbPath } = params

      return new Promise((resolve, reject) => {
        try {
          const command = getLocalYaklangEngine()
          const args = ['vacuum-sqlite']
          dbPath.forEach((item) => {
            args.push('--db-file')
            args.push(item)
          })

          engineLogOutputFileAndUI(win, `----- 回收数据库空间 -----`)
          engineLogOutputFileAndUI(win, `执行命令: ${command} ${args.join(' ')}`)

          const subprocess = childProcess.spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { YAK_VACUUM_SQLITE_JSON: true },
          })

          let stdout = ''
          let stderr = ''

          subprocess.stdout.on('data', (data) => {
            if (checkId !== currentReclaimId) return // 已过期任务不打印
            const output = data.toString('utf-8')
            stdout += output
            engineLogOutputFileAndUI(win, output)
          })

          subprocess.stderr.on('data', (data) => {
            if (checkId !== currentReclaimId) return
            const output = data.toString('utf-8')
            stderr += output
            engineLogOutputFileAndUI(win, output)
          })

          subprocess.on('error', (error) => {
            if (checkId !== currentReclaimId) return
            engineLogOutputFileAndUI(win, `----- 回收数据库空间失败 -----`)
            engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
            reject({ status: 'process_error', message: error.message })
          })

          const formatBytes = (bytes, fractionDigits = 2) => {
            if (bytes === 0) return '0 B'

            const abs = Math.abs(bytes)
            const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

            let unitIndex = 0
            let value = abs

            while (value >= 1024 && unitIndex < units.length - 1) {
              value /= 1024
              unitIndex++
            }

            const sign = bytes < 0 ? '-' : ''

            return `${sign}${value.toFixed(fractionDigits)} ${units[unitIndex]}`
          }

          const formatVacuumResultToHumanLog = (result) => {
            const logs = []

            logs.push('----- 数据库空间回收已完成 -----')
            logs.push(`数据库数量：${result.total_databases}`)
            logs.push(`成功处理：${result.successful}`)
            logs.push(`失败：${result.failed}`)
            logs.push('')

            result.databases.forEach((db) => {
              const delta = formatBytes(db.saved_bytes)

              logs.push(`路径：${db.path}`)

              if (db.success) {
                if (db.saved_bytes > 0) {
                  logs.push(`空间变化：减少 ${delta}`)
                } else if (db.saved_bytes < 0) {
                  logs.push(`空间变化：增加 ${formatBytes(-db.saved_bytes)}`)
                } else {
                  logs.push('空间变化：无变化')
                }
              } else {
                logs.push('状态：处理失败')
              }

              logs.push('')
            })

            if (result.total_databases > 1) {
              const totalDelta = formatBytes(result.total_saved_bytes)
              if (result.total_saved_bytes > 0) {
                logs.push(`总体空间变化：减少 ${totalDelta}`)
              } else if (result.total_saved_bytes < 0) {
                logs.push(`总体空间变化：增加 ${formatBytes(-result.total_saved_bytes)}`)
              } else {
                logs.push('总体空间变化：无变化')
              }
            }

            logs.push('--------------------------------------')

            return logs
          }

          subprocess.on('close', (code) => {
            if (checkId !== currentReclaimId) return
            const combinedOutput = (stdout + stderr).trim()
            engineLogOutputFileAndUI(win, `----- 回收数据库空间结束，退出码: ${code} -----`)
            // 提取 JSON
            const match = combinedOutput.match(
              /<52ed804604e783e3b12860e8676f78a1>\s*(\{[\s\S]*?\})\s*<52ed804604e783e3b12860e8676f78a1>/,
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
              return resolve({ status: 'success', json })
            }

            engineLogOutputFileAndUI(win, `----- 回收数据库空间失败 -----`)
            reject({ status: 'unknown', message: '未知错误，请查看详细日志信息' })
          })
        } catch (e) {
          if (checkId !== currentReclaimId) return
          engineLogOutputFileAndUI(win, `----- 执行回收数据库空间发生异常 -----`)
          engineLogOutputFileAndUI(win, `exception：${e}`)
          reject({ status: 'exception', message: e.message || String(e) })
        }
      }).catch(async (err) => {
        return Promise.reject({ ok: false, ...err })
      })
    }
    ipcMain.handle(ipcEventPre + 'reclaimDatabaseSpace', async (e, params) => {
      try {
        const result = await asyncReclaimDatabaseSpace(win, params)
        return { ok: true, ...result }
      } catch (err) {
        const safeError = typeof err === 'object' && err !== null ? err : { message: String(err) }
        return {
          ok: false,
          status: safeError.status,
          message: safeError.message,
          json: safeError.json || null,
        }
      }
    })

    /** Probe with an isolated client; commit global credentials only after authentication. */
    ipcMain.handle(ipcEventPre + 'connect-yaklang-engine', async (e, params) => {
      const hostRaw = String(params.Host || '127.0.0.1')
      let host = hostRaw
      let port = params.Port
      const hostWithPort = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(hostRaw)
      if (hostWithPort) [, host, port] = hostWithPort
      if (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535 || /[\s/\\]/.test(host)) {
        throw new Error('引擎连接地址无效')
      }
      if (params.Mode === 'local' && (host !== '127.0.0.1' || !validLocalPassword(params.Password))) {
        throw new Error('本地引擎连接参数无效，请重新检查引擎')
      }
      const address = `${host.includes(':') && !host.startsWith('[') ? `[${host}]` : host}:${port}`
      const result = await startup.connect({
        defaultYakGRPCAddr: address,
        caPem: Buffer.from(params.PemBytes || '').toString('utf8'),
        password: params.Password || '',
      })
      if (!result.ok) throw new Error(result.message)
      return result.data
    })
    ipcMain.handle(ipcEventPre + 'start-secret-local-yaklang-engine', (e, params) => startup.start(params))

    // 中断连接 取消所有正在执行的任务
    ipcMain.handle(ipcEventPre + 'cancel-all-tasks', async () => {
      const engineCanceled = await startup.dispose()
      if (runningTasks.size === 0) {
        return { ok: true, canceled: engineCanceled }
      }

      let count = engineCanceled

      for (const [, cancel] of runningTasks) {
        try {
          cancel()
          count++
        } catch {}
      }

      runningTasks.clear()

      return {
        ok: true,
        canceled: count,
      }
    })
  },
}
