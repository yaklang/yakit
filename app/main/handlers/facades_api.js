const {ipcMain} = require("electron")

const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    const streamStartFacadesMap = new Map()
    ipcMain.handle("cancel-StartFacades", handlerHelper.cancelHandler(streamStartFacadesMap))
    ipcMain.handle("StartFacades", (e, params, token) => {
        let stream = getClient().StartFacades(params)
        handlerHelper.registerHandler(win, stream, streamStartFacadesMap, token)
    })

    const streamStartFacadesWithYsoObjectMap = new Map()
    ipcMain.handle("cancel-StartFacadesWithYsoObject", handlerHelper.cancelHandler(streamStartFacadesWithYsoObjectMap))
    ipcMain.handle("StartFacadesWithYsoObject", (e, params, token) => {
        let stream = getClient().StartFacadesWithYsoObject(params)
        handlerHelper.registerHandler(win, stream, streamStartFacadesWithYsoObjectMap, token)
    })

    // asyncApplyClassToFacades wrapper
    const asyncApplyClassToFacades = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ApplyClassToFacades(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ApplyClassToFacades", async (e, params) => {
        return await asyncApplyClassToFacades(params)
    })

    // asyncBytesToBase64 wrapper
    const asyncBytesToBase64 = (params) => {
        return new Promise((resolve, reject) => {
            getClient().BytesToBase64(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("BytesToBase64", async (e, params) => {
        return await asyncBytesToBase64(params)
    })

    let globalConfigServer = null
    ipcMain.handle("get-global-reverse-server-status", (e) => {
        return !!globalConfigServer
    })
    ipcMain.handle("cancel-global-reverse-server-status", (e) => {
        if (globalConfigServer) {
            globalConfigServer.cancel()
            console.info("取消全局反连配置")
            globalConfigServer = null
        }
    })
    ipcMain.handle("ConfigGlobalReverse", (e, params) => {
        if (globalConfigServer) {
            console.info("已经存在全局反连配置")
            // 一般就配置本地 IP
            let stream = getClient().ConfigGlobalReverse(params)
            setTimeout(() => stream.cancel(), 3000)
            return
        }
        console.info("开始配置全局反连")
        globalConfigServer = getClient().ConfigGlobalReverse(params)
        globalConfigServer.on("data", (data) => {
            if (!win) {
                return
            }
            win.webContents.send(`global-reverse-data`, data)
        })
        globalConfigServer.on("error", (error) => {
            if (!win) {
                return
            }
            console.info("配置全局反连失败")
            /** 关闭或意外关闭都会触发此监听事件 */
            // console.info(error)
            win.webContents.send(`global-reverse-error`, error && error.details)
        })
        globalConfigServer.on("end", () => {
            console.info("配置全局反连结束，清除缓存")
            globalConfigServer = null
            if (!win) {
                return
            }
            win.webContents.send(`global-reverse-end`)
        })
    })


    // asyncAvailableLocalAddr wrapper
    const asyncAvailableLocalAddr = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AvailableLocalAddr(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AvailableLocalAddr", async (e, params) => {
        return await asyncAvailableLocalAddr(params)
    })

    // asyncGetGlobalReverseServer wrapper
    const asyncGetGlobalReverseServer = (params) => {
        return new Promise((resolve, reject) => {
            try {
                getClient().GetGlobalReverseServer(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            } catch (e) {
                reject(e)
            }
        })
    }
    ipcMain.handle("GetGlobalReverseServer", async (e, params) => {
        return await asyncGetGlobalReverseServer(params)
    })

    // asyncRegisterFacadesHTTP wrapper
    const asyncRegisterFacadesHTTP = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RegisterFacadesHTTP(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RegisterFacadesHTTP", async (e, params) => {
        return await asyncRegisterFacadesHTTP(params)
    })
}