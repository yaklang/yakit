import { sendEvent } from '../ipc/events'
import { registerMainMethod } from '../ipc/index'
import type { LocalMethods } from '../../shared/communication/local-methods'
import childProcess from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { BrowserWindow } from 'electron'
import { GLOBAL_YAK_SETTING } from '../state'
import { getLocalYaklangEngine, getYakitHome } from '../filePath'
import { engineLogOutputFileAndUI, engineLogOutputUI } from '../logFile'
import type { GrpcClient } from '../ipc/grpc'
import type { ConfigureEngine, EngineConnectionParams } from '../services/engine'
interface CheckParams {
  port: number | string
  softwareVersion: string
}
interface StartParams extends CheckParams {
  version?: string
  password: string
  isEnpriTraceAgent?: boolean
}
interface CommandResult {
  status: string
  json?: Record<string, unknown>
  msg1?: string
}
function errorFields(error: unknown): Record<string, unknown> {
  return error && typeof error === 'object'
    ? { ...error, message: error instanceof Error ? error.message : Reflect.get(error, 'message') }
    : { message: String(error) }
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
function requireEnginePath(): string {
  const enginePath = getLocalYaklangEngine()
  if (!enginePath) throw new Error('本地引擎尚未安装')
  return enginePath
}
function parseCommandJson(text: string): Record<string, unknown> {
  const result: unknown = JSON.parse(text)
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('引擎返回的 JSON 不是对象')
  return result as Record<string, unknown>
}
interface VacuumResult {
  total_databases: number
  successful: number
  failed: number
  total_saved_bytes: number
  databases: { path: string; success: boolean; saved_bytes: number }[]
}
function parseVacuumResult(result: Record<string, unknown>): VacuumResult {
  const number = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('数据库统计格式错误')
    return value
  }
  if (!Array.isArray(result.databases)) throw new Error('数据库列表格式错误')
  return {
    total_databases: number(result.total_databases),
    successful: number(result.successful),
    failed: number(result.failed),
    total_saved_bytes: number(result.total_saved_bytes),
    databases: result.databases.map((value: unknown) => {
      if (!value || typeof value !== 'object') throw new Error('数据库统计格式错误')
      return {
        path: String(Reflect.get(value, 'path') || ''),
        success: Reflect.get(value, 'success') === true,
        saved_bytes: number(Reflect.get(value, 'saved_bytes')),
      }
    }),
  }
}
// 引擎连接过程中涉及到能中断的执行任务

const ECHO_TEST_MSG = 'Hello Yakit!'

/** 各版本下的数据库环境变量 */
const DefaultDBFileEnv: Record<string, NodeJS.ProcessEnv> = {
  irify: {
    YAK_DEFAULT_PROFILE_DATABASE_NAME: 'irify-profile-rule.db',
    YAK_DEFAULT_PROJECT_DATABASE_NAME: 'default-irify.db',
    SSA_DATABASE_RAW: 'default-yakssa.db',
  },
  memfit: {
    YAK_DEFAULT_PROJECT_DATABASE_NAME: 'default-memfit.db',
  },
}

export function registerStartupTasks(win: BrowserWindow, callback: ConfigureEngine, newClient: () => GrpcClient) {
  function handle<Api extends keyof LocalMethods>(name: Api, handler: Parameters<typeof registerMainMethod<Api>>[1]) {
    registerMainMethod(name, handler, ['link'])
  }
  const runningTasks = new Map<string, () => void>()
  win.once('closed', () => {
    for (const cancel of runningTasks.values()) cancel()
    runningTasks.clear()
  })
  async function runOwned<T>(kind: string, signal: AbortSignal, start: () => Promise<T>): Promise<T> {
    signal.throwIfAborted()
    const result = start()
    const cancel = runningTasks.get(kind)
    const abort = () => cancel?.()
    if (cancel) signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) cancel?.()
    try {
      return await result
    } finally {
      if (cancel) signal.removeEventListener('abort', abort)
    }
  }
  let currentCheckId = 0 // 全局任务标识
  /** check校验 */
  const asyncAllowSecretLocal = async (win: BrowserWindow, params: CheckParams) => {
    runningTasks.get('check')?.()
    const checkId = ++currentCheckId // 本次任务唯一 ID

    return new Promise<CommandResult>((resolve, reject) => {
      try {
        const { port, softwareVersion } = params
        const command = requireEnginePath()
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
        const taskKey = 'check'
        let cleaned = false

        const killFun = (timeOut = false) => {
          if (killed) return
          killed = true
          if (!timeOut) reject({ status: 'cancelled', message: '任务已取消' })
          cleanTask()
          clearTimeout(timeoutId)
          !timeOut && engineLogOutputFileAndUI(win, `----- 执行中止 check -----`)
          try {
            subprocess.kill()
            if (process.platform === 'win32') {
              childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
            } else {
              subprocess.pid && process.kill(subprocess.pid, 'SIGKILL')
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
          reject({ status: 'timeout', message: '检查随机密码模式超时' })
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
          reject({ status: 'process_error', message: error.message })
        })

        subprocess.on('close', (code) => {
          if (checkId !== currentCheckId || killed) return
          cleanTask()
          clearTimeout(timeoutId)
          const combinedOutput = (stdout + stderr).trim()
          engineLogOutputFileAndUI(win, `----- 检查随机密码模式结束，退出码: ${code} -----`)

          // 提取 JSON
          const match = combinedOutput.match(/<json-[\w-]+>([\s\S]*?)<\/json-[\w-]+>/)
          let json: Record<string, unknown> | null = null
          if (match) {
            try {
              json = parseCommandJson(match[1].trim())
            } catch (e) {
              engineLogOutputFileAndUI(win, `JSON 解析失败: ${errorMessage(e)}`)
            }
          }

          if (json && json.ok === true) {
            successDetected = true
            engineLogOutputFileAndUI(win, `----- 随机密码模式检查通过 -----`)
            return resolve({ status: 'success', json })
          }

          if (json && json.ok === false) {
            const reasons = Array.isArray(json.reason)
              ? json.reason.map((r) => String(r))
              : [String(json.reason || json.info || combinedOutput || '')]
            const has = (keyword: string) => reasons.some((r) => r.includes(keyword))

            if (has('net.Listen(tcp, addr) failed')) {
              const msg = `端口 ${params.port} 已被占用，请检查是否已有其他 Yakit 实例或进程正在运行，建议用户手动释放或修改端口。`
              engineLogOutputFileAndUI(win, `----- 检查失败: ${msg} -----`)
              return reject({ status: 'port_occupied', message: msg, json })
            } else if (has('build yak grpc server failed')) {
              const msg = json.info
              engineLogOutputFileAndUI(win, `----- 检查失败: build yak grpc server failed：${msg} -----`)
              return reject({
                status: 'build_yak_error',
                message: msg,
                json,
              })
            } else if (has('database error')) {
              const msg = json.info
              engineLogOutputFileAndUI(win, `----- 检查失败: database error：${msg} -----`)
              return reject({
                status: 'database_error',
                message: msg,
                json,
              })
            } else if (has('dial grpc server failed')) {
              // 远程，目前没有check处理
              const msg = json.info
              engineLogOutputFileAndUI(win, `----- 检查失败: dial grpc server failed：${msg} -----`)
              return reject({
                status: 'dial_error',
                message: msg,
                json,
              })
            } else if (has('call Version RPC failed')) {
              // 远程，目前没有check处理
              const msg = json.info
              engineLogOutputFileAndUI(win, `----- 检查失败: call Version RPC failed：${msg} -----`)
              return reject({
                status: 'call_error',
                message: msg,
                json,
              })
            } else {
              engineLogOutputFileAndUI(win, `----- 检查失败: unknownReason：${json.info || '未知原因'} -----`)
              return reject({
                status: 'unknownReason',
                message: json.info || '未知原因',
                json,
              })
            }
          }

          if (!json && /(no such file or directory|The system cannot find the file specified)/i.test(combinedOutput)) {
            engineLogOutputFileAndUI(win, `----- 检查失败：旧版本引擎不支持随机密码模式 -----`)
            return reject({ status: 'old_version', message: '旧版本引擎不支持随机密码模式' })
          }

          if (!json && /(flag provided but not defined)/i.test(combinedOutput)) {
            engineLogOutputFileAndUI(win, `----- 检查失败：旧版本无法支持某些参数 -----`)
            return reject({ status: 'old_version', message: '旧版本无法支持某些参数' })
          }

          if (!json && !stdout && !stderr) {
            engineLogOutputFileAndUI(win, `----- 检查失败：可能被杀软或防火墙拦截或无法找到引擎 -----`)
            return reject({
              status: 'antivirus_blocked',
              message: '可能被杀软或防火墙拦截或无法找到引擎',
            })
          }

          engineLogOutputFileAndUI(win, `----- 检查随机密码模式失败 -----`)
          reject({ status: 'unknown', message: '未知错误，请查看详细日志信息' })
        })
      } catch (e) {
        if (checkId !== currentCheckId) return
        engineLogOutputFileAndUI(win, `----- 执行检查命令时发生异常 -----`)
        engineLogOutputFileAndUI(win, `exception：${e}`)
        reject({ status: 'exception', message: errorMessage(e) })
      }
    }).catch(async (err) => {
      return Promise.reject({ ok: false, ...err })
    })
  }
  handle('check-allow-secret-local-yaklang-engine', async (params, context) => {
    try {
      const result = await runOwned('check', context.signal, () => asyncAllowSecretLocal(win, params))
      return { ok: true, ...result, message: '', json: result.json ?? null }
    } catch (err) {
      const safeError = errorFields(err)
      return {
        ok: false,
        status: typeof safeError.status === 'string' ? safeError.status : 'exception',
        message: typeof safeError.message === 'string' ? safeError.message : String(safeError.message ?? ''),
        json:
          safeError.json && typeof safeError.json === 'object' && !Array.isArray(safeError.json)
            ? (safeError.json as Record<string, unknown>)
            : null,
      }
    }
  })

  let currentFixId = 0 // 全局任务标识
  /** 修复数据库 */
  const asyncFixupDatabase = async (win: BrowserWindow, params: { softwareVersion: string }) => {
    runningTasks.get('fix')?.()
    const checkId = ++currentFixId // 本次任务唯一 ID

    return new Promise<CommandResult>((resolve, reject) => {
      try {
        const { softwareVersion } = params
        const command = requireEnginePath()
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

        const killFun = (timeOut = false) => {
          if (killed) return
          killed = true
          runningTasks.delete('fix')
          if (!timeOut) reject({ status: 'cancelled', message: '任务已取消' })
          clearTimeout(timeoutId)
          try {
            subprocess.kill()
            if (process.platform === 'win32') {
              childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
            } else {
              subprocess.pid && process.kill(subprocess.pid, 'SIGKILL')
            }
          } catch {}
        }

        runningTasks.set('fix', killFun)
        const timeoutId = setTimeout(() => {
          if (checkId !== currentFixId || successDetected || killed) return
          killFun(true)
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
          runningTasks.delete('fix')
          clearTimeout(timeoutId)
          engineLogOutputFileAndUI(win, `----- 修复数据库失败 -----`)
          engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
          reject({ status: 'process_error', message: error.message })
        })

        subprocess.on('close', (code) => {
          if (checkId !== currentFixId || killed) return
          runningTasks.delete('fix')
          clearTimeout(timeoutId)
          const combinedOutput = (stdout + stderr).trim()
          engineLogOutputFileAndUI(win, `----- 修复数据库结束，退出码: ${code} -----`)

          // 提取 JSON
          const match = combinedOutput.match(/<json-[\w-]+>([\s\S]*?)<\/json-[\w-]+>/)
          let json: Record<string, unknown> | null = null
          if (match) {
            try {
              json = parseCommandJson(match[1].trim())
            } catch (e) {
              engineLogOutputFileAndUI(win, `JSON 解析失败: ${errorMessage(e)}`)
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
        reject({ status: 'exception', message: errorMessage(e) })
      }
    }).catch(async (err) => {
      return Promise.reject({ ok: false, ...err })
    })
  }
  handle('fixup-database', async (params, context) => {
    try {
      const result = await runOwned('fix', context.signal, () => asyncFixupDatabase(win, params))
      return { ok: true, ...result, message: '', json: result.json ?? null }
    } catch (err) {
      const safeError = errorFields(err)
      return {
        ok: false,
        status: typeof safeError.status === 'string' ? safeError.status : 'exception',
        message: typeof safeError.message === 'string' ? safeError.message : String(safeError.message ?? ''),
        json:
          safeError.json && typeof safeError.json === 'object' && !Array.isArray(safeError.json)
            ? (safeError.json as Record<string, unknown>)
            : null,
      }
    }
  })

  let currentReclaimId = 0 // 全局任务标识
  /** 回收数据空间 */
  const asyncReclaimDatabaseSpace = async (win: BrowserWindow, params: { dbPath: string[] }) => {
    runningTasks.get('reclaim')?.()
    const checkId = ++currentReclaimId // 本次任务唯一 ID
    const { dbPath } = params

    return new Promise<CommandResult>((resolve, reject) => {
      try {
        const command = requireEnginePath()
        const args = ['vacuum-sqlite']
        dbPath.forEach((item) => {
          args.push('--db-file')
          args.push(item)
        })

        engineLogOutputFileAndUI(win, `----- 回收数据库空间 -----`)
        engineLogOutputFileAndUI(win, `执行命令: ${command} ${args.join(' ')}`)

        const subprocess = childProcess.spawn(command, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, YAK_VACUUM_SQLITE_JSON: 'true' },
        })

        let cancelled = false
        runningTasks.set('reclaim', () => {
          cancelled = true
          runningTasks.delete('reclaim')
          subprocess.kill()
          reject({ status: 'cancelled', message: '任务已取消' })
        })
        let stdout = ''
        let stderr = ''

        subprocess.stdout.on('data', (data) => {
          if (checkId !== currentReclaimId || cancelled) return // 已过期任务不打印
          const output = data.toString('utf-8')
          stdout += output
          engineLogOutputFileAndUI(win, output)
        })

        subprocess.stderr.on('data', (data) => {
          if (checkId !== currentReclaimId || cancelled) return
          const output = data.toString('utf-8')
          stderr += output
          engineLogOutputFileAndUI(win, output)
        })

        subprocess.on('error', (error) => {
          if (checkId !== currentReclaimId || cancelled) return
          runningTasks.delete('reclaim')
          engineLogOutputFileAndUI(win, `----- 回收数据库空间失败 -----`)
          engineLogOutputFileAndUI(win, `process_error: ${error.message}`)
          reject({ status: 'process_error', message: error.message })
        })

        const formatBytes = (bytes: number, fractionDigits = 2) => {
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

        const formatVacuumResultToHumanLog = (result: VacuumResult) => {
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
          if (checkId !== currentReclaimId || cancelled) return
          runningTasks.delete('reclaim')
          const combinedOutput = (stdout + stderr).trim()
          engineLogOutputFileAndUI(win, `----- 回收数据库空间结束，退出码: ${code} -----`)
          // 提取 JSON
          const match = combinedOutput.match(
            /<52ed804604e783e3b12860e8676f78a1>\s*(\{[\s\S]*?\})\s*<52ed804604e783e3b12860e8676f78a1>/,
          )
          let json: Record<string, unknown> | null = null
          if (match) {
            try {
              json = parseCommandJson(match[1].trim())
            } catch (e) {
              engineLogOutputFileAndUI(win, `JSON 解析失败: ${errorMessage(e)}`)
            }
          }

          if (json) {
            let humanLogs: string[]
            try {
              humanLogs = formatVacuumResultToHumanLog(parseVacuumResult(json))
            } catch (error) {
              reject({ status: 'invalid_response', message: errorMessage(error) })
              return
            }
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
        reject({ status: 'exception', message: errorMessage(e) })
      }
    }).catch(async (err) => {
      return Promise.reject({ ok: false, ...err })
    })
  }
  handle('reclaimDatabaseSpace', async (params, context) => {
    try {
      const result = await runOwned('reclaim', context.signal, () => asyncReclaimDatabaseSpace(win, params))
      return { ok: true, ...result, message: '', json: result.json ?? null }
    } catch (err) {
      const safeError = errorFields(err)
      return {
        ok: false,
        status: typeof safeError.status === 'string' ? safeError.status : 'exception',
        message: typeof safeError.message === 'string' ? safeError.message : String(safeError.message ?? ''),
        json:
          safeError.json && typeof safeError.json === 'object' && !Array.isArray(safeError.json)
            ? (safeError.json as Record<string, unknown>)
            : null,
      }
    }
  })

  let currentStartId = 0 // 全局启动任务标识
  /** 启动引擎 */
  const asyncStartSecretLocalYakEngineServer = async (win: BrowserWindow, params: StartParams) => {
    runningTasks.get('start')?.()
    const checkId = ++currentStartId
    const { version, port, password, isEnpriTraceAgent, softwareVersion } = params

    return new Promise<CommandResult>((resolve, reject) => {
      engineLogOutputFileAndUI(win, `----- 启动本地引擎进程 (Random Local Password, Port: ${port})  -----`)

      try {
        const grpcParams = [
          'grpc',
          '--local-password',
          password,
          '--frontend',
          `${version || 'yakit'}`,
          '--port',
          String(port),
        ]
        const resultParams = isEnpriTraceAgent ? [...grpcParams, '--disable-output'] : grpcParams

        const command = requireEnginePath()
        engineLogOutputFileAndUI(
          win,
          `启动命令: ${command} ${resultParams.map((arg, index) => (index > 0 && resultParams[index - 1] === '--local-password' ? '[redacted]' : arg)).join(' ')}`,
        )

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
        const taskKey = 'start'
        let cleaned = false
        let pollIntervalId: ReturnType<typeof setInterval> | null = null
        const timeoutMs = 60000 // 增加到 60 秒，配合轮询检测

        /** 轮询检测引擎连接状态 */
        callback(`127.0.0.1:${port}`, '', password)
        let polling = false
        const startConnectionPolling = () => {
          engineLogOutputFileAndUI(win, `开始轮询检测引擎连接状态 (每 2 秒一次)...`)
          // 传 i18n key，由渲染端 LocalEngine 翻译后展示
          sendEvent(win.webContents, 'startUp-engine-msg', 'LocalEngine.waiting_engine_fully_started')

          pollIntervalId = setInterval(() => {
            if (successDetected || killed || checkId !== currentStartId) {
              cleanup()
              return
            }

            if (polling) return
            // 尝试连接引擎
            const addr = `127.0.0.1:${port}`
            engineLogOutputFileAndUI(win, `轮询尝试连接引擎: ${addr}`)

            try {
              const probe = newClient()
              polling = true
              probe.Echo({ text: ECHO_TEST_MSG }, { deadline: Date.now() + 2000 }, (err, data) => {
                polling = false
                probe.close()
                if (successDetected || killed || checkId !== currentStartId) return

                if (err) {
                  engineLogOutputFileAndUI(win, `轮询连接失败，继续等待...`)
                  return
                }

                if (data && data?.result === ECHO_TEST_MSG) {
                  onSuccess('引擎启动成功（通过连接检测）', `轮询检测到引擎连接成功 (Echo 测试通过)！`)
                }
              })
            } catch (e) {
              polling = false
              engineLogOutputFileAndUI(win, `轮询连接异常: ${errorMessage(e)}`)
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
          if (!timeOut) reject({ status: 'cancelled', message: '任务已取消' })
          cleanup()
          cleanTask()
          clearTimeout(timeoutId)
          !timeOut && engineLogOutputFileAndUI(win, `----- 执行中止 启动本地引擎  -----`)
          try {
            subprocess.kill()
            if (process.platform === 'win32') {
              childProcess.exec(`taskkill /PID ${subprocess.pid} /T /F`)
            } else {
              subprocess.pid && process.kill(subprocess.pid, 'SIGKILL')
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
          reject({ status: 'timeout', message: '启动本地引擎超时' })
        }, timeoutMs)

        /** 成功回调，确保只触发一次 */
        const onSuccess = (msg1: string, msg2: string) => {
          if (checkId !== currentStartId || successDetected || killed) return
          successDetected = true
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

          const regex = /<json-f97f966eb7f8ba8fdb63e4d29109c058>(.*?)<json-f97f966eb7f8ba8fdb63e4d29109c058>/

          const match = output.match(regex)

          if (match) {
            // 数据库正在初始化中...
            engineLogOutputFileAndUI(win, `----- 数据库正在初始化中... -----`)
            // 传 i18n key，由渲染端 LocalEngine 翻译后展示
            sendEvent(win.webContents, 'startUp-engine-msg', 'LocalEngine.database_initializing')
          }

          // 保留原有的 yak grpc ok 检测方式
          if (/yak grpc ok/i.test(output)) {
            onSuccess('引擎启动成功（通过 yak grpc ok 检测）', `检测到 'yak grpc ok'，引擎启动成功！`)
          }
        })

        subprocess.stderr.on('data', (data) => {
          if (checkId !== currentStartId) return
          const output = data.toString('utf-8')
          stderr += output
          engineLogOutputFileAndUI(win, output)
        })

        const stopOnExit = () => killFun()
        process.once('exit', stopOnExit)
        subprocess.once('close', () => EventEmitter.prototype.removeListener.call(process, 'exit', stopOnExit))

        subprocess.on('error', (err) => {
          if (checkId !== currentStartId) return
          cleanup()
          cleanTask()
          clearTimeout(timeoutId)
          engineLogOutputFileAndUI(win, `启动引擎出错: ${err.message}`)
          sendEvent(win.webContents, 'start-yaklang-engine-error', `本地引擎遭遇错误，错误原因为：${err}`)
          reject({ status: 'process_error', message: err.message })
        })

        subprocess.on('close', (code) => {
          if (checkId !== currentStartId || killed || successDetected) return
          cleanup()
          cleanTask()
          clearTimeout(timeoutId)
          engineLogOutputFileAndUI(win, `----- 引擎进程退出，退出码: ${code} -----`)
          reject({ status: 'exit', message: `引擎进程提前退出 (${code})` })
        })
      } catch (e) {
        reject({ status: 'exception', message: errorMessage(e) })
      }
    }).catch(async (err) => {
      return Promise.reject({ ok: false, ...err })
    })
  }
  handle('start-secret-local-yaklang-engine', async (params, context) => {
    try {
      const result = await runOwned('start', context.signal, () => asyncStartSecretLocalYakEngineServer(win, params))
      return { ok: true, ...result, message: '', json: result.json ?? null }
    } catch (err) {
      const safeError = errorFields(err)
      return {
        ok: false,
        status: typeof safeError.status === 'string' ? safeError.status : 'exception',
        message: typeof safeError.message === 'string' ? safeError.message : String(safeError.message ?? ''),
      }
    }
  })

  // 中断连接 取消所有正在执行的任务
  handle('cancel-all-tasks', () => {
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
}
