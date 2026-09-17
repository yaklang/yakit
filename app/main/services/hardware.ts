import { registerMainMethod, invocationWindow } from '../ipc/index'
import { shell } from 'electron'
import OS from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { getYaklangEngineDir, getRemoteLinkDir, getYakitInstallDir } from '../filePath'
import zip from 'node-stream-zip'
import { exec } from 'node:child_process'
import { printLogOutputFile } from '../logFile'

export function registerHardwareServices() {
  const roles = ['main', 'link'] as const
  const samples = new Map<number, { values: number[]; stop(): void }>()
  const cpuTicks = () => {
    const cpus = OS.cpus()
    return cpus.reduce(
      (value, cpu) => ({
        idle: value.idle + cpu.times.idle,
        total: value.total + Object.values(cpu.times).reduce((sum, ticks) => sum + ticks, 0),
      }),
      { idle: 0, total: 0 },
    )
  }
  registerMainMethod(
    'start-compute-percent',
    (_params, context) => {
      const win = invocationWindow(context)
      const contents = win.webContents
      samples.get(contents.id)?.stop()
      const values = Array<number>(10).fill(0)
      let previous = cpuTicks()
      const timer = setInterval(() => {
        const current = cpuTicks()
        const elapsed = current.total - previous.total
        const load = elapsed > 0 ? Math.floor(100 * (1 - (current.idle - previous.idle) / elapsed)) : 0
        previous = current
        values.shift()
        values.push(Math.max(0, Math.min(100, load)))
      }, 400)
      const logger = setInterval(() => {
        const percent = values[values.length - 1]
        if (percent > 80) printLogOutputFile(`[CPU WARNING] => ${percent}%`)
      }, 5000)
      const stop = () => {
        clearInterval(timer)
        clearInterval(logger)
        contents.removeListener('did-start-navigation', navigate)
        contents.removeListener('destroyed', stop)
        samples.delete(contents.id)
      }
      const navigate = (_event: unknown, _url: string, inPlace: boolean, mainFrame: boolean) => {
        if (mainFrame && !inPlace) stop()
      }
      contents.on('did-start-navigation', navigate)
      contents.once('destroyed', stop)
      samples.set(contents.id, { values, stop })
    },
    roles,
  )
  registerMainMethod(
    'fetch-compute-percent',
    (_params, context) => samples.get(invocationWindow(context).webContents.id)?.values ?? Array<number>(10).fill(0),
    roles,
  )
  registerMainMethod(
    'clear-compute-percent',
    (_params, context) => {
      samples.get(invocationWindow(context).webContents.id)?.stop()
    },
    roles,
  )
  registerMainMethod('open-yaklang-path', () => shell.openPath(getYaklangEngineDir()), roles)
  registerMainMethod('open-yakit-path', () => shell.openPath(getYakitInstallDir()), roles)
  registerMainMethod('fetch-remote-file-path', () => getRemoteLinkDir(), roles)
  registerMainMethod('open-remote-link', () => shell.openPath(getRemoteLinkDir()), roles)
  registerMainMethod('check-yakit-install-file', async (filename) => {
    if (!filename) return false
    try {
      return (await fs.promises.readdir(getYakitInstallDir())).some((file) => file.includes(filename))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
      throw error
    }
  })
  registerMainMethod('fetch-computer-name', () => OS.hostname())
  /**
   * 处理 DMG 文件并安装
   * @param {string} dmgPath - dmg 文件路径
   */
  const installDMG = (dmgPath: string) => {
    return new Promise((resolve, reject) => {
      let volumePath: string
      let newlyMounted = false

      // 1. 尝试挂载 dmg
      const mountCommand = `hdiutil attach "${dmgPath}"`
      exec(mountCommand, (mountErr, mountStdout, mountStderr) => {
        if (mountErr) {
          console.warn(`挂载 DMG 失败: ${mountStderr.trim()}`)
          // 2. 尝试查找已挂载卷
          const volumes = fs.readdirSync('/Volumes')
          const dmgName = path.basename(dmgPath, '.dmg')
          const matchVolume = volumes.find((v) => v.includes(dmgName))
          if (!matchVolume) {
            return reject(`DMG 挂载失败，且未找到已挂载卷: ${mountStderr.trim()}`)
          }
          volumePath = `/Volumes/${matchVolume}`
          console.log(`使用已挂载卷: ${volumePath}`)
        } else {
          // 正常挂载成功
          const volumeNameMatch = mountStdout.match(/\/Volumes\/[^\n]+/)
          if (!volumeNameMatch) {
            return reject('无法获取挂载的卷路径')
          }
          volumePath = volumeNameMatch[0].trim()
          newlyMounted = true
        }

        // 3. 查找 .app
        let appPath: string, targetAppPath: string
        try {
          const files = fs.readdirSync(volumePath)
          const appName = files.find((f) => f.endsWith('.app'))
          if (!appName) throw new Error(`在挂载卷 ${volumePath} 下未找到 .app 文件`)
          appPath = path.join(volumePath, appName)
          targetAppPath = `/Applications/${path.basename(appPath)}`
        } catch (err) {
          return reject(err instanceof Error ? err.message : String(err))
        }

        // 4. 覆盖安装
        const copyCommand = `
        ditto -rsrc "${appPath}" "${targetAppPath}" \
        || (rm -rf "${targetAppPath}" && cp -Rf "${appPath}" /Applications/)
      `

        exec(copyCommand, (copyErr, copyStdout, copyStderr) => {
          if (copyErr) {
            return reject(`安装应用失败: ${copyStderr}`)
          }

          // 5. 卸载 dmg（仅新挂载的才卸载）
          if (newlyMounted) {
            const unmountCommand = `hdiutil detach "${volumePath}" -quiet`
            exec(unmountCommand, (unmountErr, unmountStdout, unmountStderr) => {
              if (unmountErr) {
                console.warn(`卸载 DMG 文件失败: ${unmountStderr}`)
              }
              resolve(`应用 ${path.basename(appPath)} 已成功安装到 /Applications (覆盖完成)`)
            })
          } else {
            resolve(`应用 ${path.basename(appPath)} 已成功安装到 /Applications (覆盖完成，使用已有挂载卷)`)
          }
        })
      })
    })
  }

  /**
   * 安装 AppImage 文件
   * @param {string} appImagePath - AppImage 文件路径
   */
  const installAppImage = (appImagePath: string) => {
    return new Promise<void>((resolve, reject) => {
      // 给 AppImage 文件赋予执行权限
      const command = `chmod +x "${appImagePath}"`
      exec(command, (err, stdout, stderr) => {
        if (err) {
          reject(`赋予执行权限失败: ${stderr}`)
        } else {
          // 运行 AppImage 文件
          const runCommand = `"${appImagePath}"`
          exec(runCommand, (runErr, runStdout, runStderr) => {
            if (runErr) {
              reject(`运行 AppImage 文件失败: ${runStderr}`)
            } else {
              resolve()
            }
          })
        }
      })
    })
  }

  /** 安装内网版 yakit */
  const installIntranetYakit = (
    zipFile: string,
    reject: (error: unknown) => void,
    resolve: (value: string) => void,
  ) => {
    if (process.platform === 'win32') {
      // windows 平台安装逻辑
      exec(`"${zipFile}"`, (installErr, stdout, stderr) => {
        if (installErr) {
          reject(`安装程序执行失败: ${stderr}`)
        } else {
          resolve('应用安装成功')
        }
      })
    } else if (process.platform === 'darwin') {
      installDMG(zipFile)
        .then(() => resolve('应用安装成功'))
        .catch((error) => reject(error))
    } else if (process.platform === 'linux') {
      installAppImage(zipFile)
        .then(() => resolve('应用安装成功'))
        .catch((error) => reject(error))
    } else {
      reject('Unsupported platform')
    }
  }

  const asyncInstallIntranetYakit = (filePath: string) => {
    return new Promise<string>((resolve, reject) => {
      try {
        const dest = path.join(getYakitInstallDir(), path.basename(filePath))
        fs.access(dest, fs.constants.F_OK, async (err) => {
          if (!err) {
            // 输出的名称（只获取文件名，不带扩展名）
            const output_name = path.basename(filePath, path.extname(filePath))
            // 文件已存在 进行解压安装 创建 StreamZip 实例来读取 ZIP 文件
            const zipHandler = new zip({ file: dest, storeEntries: true })
            zipHandler.on('error', reject)
            zipHandler.on('ready', () => {
              // 获取目标文件所在的目录
              const destDir = path.dirname(dest)
              // 解压文件到目标文件同级目录
              zipHandler.extract(null, destDir, (err) => {
                if (err) {
                  reject(`解压失败: ${err.message}`)
                } else {
                  // 解压成功后，查找解压后的文件
                  const zipFile = path.join(destDir, output_name)
                  fs.access(zipFile, fs.constants.F_OK, (exeErr) => {
                    if (exeErr) {
                      reject('未找到安装程序 exe 文件')
                    } else {
                      installIntranetYakit(zipFile, reject, resolve)
                    }
                  })
                }
                zipHandler.close()
              })
            })
          } else {
            // 文件不存在，抛错
            reject('File does not exist')
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  /** 此处为内网版本直接安装 */
  registerMainMethod('install-intranet-yakit', async (filePath) => {
    return await asyncInstallIntranetYakit(filePath)
  })
}
