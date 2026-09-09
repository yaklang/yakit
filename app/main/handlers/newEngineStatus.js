const { ipcMain } = require('electron')
const childProcess = require('child_process')
const { GLOBAL_YAK_SETTING } = require('../state')
const { getLocalYaklangEngine, getYakitHome } = require('../filePath')
const { engineLogOutputFileAndUI, engineLogOutputUI } = require('../logFile')

// 引擎连接过程中涉及到能中断的执行任务
const runningTasks = new Map()

const ECHO_TEST_MSG = 'Hello Yakit!'

// #region 引擎 stdout 事件解析

/**
 * 解析引擎 stdout 单行事件
 * 事件前缀:
 *   "yak grpc ready {JSON}"  — 成功,引擎已监听
 *   "yak grpc failed {JSON}" — 失败,引擎要退出
 *   "yak grpc ok"            — 旧文本标记,不再据此判定成功
 * @param {string} line 单行 stdout (已 trim)
 * @returns {object|null}
 */
function parseEngineStdoutLine(line) {
  if (line.startsWith('yak grpc ready ')) {
    try {
      const data = JSON.parse(line.substring('yak grpc ready '.length))
      return {
        type: 'ready',
        schemaVersion: data.schemaVersion,
        address: data.address,
        transport: data.transport || 'tcp',
        instanceId: data.instanceId,
        engineVersion: data.engineVersion,
        phaseI18n: data.phaseI18n,
      }
    } catch (e) {
      return null
    }
  }
  if (line.startsWith('yak grpc failed ')) {
    try {
      const data = JSON.parse(line.substring('yak grpc failed '.length))
      return {
        type: 'failed',
        schemaVersion: data.schemaVersion,
        phase: data.phase,
        reason: data.reason,
        reasonCode: data.reasonCode || '',
        elapsedMs: data.elapsedMs,
        version: data.version,
        phaseI18n: data.phaseI18n,
        reasonI18n: data.reasonI18n || null,
      }
    } catch (e) {
      return null
    }
  }
  if (line === 'yak grpc ok') {
    return { type: 'log_ok' }
  }
  return null
}

/**
 * 将引擎 failed 事件的 reasonCode + phase 映射到 status 值
 * @param {string} reasonCode
 * @param {string} phase
 * @returns {string}
 */
function mapEngineFailedToStatus(reasonCode, phase) {
  if (reasonCode === 'tcp_bind_in_use') return 'port_occupied'
  if (reasonCode === 'tcp_bind_denied') return 'port_denied'
  if (reasonCode === 'tcp_bind_failed') return 'endpoint_unreachable'
  if (phase === 'database') return 'database_error'
  if (phase === 'serve') return 'engine_exited'
  if (phase === 'build_server' || phase === 'cert' || phase === 'init') return 'engine_init_failed'
  return 'engine_failed'
}

/**
 * 从引擎输出中提取 reasonI18n 的中文文案
 * @param {object} reasonI18n - 引擎输出的 reasonI18n 字段
 * @returns {string} 中文文案，无值时返回空字符串
 */
function pickReasonZh(reasonI18n) {
  if (!reasonI18n) return ''
  return reasonI18n.zh || ''
}

/**
 * 从引擎输出中提取 phaseI18n 的中文文案
 * @param {object} phaseI18n - 引擎输出的 phaseI18n 字段
 * @returns {string} 中文文案，无值时返回空字符串
 */
function pickPhaseZh(phaseI18n) {
  if (!phaseI18n) return ''
  return phaseI18n.zh || ''
}

/**
 * 组装 check 阶段用户可读的 message
 * 引擎已在每个失败点直接设定 reasonI18n，主进程取来即用，不按 reasonCode 再拼文案。
 * 当前 dev 引擎的 check-secret JSON 有 phaseI18n 但尚未输出 reasonI18n，
 * 此时从 info 的 [reasonCode] 前缀 + phase 兜底拼文案。
 * buildin 旧引擎无 JSON 输出，走 old_version/antivirus_blocked 分支，不会进入此函数。
 * @param {object} json - check-secret-local-grpc 输出的 JSON
 * @param {string} reasonCode - 提取出的分类码（仅供日志/诊断）
 * @param {object} params - 调用参数（含 port）
 * @returns {string}
 */
function buildCheckMessage(json, reasonCode, params) {
  // 1. 优先用引擎提供的 reasonI18n（核心字段，取来即用）
  const reasonZh = pickReasonZh(json.reasonI18n)
  if (reasonZh) return reasonZh

  // 2. 当前 dev 引擎兜底：有 phaseI18n 但缺 reasonI18n，从 info 提取 + phase 拼文案
  const port = json.port || (params && params.port) || ''
  const phaseZh = pickPhaseZh(json.phaseI18n)
  const info = json.info || ''
  const portLabel = port ? `端口 ${port} ` : ''

  // 旧引擎根据 info 前缀判断具体场景
  const codeMatch = info.match(/^\[([a-z_]+)\]/)
  const legacyCode = codeMatch ? codeMatch[1] : ''
  if (legacyCode === 'tcp_bind_in_use') return `${portLabel}被占用，请结束旧进程或切换端口`
  if (legacyCode === 'tcp_bind_denied') return `${portLabel}被系统阻止，请以管理员身份运行或检查防火墙`
  if (legacyCode === 'tcp_bind_failed') return `${portLabel}监听失败，请检查网络配置`
  if (json.phase === 'database') return `数据库初始化失败，可点击修复进行处理`
  if (json.phase === 'build_server') return `引擎服务构建失败，请查看日志或联系支持`
  if (json.phase === 'dial') return `引擎连接失败，请查看日志详细信息`
  if (json.phase === 'version_rpc') return `引擎认证失败，请查看日志详细信息`
  if (json.phase === 'wait_connect') return `引擎服务就绪超时，请查看日志或重试`

  // 3. 最终兜底
  if (info) return info
  if (phaseZh) return `${phaseZh}失败，请查看日志详细信息`
  return '引擎环境检查失败，请查看日志详细信息'
}

/**
 * 组装 start 阶段用户可读的 message
 * 引擎已在每个失败点直接设定 reasonI18n，主进程取来即用，不按 reasonCode 再拼文案。
 * 当前 dev 引擎的 yak grpc failed 事件有 phaseI18n 但可能未输出 reasonI18n，
 * 此时从 reason 的 [reasonCode] 前缀 + phase 兜底拼文案。
 * buildin 旧引擎无 failed 事件输出，走轮询 + 进程退出码判定，不会进入此函数。
 * @param {object} event - 引擎 failed 事件 (parseEngineStdoutLine 输出)
 * @returns {string}
 */
function buildStartMessage(event) {
  if (!event) return '引擎启动失败，请查看日志详细信息'

  // 1. 优先用引擎提供的 reasonI18n（核心字段，取来即用）
  const reasonZh = pickReasonZh(event.reasonI18n)
  if (reasonZh) return reasonZh

  // 2. 当前 dev 引擎兜底：有 phaseI18n 但缺 reasonI18n，从 reason 提取 + phase 拼文案
  const phaseZh = pickPhaseZh(event.phaseI18n)
  const reason = event.reason || ''

  // 旧引擎根据 reason 前缀判断具体场景
  const codeMatch = reason.match(/^\[([a-z_]+)\]/)
  const legacyCode = codeMatch ? codeMatch[1] : ''
  if (legacyCode === 'tcp_bind_in_use') return `端口被另一个进程占用，请结束旧进程或切换端口`
  if (legacyCode === 'tcp_bind_denied') return `端口被系统策略阻止，请以管理员身份运行或检查防火墙`
  if (legacyCode === 'tcp_bind_failed') return `网络监听失败，请检查网络配置`
  if (event.phase === 'database') return `数据库初始化失败，可点击修复进行处理`
  if (event.phase === 'serve') return `引擎服务异常退出，请查看日志或重试`
  if (event.phase === 'build_server' || event.phase === 'cert') return `引擎服务构建失败，请查看日志或联系支持`

  // 3. 最终兜底
  if (reason) return reason
  if (phaseZh) return `${phaseZh}失败，请查看日志详细信息`
  return '引擎启动失败，请查看日志详细信息'
}

// #endregion

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

    let currentCheckId = 0 // 全局任务标识
    /** check校验 */
    const asyncAllowSecretLocal = async (win, params) => {
      const checkId = ++currentCheckId // 本次任务唯一 ID

      return new Promise((resolve, reject) => {
        try {
          const { port, softwareVersion } = params
          const command = getLocalYaklangEngine()
          const args = ['check-secret-local-grpc', '--port', String(port)]

          engineLogOutputFileAndUI(win, `----- 检查本地随机密码模式支持 -----`)
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
          const taskKey = 'check_' + checkId
          let cleaned = false

          const killFun = (timeOut = false) => {
            if (killed) return
            killed = true
            cleanTask()
            clearTimeout(timeoutId)
            !timeOut && engineLogOutputFileAndUI(win, `----- 执行中止 check -----`)
            try {
              subprocess.kill()
              if (process.platform === 'win32') {
                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
              } else {
                process.kill(subprocess.pid, 'SIGKILL')
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
            reject({ status: 'timeout', message: '引擎环境检查超时，请查看日志详细信息' })
          }, timeoutMs)

          subprocess.stdout.on('data', (data) => {
            if (checkId !== currentCheckId) return // 已过期任务不打印
            const output = data.toString('utf-8')
            stdout += output
            engineLogOutputFileAndUI(win, output)
          })

          subprocess.stderr.on('data', (data) => {
            if (checkId !== currentCheckId) return
            const output = data.toString('utf-8')
            stderr += output
            engineLogOutputFileAndUI(win, output)
          })

          subprocess.on('error', (error) => {
            if (checkId !== currentCheckId) return
            cleanTask()
            clearTimeout(timeoutId)
            engineLogOutputFileAndUI(win, `----- 检查随机密码模式失败 -----`)
            engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
            reject({ status: 'process_error', message: `引擎进程启动失败：${error.message}` })
          })

          subprocess.on('close', (code) => {
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
              return resolve({ status: 'success', json })
            }

            if (json && json.ok === false) {
              // 优先用引擎输出的 reasonCode（新引擎），兜底从 info 正则提取（旧引擎）
              let reasonCode = json.reasonCode || ''
              if (!reasonCode) {
                const infoStr = json.info || ''
                const codeMatch = infoStr.match(/^\[([a-z_]+)\]/)
                if (codeMatch) reasonCode = codeMatch[1]
                // 旧引擎 reason 常量映射
                if (!reasonCode) {
                  const reasonStr = Array.isArray(json.reason) ? json.reason[0] : json.reason || ''
                  if (reasonStr.includes('database')) reasonCode = 'database_error'
                  else if (reasonStr.includes('build yak grpc')) reasonCode = 'build_server_failed'
                  else if (reasonStr.includes('dial grpc')) reasonCode = 'dial_failed'
                  else if (reasonStr.includes('Version RPC')) reasonCode = 'version_rpc_failed'
                  else if (reasonStr.includes('net.Listen')) reasonCode = 'tcp_bind_failed'
                  else if (reasonStr.includes('waiting grpc')) reasonCode = 'wait_connect_failed'
                }
              }
              // 兼容引擎 phaseI18n 的 Zh/zh 两种字段名
              const pi = json.phaseI18n || {}
              const ri = json.reasonI18n || {}
              const engineEvent = {
                phase: json.phase || '',
                reasonCode,
                reason: json.info || '',
                phaseI18n: { zh: pi.zh || '', en: pi.en || '' },
                reasonI18n: ri.zh ? { zh: ri.zh || '', en: ri.en || '' } : null,
              }
              // 组装用户可读的 message
              const message = buildCheckMessage(json, reasonCode, params)
              // 映射 status
              let status
              if (reasonCode === 'tcp_bind_in_use') status = 'port_occupied'
              else if (reasonCode === 'tcp_bind_denied') status = 'port_denied'
              else if (reasonCode === 'tcp_bind_failed') status = 'endpoint_unreachable'
              else if (reasonCode === 'database_error' || json.phase === 'database') status = 'database_error'
              else if (reasonCode === 'build_server_failed' || json.phase === 'build_server') status = 'build_yak_error'
              else if (reasonCode === 'dial_failed' || json.phase === 'dial') status = 'dial_error'
              else if (reasonCode === 'version_rpc_failed' || json.phase === 'version_rpc') status = 'call_error'
              else if (reasonCode === 'wait_connect_failed' || json.phase === 'wait_connect') status = 'timeout'
              else status = 'unknownReason'

              engineLogOutputFileAndUI(win, `----- 检查失败: ${message} -----`)
              return reject({ status, message, json, engineEvent })
            }

            if (
              !json &&
              /(no such file or directory|The system cannot find the file specified)/i.test(combinedOutput)
            ) {
              engineLogOutputFileAndUI(win, `----- 检查失败：旧版本引擎不支持随机密码模式 -----`)
              return reject({ status: 'old_version', message: '引擎版本过低，请更新引擎' })
            }

            if (!json && /(flag provided but not defined)/i.test(combinedOutput)) {
              engineLogOutputFileAndUI(win, `----- 检查失败：旧版本无法支持某些参数 -----`)
              return reject({ status: 'old_version', message: '引擎版本过低，请更新引擎' })
            }

            if (!json && !stdout && !stderr) {
              engineLogOutputFileAndUI(win, `----- 检查失败：可能被杀软或防火墙拦截或无法找到引擎 -----`)
              return reject({
                status: 'antivirus_blocked',
                message: '引擎被杀毒软件拦截，可将应用加入白名单后重启',
              })
            }

            engineLogOutputFileAndUI(win, `----- 检查随机密码模式失败 -----`)
            reject({ status: 'unknown', message: '引擎环境检查失败，请查看日志详细信息' })
          })
        } catch (e) {
          if (checkId !== currentCheckId) return
          engineLogOutputFileAndUI(win, `----- 执行检查命令时发生异常 -----`)
          engineLogOutputFileAndUI(win, `exception：${e}`)
          reject({ status: 'exception', message: `引擎环境检查异常：${e.message || String(e)}` })
        }
      }).catch(async (err) => {
        return Promise.reject({ ok: false, ...err })
      })
    }
    ipcMain.handle(ipcEventPre + 'check-allow-secret-local-yaklang-engine', async (e, params) => {
      try {
        const result = await asyncAllowSecretLocal(win, params)
        return { ok: true, ...result }
      } catch (err) {
        const safeError = typeof err === 'object' && err !== null ? err : { message: String(err) }
        return {
          ok: false,
          status: safeError.status,
          message: safeError.message,
          json: safeError.json || null,
          engineEvent: safeError.engineEvent || null,
        }
      }
    })

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

    /** 连接引擎 */
    ipcMain.handle(ipcEventPre + 'connect-yaklang-engine', async (e, params) => {
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
      const hostRaw = `${params['Host'] || '127.0.0.1'}`
      let portFromRaw = `${params['Port']}`
      let hostFormatted = hostRaw
      if (hostRaw.lastIndexOf(':') >= 0) {
        portFromRaw = `${parseInt(hostRaw.substr(hostRaw.lastIndexOf(':') + 1))}`
        hostFormatted = `${hostRaw.substr(0, hostRaw.lastIndexOf(':'))}`
      }
      const addr = `${hostFormatted}:${portFromRaw}`
      const safeConnParams = {
        Host: params['Host'],
        Port: params['Port'],
        IsTLS: params['IsTLS'],
        Mode: params['Mode'],
      }
      engineLogOutputFileAndUI(win, `原始参数为: ${JSON.stringify(safeConnParams)}`)
      engineLogOutputFileAndUI(win, `开始连接引擎地址为：${addr} Host: ${hostRaw} Port: ${portFromRaw}`)
      GLOBAL_YAK_SETTING.defaultYakGRPCAddr = addr

      callback(
        GLOBAL_YAK_SETTING.defaultYakGRPCAddr,
        Buffer.from(params['PemBytes'] === undefined ? '' : params['PemBytes']).toString('utf-8'),
        params['Password'] || '',
      )
      return await new Promise((resolve, reject) => {
        const deadline = new Date()
        // 设置超时时间为60秒
        deadline.setSeconds(deadline.getSeconds() + 60)
        newClient().Echo({ text: ECHO_TEST_MSG }, { deadline }, (err, data) => {
          if (err) {
            reject(err + '')
            return
          }
          if (data['result'] === ECHO_TEST_MSG) {
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
      const { version, port, password, isEnpriTraceAgent, softwareVersion } = params

      return new Promise((resolve, reject) => {
        engineLogOutputFileAndUI(win, `----- 启动本地引擎进程 (Random Local Password, Port: ${port})  -----`)

        try {
          const grpcParams = [
            'grpc',
            '--local-password',
            password,
            '--frontend',
            `${version || 'yakit'}`,
            '--port',
            port,
          ]
          const resultParams = isEnpriTraceAgent ? [...grpcParams, '--disable-output'] : grpcParams

          const command = getLocalYaklangEngine()
          const safeResultParams = resultParams.map((p) => (p === password ? '***' : p))
          engineLogOutputFileAndUI(win, `启动命令: ${command} ${safeResultParams.join(' ')}`)

          const defaltEnv = { ...process.env, YAKIT_HOME: getYakitHome() }
          const subprocess = childProcess.spawn(command, resultParams, {
            detached: false,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...defaltEnv, ...(DefaultDBFileEnv[softwareVersion] || {}) },
          })

          subprocess.unref()

          let stdout = ''
          let stderr = ''
          let successDetected = false
          let killed = false
          const taskKey = 'start_' + checkId
          let cleaned = false
          let pollIntervalId = null
          let stdoutLineBuffer = ''
          let readyEventAddress = null
          let engineFailedEvent = null
          let settled = false
          const timeoutMs = 60000 // 增加到 60 秒，配合轮询检测

          /** 轮询检测引擎连接状态 */
          const startConnectionPolling = () => {
            engineLogOutputFileAndUI(win, `开始轮询检测引擎连接状态 (每 2 秒一次)...`)
            // 传 i18n key，由渲染端 LocalEngine 翻译后展示
            win.webContents.send('startUp-engine-msg', 'LocalEngine.waiting_engine_fully_started')

            pollIntervalId = setInterval(() => {
              if (successDetected || killed || checkId !== currentStartId) {
                cleanup()
                return
              }

              // 尝试连接引擎
              const addr = readyEventAddress || `127.0.0.1:${port}`
              engineLogOutputFileAndUI(win, `轮询尝试连接引擎: ${addr}`)

              try {
                callback(addr, '', password)
                newClient().Echo({ text: ECHO_TEST_MSG }, (err, data) => {
                  if (successDetected || killed) return

                  if (err) {
                    engineLogOutputFileAndUI(win, `轮询连接失败，继续等待...`)
                    return
                  }

                  if (data && data['result'] === ECHO_TEST_MSG) {
                    onSuccess('引擎启动成功（通过连接检测）', `轮询检测到引擎连接成功 (Echo 测试通过)！`)
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
              if (process.platform === 'win32') {
                childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
              } else {
                process.kill(subprocess.pid, 'SIGKILL')
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
            reject({ status: 'timeout', message: '引擎启动超时，请查看日志或重试' })
          }, timeoutMs)

          /** 成功回调，确保只触发一次 */
          const onSuccess = (msg1, msg2) => {
            if (checkId !== currentStartId || successDetected || killed || settled) return
            successDetected = true
            settled = true
            cleanup()
            cleanTask()
            clearTimeout(timeoutId)
            engineLogOutputFileAndUI(win, msg2)
            resolve({ status: 'success', msg1 })
          }

          subprocess.stdout.on('data', (data) => {
            if (checkId !== currentStartId) return
            const output = data.toString('utf-8')
            stdout += output
            engineLogOutputFileAndUI(win, output)

            // 检测数据库初始化标记（保留原有逻辑）
            const regex = /<json-f97f966eb7f8ba8fdb63e4d29109c058>(.*?)<json-f97f966eb7f8ba8fdb63e4d29109c058>/

            const match = output.match(regex)

            if (match) {
              // 数据库正在初始化中...
              engineLogOutputFileAndUI(win, `----- 数据库正在初始化中... -----`)
              // 传 i18n key，由渲染端 LocalEngine 翻译后展示
              win.webContents.send('startUp-engine-msg', 'LocalEngine.database_initializing')
            }

            // 按行解析引擎 stdout 事件（yak grpc ready / failed / ok）
            stdoutLineBuffer += output
            const lines = stdoutLineBuffer.split('\n')
            stdoutLineBuffer = lines.pop()
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              const event = parseEngineStdoutLine(trimmed)
              if (!event) continue
              if (event.type === 'ready') {
                if (settled || successDetected || killed) continue
                if (event.address) readyEventAddress = event.address
                engineLogOutputFileAndUI(
                  win,
                  `----- 收到引擎 ready 事件: address=${event.address} instanceId=${event.instanceId} transport=${event.transport} -----`,
                )
                // 立即尝试用 ready 事件提供的地址连接引擎
                try {
                  callback(readyEventAddress || `127.0.0.1:${port}`, '', password)
                  newClient().Echo({ text: ECHO_TEST_MSG }, (err, data) => {
                    if (settled || successDetected || killed) return
                    if (err) {
                      engineLogOutputFileAndUI(win, `ready 事件后首次连接失败，继续轮询等待...`)
                      return
                    }
                    if (data && data['result'] === ECHO_TEST_MSG) {
                      onSuccess(
                        `引擎启动成功（ready 事件 + Echo 握手通过，instanceId=${event.instanceId}）`,
                        `引擎启动成功！(instanceId=${event.instanceId})`,
                      )
                    }
                  })
                } catch (e) {
                  engineLogOutputFileAndUI(win, `ready 事件后连接异常: ${e.message || e}`)
                }
              } else if (event.type === 'failed') {
                if (settled || successDetected || killed) continue
                settled = true
                engineFailedEvent = event
                cleanup()
                cleanTask()
                clearTimeout(timeoutId)
                const status = mapEngineFailedToStatus(event.reasonCode, event.phase)
                const message = buildStartMessage(event)
                engineLogOutputFileAndUI(win, `----- 引擎启动失败: ${message} -----`)
                reject({ status, message, engineEvent: event })
              }
              // type === 'log_ok': 仅记日志，不再据此判定成功
            }
          })

          subprocess.stderr.on('data', (data) => {
            if (checkId !== currentStartId) return
            const output = data.toString('utf-8')
            stderr += output
            engineLogOutputFileAndUI(win, output)
          })

          process.on('exit', () => {
            killFun()
          })

          subprocess.on('error', (err) => {
            if (checkId !== currentStartId) return
            cleanup()
            cleanTask()
            clearTimeout(timeoutId)
            engineLogOutputFileAndUI(win, `启动引擎出错: ${err.message}`)
            win.webContents.send('start-yaklang-engine-error', `本地引擎遭遇错误，错误原因为：${err}`)
            reject({ status: 'process_error', message: `引擎进程异常：${err.message}` })
          })

          subprocess.on('close', (code) => {
            if (checkId !== currentStartId || killed || successDetected || settled) return
            cleanup()
            cleanTask()
            clearTimeout(timeoutId)
            engineLogOutputFileAndUI(win, `----- 引擎进程退出，退出码: ${code} -----`)
            reject({
              status: 'exit',
              message: `引擎进程异常退出（退出码 ${code}），请查看日志或重试`,
              engineEvent: engineFailedEvent,
            })
          })
        } catch (e) {
          reject({ status: 'exception', message: e.message || String(e) })
        }
      }).catch(async (err) => {
        return Promise.reject({ ok: false, ...err })
      })
    }
    ipcMain.handle(ipcEventPre + 'start-secret-local-yaklang-engine', async (e, params) => {
      try {
        const result = await asyncStartSecretLocalYakEngineServer(win, params)
        return { ok: true, ...result }
      } catch (err) {
        const safeError = typeof err === 'object' && err !== null ? err : { message: String(err) }
        return {
          ok: false,
          status: safeError.status,
          message: safeError.message,
          engineEvent: safeError.engineEvent || null,
        }
      }
    })

    // 中断连接 取消所有正在执行的任务
    ipcMain.handle(ipcEventPre + 'cancel-all-tasks', () => {
      if (runningTasks.size === 0) {
        return { ok: true, canceled: 0 }
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
        canceled: count,
      }
    })
  },
}
