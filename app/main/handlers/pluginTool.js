const { ipcMain } = require("electron")
const OS = require("os")
const { USER_INFO } = require("../state")
const handlerHelper = require("./handleStreamWithContext")

module.exports = (win, getClient) => {
    const cpuData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
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
        return { idle: totalIdle / cpus.length, total: totalTick / cpus.length }
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

    // ????????????CPU????????????????????????
    ipcMain.handle("start-compute-percent", () => {
        if (time) clearInterval(time)
        time = setInterval(() => {
            //cpu
            getCPULoadAVG(400, 200).then((avg) => {
                cpuData.shift()
                cpuData.push(avg)
            })

            /**
             * memory??????????????????nodejs????????????????????????????????????
             *
             * ??????
             * ???????????????????????????"systeminformation"????????????????????????
             * ????????????????????????????????????????????????(???????????????????????????????????????????????????????????????)
             */
        }, 400)
    })
    // ??????CPU??????????????????
    ipcMain.handle("fetch-compute-percent", () => {
        return cpuData
    })
    // ????????????CPU??????????????????????????????
    ipcMain.handle("clear-compute-percent", () => {
        if (time) clearInterval(time)
    })

    // ????????????????????????
    ipcMain.handle("fetch-system-name", () => {
        return OS.type()
    })

    const asyncSetOnlineProfile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetOnlineProfile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //?????????????????
    ipcMain.handle("SetOnlineProfile", async (e, params) => {
        return await asyncSetOnlineProfile(params)
    })
    const asyncGetOnlineProfile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetOnlineProfile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //?????????????????
    ipcMain.handle("GetOnlineProfile", async (e, params) => {
        return await asyncGetOnlineProfile(params)
    })
    const asyncDownloadOnlinePluginById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                if (params.OnlineID) win.webContents.send('ref-plugin-operator', { pluginOnlineId: params.OnlineID })
                resolve(data)
            })
        })
    }
    //??????????????
    ipcMain.handle("DownloadOnlinePluginById", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginById(params)
    })
    const asyncDownloadOnlinePluginByIds = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginByIds(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //??????????????
    ipcMain.handle("DownloadOnlinePluginByIds", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginByIds(params)
    })
    // ????????????
    const streamDownloadOnlinePluginAll = new Map()
    ipcMain.handle("cancel-DownloadOnlinePluginAll", handlerHelper.cancelHandler(streamDownloadOnlinePluginAll))
    ipcMain.handle("DownloadOnlinePluginAll", (e, params, token) => {
        // params???Token??????????????????????????????????????????????????????????????????Token??????????????????
        const newParams = {
            BindMe: params.BindMe
        }
        if (params.isAddToken) {
            newParams.Token = USER_INFO.token
        }
        let stream = getClient().DownloadOnlinePluginAll(newParams)
        handlerHelper.registerHandler(win, stream, streamDownloadOnlinePluginAll, token)
    })

    const asyncDeletePluginByUserID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePluginByUserID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //??????????????
    ipcMain.handle("DeletePluginByUserID", async (e, params) => {
        return await asyncDeletePluginByUserID(params)
    })
    const asyncDeleteAllLocalPlugins = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAllLocalPlugins(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //????????????????????
    ipcMain.handle("DeleteAllLocalPlugins", async (e, params) => {
        return await asyncDeleteAllLocalPlugins(params)
    })
    const asyncGetYakScriptByOnlineID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptByOnlineID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //??????OnlineID ????????????????????????
    ipcMain.handle("GetYakScriptByOnlineID", async (e, params) => {
        return await asyncGetYakScriptByOnlineID(params)
    })
}
