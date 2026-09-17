import { registerMainMethod } from '../ipc/index'
import type { LocalMethods } from '../../shared/communication/local-methods'
import type { BrowserWindow } from 'electron'
import childProcess from 'node:child_process'
import process from 'node:process'
import psList from './processList'
import sudoPrompt from 'sudo-prompt'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setLocalCache, deleteLocalCache } from '../localCache'
import { getYakitHome } from '../filePath'
import { normalizePid } from '../security'
import { getLatestYakLocalEngine } from '../services/updates'
import type { GrpcClient } from '../ipc/grpc'
type YakProcess = Awaited<ReturnType<typeof psList>>[number] & { port: number; origin: unknown }
const isWindows = process.platform === 'win32'

if (process.platform === 'darwin' || process.platform === 'linux') {
  process.env.PATH = process.env.PATH + ':/usr/local/bin/'
}

let dbFile = 'default-yakit.db'

function generateWindowsSudoCommand(file: string, args: string) {
  const cmds = args === '' ? `"'${file}'"` : `"'${file}'" "'${args}'"`
  return `powershell.exe start-process -verb runas -WindowStyle hidden -filepath ${cmds}`
}

function sudoExec(cmd: string, opt: { name?: string } | undefined, callback: (error?: Error | null) => void) {
  if (isWindows) {
    childProcess.exec(
      cmd,
      { maxBuffer: 1000 * 1000 * 1000, env: { ...process.env, YAK_DEFAULT_DATABASE_NAME: dbFile } },
      (err) => {
        callback(err)
      },
    )
  } else {
    sudoPrompt.exec(cmd, { ...opt, env: { YAKIT_HOME: getYakitHome(), YAK_DEFAULT_DATABASE_NAME: dbFile } }, callback)
  }
}

const runWindowsTaskKill = (pid: number) => {
  return new Promise<string>((resolve, reject) => {
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

const windowsPidTableNetstatANO = (stdout: string) => {
  let lines = stdout.split('\n').map((i) => i.trim())
  let pidToPort = new Map<number, number[]>()
  if (lines.length > 0) {
    lines
      .map((i) => i.split(/\s+/))
      .forEach((i) => {
        if (i.length !== 5) {
          return
        }
        const pid = parseInt(i[4] || '1')
        const localPort = i[1]
        const port = parseInt(localPort.substr(localPort.lastIndexOf(':') + 1))
        let portList = pidToPort.get(pid)
        if (portList === undefined) {
          portList = []
          pidToPort.set(pid, portList)
        }
        if (!portList.includes(port)) {
          portList.push(port)
        }
      })
  }

  return pidToPort
}

// asyncPsList wrapper
const fetchWindowsYakProcess = () => {
  return new Promise<YakProcess[]>((resolve, reject) => {
    childProcess.exec('netstat /ano | findstr LISTENING', (error, stdout) => {
      if (error) {
        reject(error)
        return
      }

      let pidToPorts = windowsPidTableNetstatANO(stdout)
      psList()
        .then((data) => {
          let ls = data
            .filter((i) => {
              return (i.name || '').includes('yak')
            })
            .map((i) => {
              let portsRaw = 0
              try {
                let ports = pidToPorts.get(i.pid)
                if (ports?.length) {
                  ports.forEach((i) => {
                    if (i > 50000) {
                      return
                    }
                    portsRaw = i
                  })
                }
              } catch (e) {
                console.info(i.cmd)
              }
              return {
                port: portsRaw,
                ...i,
              }
            })
            .map((i) => {
              return { ...i, port: Number(i.port), origin: i }
            })
          resolve(ls)
        })
        .catch((e) => reject(e))
    })
  })
}
const fetchGeneralYakProcess = () => {
  return new Promise<YakProcess[]>((resolve, reject) => {
    psList()
      .then((data) => {
        let ls = data
          .filter((i) => {
            try {
              return i.cmd?.includes('grpc')
            } catch (e) {
              return false
            }
          })
          .map((i) => {
            // 上一步筛选了 yak.*grpc 的命令, 所以没有 --port 的就是默认 grpc 启动的 8087 端口
            let portsRaw = '8087'
            try {
              portsRaw = new RegExp(/port\s+(\d+)/).exec(i.cmd || '')?.[1] || portsRaw
            } catch (e) {
              console.info(i.cmd)
            }
            return {
              port: portsRaw,
              ...i,
              name: 'yak',
            }
          })
          .map((i) => {
            return { ...i, port: Number(i.port), origin: i }
          })
        resolve(ls)
      })
      .catch((e) => reject(e))
  })
}
const fetchGeneralYakProcessx = () => {
  return new Promise<YakProcess[]>((resolve, reject) => {
    psList()
      .then((data) => {
        let ls = data
          .filter((i) => {
            try {
              return i.cmd?.includes('yak xgrpc ')
            } catch (e) {
              return false
            }
          })
          .map((i) => {
            let portsRaw = 0
            try {
              portsRaw = Number(new RegExp(/port\s+(\d+)/).exec(i.cmd || '')?.[1] || portsRaw)
            } catch (e) {
              console.info(i.cmd)
            }
            return {
              port: portsRaw,
              ...i,
              name: 'yak',
            }
          })
          .map((i) => {
            return { ...i, port: Number(i.port), origin: i }
          })
        resolve(ls)
      })
      .catch((e) => reject(e))
  })
}

// asyncKillYakGRPC wrapper
const asyncKillYakGRPC = (pid: unknown) => {
  return new Promise<string>((resolve, reject) => {
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
const yakLocal = {
  killYakGRPC: asyncKillYakGRPC,
  psYakList: async () => {
    if (isWindows) {
      return (await fetchWindowsYakProcess()).map((item) => ({ ...item, cmd: item.cmd ?? '' }))
    } else {
      return await fetchGeneralYakProcessx()
    }
  },
  clearing: () => {},
  register: () => {
    const handle = <Api extends keyof LocalMethods>(api: Api, handler: Parameters<typeof registerMainMethod<Api>>[1]) =>
      registerMainMethod(api, handler, ['main', 'link'])
    handle('set-release-edition-raw', (type) => {
      deleteLocalCache('REACT_APP_PLATFORM')
      setLocalCache('YAKIT_EDITION', type)
      dbFile = type === 'yakitEE' ? 'company-default-yakit.db' : 'default-yakit.db'
      return ''
    })

    handle('ps-yak-grpc', async () => {
      if (isWindows) {
        return (await fetchWindowsYakProcess()).map((item) => ({ ...item, cmd: item.cmd ?? '' }))
      } else {
        return (await fetchGeneralYakProcess()).map((item) => ({ ...item, cmd: item.cmd ?? '' }))
      }
    })

    handle('kill-yak-grpc', async (pid) => {
      try {
        return await asyncKillYakGRPC(pid)
      } catch (e) {
        return 'failed'
      }
    })

    handle('is-yak-engine-installed', () => {
      return fs.existsSync(getLatestYakLocalEngine())
    })

    handle('is-windows', () => {
      return isWindows
    })

    handle('check-local-database', async () => {
      return await new Promise<string>((resolve, reject) => {
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

    handle('fix-local-database', async () => {
      return await new Promise<boolean>((resolve, reject) => {
        if (isWindows) {
          resolve(true)
          return
        }
        const databaseFile = path.join(getYakitHome(), dbFile)

        try {
          fs.chmodSync(databaseFile, 0o644)
          resolve(true)
        } catch (e) {
          const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'"
          const run = (command: string) =>
            new Promise<void>((done, fail) => {
              sudoExec(command, { name: 'Fix Database Permission' }, (error) => (error ? fail(error) : done()))
            })
          run(`chown ${quote(os.userInfo().username)} ${quote(databaseFile)}`)
            .then(() => run(`chmod 0644 ${quote(databaseFile)}`))
            .then(() => resolve(true), reject)
        }
      })
    })
  },
}

export const { killYakGRPC, psYakList, clearing, register } = yakLocal
