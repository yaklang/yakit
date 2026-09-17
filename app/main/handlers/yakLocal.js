const { ipcMain, dialog } = require('electron')
const childProcess = require('child_process')
const process = require('process')
const psList = require('./libs/ps-yak-process')
const _sudoPrompt = require('sudo-prompt')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { setLocalCache, deleteLocalCache } = require('../localCache')
const { getYakitHome } = require('../filePath')
const { assertTrustedAppSender, normalizePid } = require('../security')
const { getEngineSession } = require('./utils/engineSessionRuntime')
const { observedEngine } = require('./utils/engineProcessDTO')
const isWindows = process.platform === 'win32'

if (process.platform === 'darwin' || process.platform === 'linux') {
  process.env.PATH = process.env.PATH + ':/usr/local/bin/'
}

let dbFile = 'default-yakit.db'

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

function generateWindowsSudoCommand(file, args) {
  const cmds = args === '' ? `"'${file}'"` : `"'${file}'" "'${args}'"`
  return `powershell.exe start-process -verb runas -WindowStyle hidden -filepath ${cmds}`
}

const getLatestYakLocalEngine = require('./upgradeUtil').getLatestYakLocalEngine

function sudoExec(cmd, opt, callback) {
  if (isWindows) {
    childProcess.exec(cmd, { maxBuffer: 1000 * 1000 * 1000, env: { YAK_DEFAULT_DATABASE_NAME: dbFile } }, (err) => {
      callback(err)
    })
  } else {
    _sudoPrompt.exec(cmd, { ...opt, env: { YAKIT_HOME: getYakitHome(), YAK_DEFAULT_DATABASE_NAME: dbFile } }, callback)
  }
}

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

// Discovery is observational: argv never establishes ownership or credentials.
const fetchGeneralYakProcess = async () => {
  const processes = await psList()
  return processes
    .filter((item) => /(?:^|[\\/])yak(?:\.exe)?$/i.test(item.name || '') || /(?:^|\s)grpc(?:\s|$)/.test(item.cmd || ''))
    .map(observedEngine)
}
const fetchWindowsYakProcess = fetchGeneralYakProcess
const listLocalEngines = async () => {
  const managed = getEngineSession().list()
  let discovered = []
  try {
    discovered = await fetchGeneralYakProcess()
  } catch {}
  const ownedPids = new Set(managed.filter((item) => item.state !== 'exited').map((item) => item.pid))
  return [...managed, ...discovered.filter((item) => !ownedPids.has(item.pid))]
}

const fetchGeneralYakProcessx = () => {
  return new Promise((resolve, reject) => {
    psList()
      .then((data) => {
        let ls = data
          .filter((i) => {
            try {
              return i.cmd.includes('yak xgrpc ')
            } catch (e) {
              return false
            }
          })
          .map((i) => {
            let portsRaw = '0'
            try {
              portsRaw = new RegExp(/port\s+(\d+)/).exec(i.cmd)[1]
            } catch (e) {
              // Do not log process command lines (they may contain credentials).
            }
            return {
              port: portsRaw,
              ...i,
              name: 'yak',
            }
          })
          .map((i) => {
            return { port: parseInt(i.port), ...i, origin: i }
          })
        resolve(ls)
      })
      .catch((e) => reject(e))
  })
}

// asyncKillYakGRPC wrapper
const asyncKillYakGRPC = (pid) => {
  return new Promise((resolve, reject) => {
    let normalizedPid
    try {
      normalizedPid = normalizePid(pid)
    } catch (error) {
      reject(error)
      return
    }

    if (process.platform === 'win32') {
      runWindowsTaskKill(normalizedPid)
        .then(() => {
          resolve('')
        })
        .catch(() => {
          sudoExec(generateWindowsSudoCommand('taskkill', `/F /PID ${normalizedPid}`), undefined, (error) => {
            if (!error) {
              resolve('')
            } else {
              reject(`${error}`)
            }
          })
        })
    } else {
      try {
        process.kill(normalizedPid, 'SIGKILL')
        resolve('')
      } catch (error) {
        sudoExec(
          `kill -9 ${normalizedPid}`,
          {
            name: `kill SIGKILL PID ${normalizedPid}`,
          },
          (sudoError) => {
            if (!sudoError) {
              resolve('')
            } else {
              reject(`${sudoError}`)
            }
          },
        )
      }
    }
  })
}
module.exports = {
  killYakGRPC: asyncKillYakGRPC,
  psYakList: async () => {
    if (isWindows) {
      return await fetchWindowsYakProcess()
    } else {
      return await fetchGeneralYakProcessx()
    }
  },
  clearing: () => {},
  register: (win, getClient) => {
    ipcMain.handle('set-release-edition-raw', (e, type) => {
      deleteLocalCache('REACT_APP_PLATFORM')
      setLocalCache('YAKIT_EDITION', type)
      dbFile = type === 'yakitEE' ? 'company-default-yakit.db' : 'default-yakit.db'
      return ''
    })

    ipcMain.handle('ps-yak-grpc', async (e, params) => {
      return listLocalEngines()
    })

    ipcMain.handle('kill-yak-grpc', async (e, pid) => {
      assertTrustedAppSender(e, 'kill-yak-grpc')
      // Legacy arbitrary-PID requests cannot prove ownership. Use local-engine-stop with an instance ID.
      throw new Error('Engine ownership required; use managed instance stop')
    })

    ipcMain.handle('is-yak-engine-installed', (e) => {
      return fs.existsSync(getLatestYakLocalEngine())
    })

    ipcMain.handle('is-windows', (e) => {
      return isWindows
    })

    ipcMain.handle('check-local-database', async (e) => {
      return await new Promise((resolve, reject) => {
        if (isWindows) {
          resolve('')
          return
        }
        try {
          const info = fs.statSync(path.join(getYakitHome(), dbFile))
          if ((info.mode & 0o200) > 0) {
            resolve('')
          } else {
            resolve('not allow to write')
          }
        } catch (e) {
          if (`${e}`.includes('no such file or directory')) {
            // 这个问题就不管了。。。
            resolve('')
          } else {
            reject(e)
          }
        }
      })
    })

    ipcMain.handle('fix-local-database', async (e) => {
      return await new Promise((resolve, reject) => {
        if (isWindows) {
          resolve(true)
          return
        }
        const databaseFile = path.join(getYakitHome(), dbFile)

        try {
          fs.chmodSync(databaseFile, 0o644)
          resolve(true)
        } catch (e) {
          try {
            sudoExec(`chown -R ${os.userInfo().username} ${databaseFile}`, { name: `Fix Owner` }, () => {})
          } catch (e) {}
          try {
            sudoExec(`chmod 0666 ${databaseFile}`, { name: `Fix Write Permission` }, () => {})
            resolve(true)
          } catch (e) {
            reject(e)
          }
        }
      })
    })
  },
  registerNewIPC: (win, getClient, ipcEventPre) => {
    ipcMain.handle(ipcEventPre + 'ps-yak-grpc', async (e, params) => {
      return listLocalEngines()
    })

    ipcMain.handle(ipcEventPre + 'kill-yak-grpc', async (e, pid) => {
      assertTrustedAppSender(e, ipcEventPre + 'kill-yak-grpc')
      // Legacy arbitrary-PID requests cannot prove ownership. Use local-engine-stop with an instance ID.
      throw new Error('Engine ownership required; use managed instance stop')
    })
  },
}
