const { ipcMain } = require('electron')
const childProcess = require('child_process')
const _sudoPrompt = require('sudo-prompt')
const { GLOBAL_YAK_SETTING } = require('../state')
const { testRemoteClient } = require('../ipc')
const { getLocalYaklangEngine, getYakitHome } = require('../filePath')
const net = require('net')
const { engineLogOutputFileAndUI, engineLogOutputUI } = require('../logFile')
const { assertTrustedAppSender, normalizePid } = require('../security')

const { getEngineSession, connectEngine, registerSessionIPC } = require('./utils/engineSessionRuntime')

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
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

const runWindowsTaskKill = (pid) => {
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
//         _sudoPrompt.exec(cmd, {...opt, env: {YAKIT_HOME: getYakitHome()}}, callback)
//     }
// }

const ECHO_TEST_MSG = 'Hello Yakit!'

module.exports = (win, callback, getClient, newClient) => {
  const startup = getEngineSession(win, callback, newClient)
  registerSessionIPC()
  /** 获取本地引擎版本号 */
  ipcMain.handle('fetch-yak-version', () => {
    try {
      engineLogOutputFileAndUI(win, `----- 获取正在连接引擎的版本号 -----`)
      getClient().Version({}, async (err, data) => {
        if (win && data.Version) {
          engineLogOutputFileAndUI(win, `----- 正在连接引擎的版本号: ${data.Version} -----`)
          win.webContents.send('fetch-yak-version-callback', data.Version)
        } else win.webContents.send('fetch-yak-version-callback', '')
      })
    } catch (e) {
      engineLogOutputFileAndUI(win, `----- 获取正在连接引擎版本号失败 -----`)
      engineLogOutputFileAndUI(win, `${e}`)
      win.webContents.send('fetch-yak-version-callback', '')
    }
  })

  ipcMain.handle('engine-status', () => {
    try {
      const text = 'hello yak grpc engine'
      getClient().Echo({ text }, (err, data) => {
        if (win) {
          if (data?.result === text) {
            win.webContents.send('client-engine-status-ok')
          } else {
            win.webContents.send('client-engine-status-error')
          }
        }
      })
    } catch (e) {
      if (win) {
        win.webContents.send('client-engine-status-error')
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
  ipcMain.handle('get-random-local-engine-port', async (e) => {
    return await asyncGetRandomPort()
  })

  // asyncIsPortAvailable wrapper
  const asyncIsPortAvailable = (params) => {
    return isPortAvailable(params)
  }
  ipcMain.handle('is-port-available', async (e, port) => {
    /**
     * @port: 判断端口是否是可以被监听的
     */
    return await asyncIsPortAvailable(port)
  })

  ipcMain.handle('start-local-yaklang-engine', async (e, params) => {
    assertTrustedAppSender(e, 'start-local-yaklang-engine')
    const result = await startup.launch({
      ...params,
      softwareVersion: params.isIRify ? 'irify' : params.softwareVersion,
    })
    if (!result.ok) throw new Error(result.message)
    return result
  })

  /** 判断远程缓存端口是否已开启引擎 */
  const judgeRemoteEngineStarted = (win, params) => {
    return new Promise((resolve, reject) => {
      try {
        testRemoteClient(params, async (err, result) => {
          if (!err) {
            GLOBAL_YAK_SETTING.defaultYakGRPCAddr = `${params.host}:${params.port}`
            GLOBAL_YAK_SETTING.caPem = params.caPem || ''
            GLOBAL_YAK_SETTING.password = params.password
            GLOBAL_YAK_SETTING.sudo = false
            win.webContents.send('start-yaklang-engine-success', 'remote')
            resolve()
          } else reject(err)
        })
      } catch (e) {
        reject(e)
      }
    })
  }
  /** 远程连接引擎 */
  ipcMain.handle('start-remote-yaklang-engine', async (e, params) => {
    return await judgeRemoteEngineStarted(win, params)
  })

  ipcMain.handle('connect-yaklang-engine', (e, params) => {
    assertTrustedAppSender(e, 'connect-yaklang-engine')
    return connectEngine(params)
  })

  /** 输出到欢迎界面的日志中 */
  ipcMain.handle('output-log-to-welcome-console', (e, msg) => {
    engineLogOutputUI(win, `${msg}`, true)
  })

  /** 调用命令生成运行节点 */
  ipcMain.handle('call-command-generate-node', (e, params) => {
    assertTrustedAppSender(e, 'call-command-generate-node')
    return new Promise((resolve, reject) => {
      // 运行节点
      const subprocess = childProcess.spawn(getLocalYaklangEngine(), [
        'mq',
        '--server',
        params.ipOrdomain,
        '--server-port',
        params.port,
        '--id',
        params.nodename,
      ])
      subprocess.stdout.on('data', (data) => {
        resolve(subprocess.pid)
      })
      subprocess.on('error', (error) => {
        reject(error)
      })
      subprocess.stderr.on('data', (data) => {
        reject(data)
      })
    })
  })
  /** 删除运行节点 */
  ipcMain.handle('kill-run-node', (e, params) => {
    assertTrustedAppSender(e, 'kill-run-node')
    return new Promise((resolve, reject) => {
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
