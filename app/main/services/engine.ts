import { sendEvent } from '../ipc/events'
import { registerMainMethod, invocationWindow } from '../ipc/index'
import { callGrpc } from '../ipc/grpc'
import childProcess from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { BrowserWindow } from 'electron'
import { GLOBAL_YAK_SETTING } from '../state'
import engineIpc from '../bootstrap'
const { testRemoteClient } = engineIpc
import { getLocalYaklangEngine, getYakitHome } from '../filePath'
import net from 'node:net'
import { engineLogOutputFileAndUI, engineLogOutputUI } from '../logFile'
import { normalizePid } from '../security'
import type { GrpcClient } from '../ipc/grpc'
export interface EngineConnectionParams {
  Host?: string
  Port: number | string
  PemBytes?: Uint8Array | string
  Password?: string
}
export type ConfigureEngine = (address: string, caPem: string, password: string) => void
interface StartEngineParams {
  port: number | string
  version?: string
  isEnpriTraceAgent?: boolean
  isIRify?: boolean
}
function requireEnginePath(): string {
  const enginePath = getLocalYaklangEngine()
  if (!enginePath) throw new Error('本地引擎尚未安装')
  return enginePath
}

function isPortAvailable(port: number) {
  return new Promise<void>((resolve, reject) => {
    const server = net.createServer({})
    server.on('listening', () => {
      server.close((err) => {
        if (err === undefined) {
          resolve()
        } else {
          reject(err)
        }
      })
    })
    server.on('error', (err) => {
      reject(err)
    })
    server.listen(port, () => {})
  })
}

const isWindows = process.platform === 'win32'

const runWindowsTaskKill = (pid: number) => {
  return new Promise((resolve, reject) => {
    const subprocess = childProcess.spawn('taskkill', ['/F', '/PID', `${pid}`], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    subprocess.stderr.on('data', (data) => {
      stderr += data.toString('utf-8')
    })
    subprocess.on('error', (error) => {
      reject(error)
    })
    subprocess.on('close', (code) => {
      if (code === 0) {
        resolve('')
        return
      }
      reject(stderr || `taskkill exited with code ${code}`)
    })
  })
}

const ECHO_TEST_MSG = 'Hello Yakit!'

export function registerEngineServices(
  win: BrowserWindow,
  callback: ConfigureEngine,
  getClient: () => GrpcClient,
  newClient: () => GrpcClient,
) {
  /** 获取本地引擎版本号 */
  registerMainMethod('fetch-yak-version', async (_params, context) => {
    try {
      const data = await callGrpc(getClient, 'Version', {}, context.signal)
      sendEvent(win.webContents, 'fetch-yak-version-callback', data.Version)
      return data.Version
    } catch (error) {
      sendEvent(win.webContents, 'fetch-yak-version-callback', '')
      throw error
    }
  })
  registerMainMethod('engine-status', async (_params, context) => {
    const text = 'hello yak grpc engine'
    const data = await callGrpc(getClient, 'Echo', { text }, context.signal)
    return data.result === text
  })

  // asyncGetRandomPort wrapper
  const asyncGetRandomPort = () => {
    return new Promise<number>((resolve, reject) => {
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
  registerMainMethod('get-random-local-engine-port', async () => {
    return await asyncGetRandomPort()
  })

  // asyncIsPortAvailable wrapper
  const asyncIsPortAvailable = (params: number) => {
    return isPortAvailable(params)
  }
  registerMainMethod('is-port-available', async (port) => {
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
  const asyncStartLocalYakEngineServer = (win: BrowserWindow, params: StartEngineParams, signal: AbortSignal) => {
    const { version } = params

    const { port, isEnpriTraceAgent, isIRify } = params
    return new Promise<void>((resolve, reject) => {
      try {
        engineLogOutputFileAndUI(win, `----- 已启动本地引擎进程 -----`)
        const dbFile = isIRify
          ? ['--profile-db', 'irify-profile-rule.db', '--project-db', 'default-irify.db']
          : undefined

        const grpcPort = ['grpc', '--port', `${port}`, '--frontend', `${version || 'yakit'}`]
        const extraParams = dbFile ? [...grpcPort, ...dbFile] : grpcPort
        const resultParams = isEnpriTraceAgent ? [...extraParams, '--disable-output'] : extraParams

        engineLogOutputFileAndUI(win, `启动命令: ${getLocalYaklangEngine()} ${resultParams.join(' ')}`)
        if (signal.aborted) throw new Error('Engine startup aborted')
        const subprocess = childProcess.spawn(requireEnginePath(), resultParams, {
          detached: false,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            YAKIT_HOME: getYakitHome(),
          },
        })

        // subprocess.unref()
        const stop = () => {
          subprocess.kill()
        }
        process.once('exit', stop)
        const cancelStartup = () => {
          subprocess.kill()
          reject(new Error('Engine startup aborted'))
        }
        const completeStartup = () => {
          signal.removeEventListener('abort', cancelStartup)
          resolve()
        }
        signal.addEventListener('abort', cancelStartup, { once: true })
        subprocess.once('spawn', completeStartup)
        subprocess.once('error', () => signal.removeEventListener('abort', cancelStartup))
        if (signal.aborted) cancelStartup()
        subprocess.once('close', () => EventEmitter.prototype.removeListener.call(process, 'exit', stop))
        subprocess.on('error', (err) => {
          engineLogOutputFileAndUI(win, `----- 本地引擎遭遇错误，错误原因 -----`)
          engineLogOutputFileAndUI(win, err)
          sendEvent(win.webContents, 'start-yaklang-engine-error', `本地引擎遭遇错误，错误原因为：${err}`)
          reject(err)
        })
        subprocess.on('close', async (e) => {
          engineLogOutputFileAndUI(win, `----- 本地引擎退出，退出码为：${e} -----`)
        })

        subprocess.stdout.on('data', (data) => {
          try {
            // const match = data.toString("utf-8").match(/\[\w+:\d+]\s+(.*)/)[1]
            engineLogOutputFileAndUI(win, `${data.toString('utf-8')}`)
          } catch (error) {}
        })
        subprocess.stderr.on('data', (data) => {
          try {
            // const match = data.toString("utf-8").match(/\[\w+:\d+]\s+(.*)/)[1]
            engineLogOutputFileAndUI(win, `${data.toString('utf-8')}`)
          } catch (error) {}
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  /** 本地启动yaklang引擎 */
  registerMainMethod('start-local-yaklang-engine', async (params, context) => {
    if (!params['port']) {
      throw Error('启动本地引擎必须指定端口')
    }
    return await asyncStartLocalYakEngineServer(win, params, context.signal)
  })

  /** 判断远程缓存端口是否已开启引擎 */
  const judgeRemoteEngineStarted = (
    win: BrowserWindow,
    params: Parameters<typeof testRemoteClient>[0],
    signal: AbortSignal,
  ) => {
    return new Promise<void>((resolve, reject) => {
      let call: import('@grpc/grpc-js').ClientUnaryCall | undefined
      const abort = () => {
        call?.cancel()
        reject(new Error('Engine connection aborted'))
      }
      if (signal.aborted) {
        abort()
        return
      }
      signal.addEventListener('abort', abort, { once: true })
      try {
        call = testRemoteClient(params, (error) => {
          signal.removeEventListener('abort', abort)
          if (signal.aborted) {
            reject(new Error('Engine connection aborted'))
            return
          }
          if (error) {
            reject(error)
            return
          }
          callback(`${params.host}:${params.port}`, params.caPem || '', params.password || '')
          GLOBAL_YAK_SETTING.sudo = false
          sendEvent(win.webContents, 'start-yaklang-engine-success', 'remote')
          resolve()
        })
      } catch (error) {
        signal.removeEventListener('abort', abort)
        reject(error)
      }
    })
  }
  /** 远程连接引擎 */
  registerMainMethod('start-remote-yaklang-engine', async (params, context) => {
    return await judgeRemoteEngineStarted(win, params, context.signal)
  })

  /** 连接引擎 */
  registerMainMethod(
    'connect-yaklang-engine',
    async (params, context) => {
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
      let portFromRaw = `${params['Port'] || 8087}`
      let hostFormatted = hostRaw
      if (hostRaw.lastIndexOf(':') >= 0) {
        portFromRaw = `${parseInt(hostRaw.substr(hostRaw.lastIndexOf(':') + 1))}`
        hostFormatted = `${hostRaw.substr(0, hostRaw.lastIndexOf(':'))}`
      }
      const addr = `${hostFormatted}:${portFromRaw}`
      const safeConnParams = { Host: params['Host'], Port: params['Port'], IsTLS: params['IsTLS'], Sudo: params['Sudo'] }
      engineLogOutputFileAndUI(win, `原始参数为: ${JSON.stringify(safeConnParams)}`)
      engineLogOutputFileAndUI(win, `开始连接引擎地址为：${addr} Host: ${hostRaw} Port: ${portFromRaw}`)
      GLOBAL_YAK_SETTING.defaultYakGRPCAddr = addr

      callback(
        GLOBAL_YAK_SETTING.defaultYakGRPCAddr,
        Buffer.from(params['PemBytes'] === undefined ? '' : params['PemBytes']).toString('utf-8'),
        params['Password'] || '',
      )
      const client = newClient()
      try {
        const data = await callGrpc(() => client, 'Echo', { text: ECHO_TEST_MSG }, context.signal, 60_000)
        if (data.result !== ECHO_TEST_MSG) throw new Error('Engine returned an invalid echo')
        return data
      } finally {
        client.close()
      }
    },
    ['main', 'link'],
  )

  /** 输出到欢迎界面的日志中 */
  registerMainMethod(
    'output-log-to-welcome-console',
    (msg, context) => {
      engineLogOutputUI(invocationWindow(context), msg, true)
    },
    ['main', 'link'],
  )

  /** 调用命令生成运行节点 */
  registerMainMethod('call-command-generate-node', (params, context) => {
    return new Promise<number>((resolve, reject) => {
      // 运行节点
      const subprocess = childProcess.spawn(requireEnginePath(), [
        'mq',
        '--server',
        params.ipOrdomain,
        '--server-port',
        String(params.port),
        '--id',
        params.nodename,
      ])
      let settled = false
      const finish = (error?: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        context.signal.removeEventListener('abort', abort)
        if (error) {
          subprocess.kill()
          reject(error)
        } else if (subprocess.pid) resolve(subprocess.pid)
        else reject(new Error('Node process has no PID'))
      }
      const abort = () => finish(new Error('Node startup aborted'))
      const timer = setTimeout(() => finish(new Error('Node startup timed out')), 30_000)
      context.signal.addEventListener('abort', abort, { once: true })
      subprocess.stdout.once('data', () => finish())
      subprocess.once('error', finish)
      subprocess.once('close', (code) => finish(new Error(`Node exited before startup: ${code}`)))
      subprocess.stderr.once('data', (data) => finish(new Error(String(data))))
      if (context.signal.aborted) abort()
    })
  })
  /** 删除运行节点 */
  registerMainMethod('kill-run-node', (params) => {
    return new Promise<string>((resolve, reject) => {
      const pid = normalizePid(params?.pid)
      if (isWindows) {
        runWindowsTaskKill(pid)
          .then(() => {
            resolve('')
          })
          .catch((error) => {
            reject(error)
          })
      } else {
        try {
          process.kill(pid, 'SIGKILL')
          resolve('')
        } catch (error) {
          reject(error)
        }
      }
    })
  })
}
