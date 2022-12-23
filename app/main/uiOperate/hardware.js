const {ipcMain, clipboard} = require("electron")
const OS = require("os")
const https = require("https")
const {execFile, exec} = require("child_process")
const path = require("path")
const process = require("process")

module.exports = (win, getClient) => {
    // CPU瞬时使用均值
    const cpuData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    // CPU监听计时器变量
    var time = null

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
    })
    // 获取CPU和内存使用率
    ipcMain.handle("fetch-compute-percent", () => {
        return cpuData
    })
    // 销毁计算CPU和内存使用率的计数器
    ipcMain.handle("clear-compute-percent", () => {
        if (time) clearInterval(time)
    })

    // mac截图功能
    const macScreenshot = () => {
        exec("screencapture -i -U -c", (error, stdout, stderr) => {
            console.log("308", error, stdout, stderr)
            // 从剪切板上取到图片
            const pngs = clipboard.readImage().toPNG()
            const imgs = "data:image/png;base64," + pngs.toString("base64")
            // mainWin是窗口实例，这里是将图片传给渲染进程
            win.webContents.send("captureScreenBack", imgs)
        })
    }
    // win和linux截图功能
    const winLinuxScreenshot = () => {
        let url = path.resolve(__dirname, "../../../build/PrintScr.exe")
        const screen_window = execFile(url)
        screen_window.on("exit", (code) => {
            if (code) {
                const pngs = clipboard.readImage().toPNG()
                const imgs = "data:image/png;base64," + pngs.toString("base64")
                win.webContents.send("captureScreenBack", imgs)
            }
        })
    }
    // 截图功能
    ipcMain.handle("activate-screenshot", () => {
        if (process.platform === "darwin") {
            macScreenshot()
        } else {
            winLinuxScreenshot()
        }
    })

    /** 获取操作系统类型 */
    ipcMain.handle("fetch-system-name", () => {
        return OS.type()
    })

    /** 获取<操作系统-CPU架构>信息 */
    ipcMain.handle("fetch-system-and-arch", () => {
        /** @return {String} */
        return `${process.platform}-${process.arch}`
    })

    /** 获取Yaklang引擎最新版本号 */
    const asyncFetchLatestYaklangVersion = () => {
        return new Promise((resolve, reject) => {
            let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/version.txt")
            rsp.on("response", (rsp) => {
                rsp.on("data", (data) => {
                    resolve(`v${Buffer.from(data).toString("utf8")}`.trim())
                }).on("error", (err) => {
                    reject(err)
                })
            })
            rsp.on("error", reject)
        })
    }
    /** 获取Yaklang引擎最新版本号 */
    ipcMain.handle("fetch-latest-yaklang-version", async (e) => {
        return await asyncFetchLatestYaklangVersion()
    })
}
