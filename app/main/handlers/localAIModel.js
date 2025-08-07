const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext")

    // asyncIsLlamaServerReady wrapper
    const asyncIsLlamaServerReady = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsLlamaServerReady(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsLlamaServerReady", async (e, params) => {
        return await asyncIsLlamaServerReady(params)
    })

    // asyncIsLocalModelReady wrapper
    const asyncIsLocalModelReady = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsLocalModelReady(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsLocalModelReady", async (e, params) => {
        return await asyncIsLocalModelReady(params)
    })

    // InstallLlamaServer stream handler
    const streamInstallLlamaServerMap = new Map()
    ipcMain.handle("cancel-InstallLlamaServer", handlerHelper.cancelHandler(streamInstallLlamaServerMap))
    ipcMain.handle("InstallLlamaServer", (e, params, token) => {
        let stream = getClient().InstallLlamaServer(params)
        handlerHelper.registerHandler(win, stream, streamInstallLlamaServerMap, token)
    })

    // StartLocalModel stream handler
    const streamStartLocalModelMap = new Map()
    ipcMain.handle("cancel-StartLocalModel", handlerHelper.cancelHandler(streamStartLocalModelMap))
    ipcMain.handle("StartLocalModel", (e, params, token) => {
        let stream = getClient().StartLocalModel(params)
        handlerHelper.registerHandler(win, stream, streamStartLocalModelMap, token)
    })

    // DownloadLocalModel stream handler
    const streamDownloadLocalModelMap = new Map()
    ipcMain.handle("cancel-DownloadLocalModel", handlerHelper.cancelHandler(streamDownloadLocalModelMap))
    ipcMain.handle("DownloadLocalModel", (e, params, token) => {
        let stream = getClient().DownloadLocalModel(params)
        handlerHelper.registerHandler(win, stream, streamDownloadLocalModelMap, token)
    })

    // asyncGetSupportedLocalModels wrapper
    const asyncGetSupportedLocalModels = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSupportedLocalModels(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSupportedLocalModels", async (e, params) => {
        return await asyncGetSupportedLocalModels(params)
    })

    const asyncAddLocalModel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AddLocalModel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AddLocalModel", async (e, params) => {
        return await asyncAddLocalModel(params)
    })

    const asyncDeleteLocalModel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteLocalModel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteLocalModel", async (e, params) => {
        return await asyncDeleteLocalModel(params)
    })

    const asyncUpdateLocalModel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteLocalModel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateLocalModel", async (e, params) => {
        return await asyncUpdateLocalModel(params)
    })

    const asyncGetAllStartedLocalModels = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllStartedLocalModels(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllStartedLocalModels", async (e, params) => {
        return await asyncGetAllStartedLocalModels(params)
    })

    const asyncClearAllModels = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ClearAllModels(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ClearAllModels", async (e, params) => {
        return await asyncClearAllModels(params)
    })
}
