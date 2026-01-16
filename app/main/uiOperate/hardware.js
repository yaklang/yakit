const {ipcMain, shell} = require("electron")
const OS = require("os")
const fs = require("fs")
const path = require("path")
const process = require("process")
const {yaklangEngineDir, remoteLinkDir, yakitInstallDir} = require("../filePath")
const zip = require("node-stream-zip")
const {exec} = require("child_process")
const {printLogOutputFile} = require("../logFile")

module.exports = (win, getClient) => {
    // CPU瞬时使用均值
    const cpuData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    // CPU监听计时器变量
    var time = null
    // 实时CPU写入日志
    var timeLog = null

    const cpuAverage = () => {
        //Initialise sum of idle and time of cores and fetch CPU info
        var totalIdle = 0,
            totalTick = 0
        var cpus = OS.cpus()

        //Loop through CPU cores
        for (var i = 0, len = cpus.length; i < len; i++) {
            //Select CPU core
            var cpu = cpus[i]

            //Total up the time in the cores tick
            for (type in cpu.times) {
                totalTick += cpu.times[type]
            }

            //Total up the idle time of the core
            totalIdle += cpu.times.idle
        }

        //Return the average Idle and Tick times
        return {idle: totalIdle / cpus.length, total: totalTick / cpus.length}
    }
    // function to calculate average of array
    const arrAvg = function (arr) {
        if (arr && arr.length >= 1) {
            const sumArr = arr.reduce((a, b) => a + b, 0)
            return sumArr / arr.length
        }
    }
    // load average for the past 1000 milliseconds calculated every 100
    const getCPULoadAVG = (avgTime = 1000, delay = 100) => {
        return new Promise((resolve, reject) => {
            const n = ~~(avgTime / delay)
            if (n <= 1) {
                reject("Error: interval to small")
            }

            let i = 0
            let samples = []
            const avg1 = cpuAverage()

            let interval = setInterval(() => {
                if (i >= n) {
                    clearInterval(interval)
                    resolve(~~(arrAvg(samples) * 100))
                }

                const avg2 = cpuAverage()
                const totalDiff = avg2.total - avg1.total
                const idleDiff = avg2.idle - avg1.idle

                samples[i] = 1 - idleDiff / totalDiff

                i++
            }, delay)
        })
    }

    // 开始进行CPU和内存使用率计算
    ipcMain.handle("start-compute-percent", () => {
        if (time) clearInterval(time)
        if (timeLog) clearInterval(timeLog)
        time = setInterval(() => {
            //cpu
            getCPULoadAVG(400, 200).then((avg) => {
                cpuData.shift()
                cpuData.push(avg)
            })

            /**
             * memory计算方式，纯nodejs无法获取准确的内存使用率
             *
             * 注：
             * 可以尝试使用三方库"systeminformation"获取内存详细数据
             * 但是使用该库将会导致功能明显卡顿(因为该库调用电脑命令或本地文件获取系统信息)
             */
        }, 400)

        // 实时CPU使用率写入日志
        timeLog = setInterval(()=>{
            try {
                let percent = cpuData[cpuData.length - 1] || 0
                if (percent > 80) {
                    printLogOutputFile(
                        `[CPU WARNING] => ${percent}%`
                    )
                }
            } catch (error) {}
        }, 5*1000)
    })
    // 获取CPU和内存使用率
    ipcMain.handle("fetch-compute-percent", () => {
        return cpuData
    })
    // 销毁计算CPU和内存使用率的计数器
    ipcMain.handle("clear-compute-percent", () => {
        if (time) clearInterval(time)
        if (timeLog) clearInterval(timeLog)
    })

    /** 获取操作系统类型 */
    ipcMain.handle("fetch-system-name", () => {
        return OS.type()
    })

    /** 获取CPU架构 */
    ipcMain.handle("fetch-cpu-arch", () => {
        return `${process.arch}`
    })

    /** 获取<操作系统-CPU架构>信息 */
    ipcMain.handle("fetch-system-and-arch", () => {
        /** @return {String} */
        return `${process.platform}-${process.arch}`
    })

    /** 打开 yaklang 或 yakit 文件所在文件夹 (ps:随着yakit下载移动至下载文件夹中，此方法仅打开yaklang)*/
    ipcMain.handle("open-yaklang-path", (e) => {
        return shell.openPath(yaklangEngineDir)
    })

    /** 打开 yakit 文件所在文件夹 */
    ipcMain.handle("open-yakit-path", (e) => {
        return shell.openPath(yakitInstallDir)
    })

    /** 检查 yakit 安装文件是否存在 */
    ipcMain.handle("check-yakit-install-file", async (e, filename) => {
        try {
            if (!filename) return false
            // 读取目录下的所有文件
            const files = fs.readdirSync(yakitInstallDir)
            
            // 判断是否有包含文件名的文件
            return files.some(file => file.includes(filename))
        } catch (error) {
            return false
        }
    })

    /**
     * 处理 DMG 文件并安装
     * @param {string} dmgPath - dmg 文件路径
     */
    const installDMG = (dmgPath) => {
        return new Promise((resolve, reject) => {
            let volumePath = null
            let newlyMounted = false

            // 1. 尝试挂载 dmg
            const mountCommand = `hdiutil attach "${dmgPath}"`
            exec(mountCommand, (mountErr, mountStdout, mountStderr) => {
                if (mountErr) {
                    console.warn(`挂载 DMG 失败: ${mountStderr.trim()}`)
                    // 2. 尝试查找已挂载卷
                    const volumes = fs.readdirSync("/Volumes")
                    const dmgName = path.basename(dmgPath, ".dmg")
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
                        return reject("无法获取挂载的卷路径")
                    }
                    volumePath = volumeNameMatch[0].trim()
                    newlyMounted = true
                }

                // 3. 查找 .app
                let appPath, targetAppPath
                try {
                    const files = fs.readdirSync(volumePath)
                    const appName = files.find((f) => f.endsWith(".app"))
                    if (!appName) throw new Error(`在挂载卷 ${volumePath} 下未找到 .app 文件`)
                    appPath = path.join(volumePath, appName)
                    targetAppPath = `/Applications/${path.basename(appPath)}`
                } catch (err) {
                    return reject(err.message)
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
    const installAppImage = (appImagePath) => {
        return new Promise((resolve, reject) => {
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
    const installIntranetYakit = (zipFile, reject, resolve) => {
        if (process.platform === "win32") {
            // windows 平台安装逻辑
            exec(`"${zipFile}"`, (installErr, stdout, stderr) => {
                if (installErr) {
                    reject(`安装程序执行失败: ${stderr}`)
                } else {
                    resolve("应用安装成功")
                }
            })
        } else if (process.platform === "darwin") {
            installDMG(zipFile)
                .then(() => resolve("应用安装成功"))
                .catch((error) => reject(error))
        } else if (process.platform === "linux") {
            installAppImage(zipFile)
                .then(() => resolve("应用安装成功"))
                .catch((error) => reject(error))
        } else {
            reject("Unsupported platform")
        }
    }

    const asyncInstallIntranetYakit = (filePath) => {
        return new Promise((resolve, reject) => {
            try {
                const dest = path.join(yakitInstallDir, path.basename(filePath))
                fs.access(dest, fs.constants.F_OK, async (err) => {
                    if (!err) {
                        // 输出的名称（只获取文件名，不带扩展名）
                        const output_name = path.basename(filePath, path.extname(filePath))
                        // 文件已存在 进行解压安装 创建 StreamZip 实例来读取 ZIP 文件
                        const zipHandler = new zip({file: dest, storeEntries: true})
                        zipHandler.on("ready", () => {
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
                                            reject("未找到安装程序 exe 文件")
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
                        reject("File does not exist")
                    }
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    /** 此处为内网版本直接安装 */
    ipcMain.handle("install-intranet-yakit", async (e, filePath) => {
        return await asyncInstallIntranetYakit(filePath)
    })

    /** 获取远程连接配置信息文件路径 */
    ipcMain.handle("fetch-remote-file-path", (e) => {
        return remoteLinkDir
    })

    /** 打开远程连接配置信息文件夹 */
    ipcMain.handle("open-remote-link", (e) => {
        return shell.openPath(remoteLinkDir)
    })

    /** 获取计算机名 */
    ipcMain.handle("fetch-computer-name", () => {
        /** @return {String} */
        return OS.hostname()
    })
}
