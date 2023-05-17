const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    // asyncIsScrecorderReady wrapper
    const asyncIsScrecorderReady = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsScrecorderReady(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("IsScrecorderReady", async (e, params) => {
        return await asyncIsScrecorderReady(params)
    })

    const streamInstallScrecorderMap = new Map()
    ipcMain.handle("cancel-InstallScrecorder", handlerHelper.cancelHandler(streamInstallScrecorderMap))
    ipcMain.handle("InstallScrecorder", (e, params, token) => {
        let stream = getClient().InstallScrecorder(params)
        handlerHelper.registerHandler(win, stream, streamInstallScrecorderMap, token)
    })

    const streamStartScrecorderMap = new Map()
    ipcMain.handle("cancel-StartScrecorder", handlerHelper.cancelHandler(streamStartScrecorderMap))
    ipcMain.handle("StartScrecorder", (e, params, token) => {
        let stream = getClient().StartScrecorder(params)
        handlerHelper.registerHandler(win, stream, streamStartScrecorderMap, token)
    })

    // asyncQueryScreenRecorders wrapper
    const asyncQueryScreenRecorders = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryScreenRecorders(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("QueryScreenRecorders", async (e, params) => {
        return await asyncQueryScreenRecorders(params)
    })

}