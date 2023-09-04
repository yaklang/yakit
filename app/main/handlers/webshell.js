const {ipcMain} = require("electron")

module.exports = (win, getClient) => {

    // asyncCreateWebShell wrapper
    const asyncCreateWebShell = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateWebShell(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateWebShell", async (e, params) => {
        return await asyncCreateWebShell(params)
    })
    // DeleteWebShell
    const asyncDeleteWebShell = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteWebShell(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteWebShell", async (e, params) => {
        return await asyncDeleteWebShell(params)
    })

    // UpdateWebShellById
    const asyncUpdateWebShell = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateWebShell(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateWebShell", async (e, params) => {
        return await asyncUpdateWebShell(params)
    })

    // QueryWebShells
    const asyncQueryWebShells = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryWebShells(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryWebShells", async (e, params) => {
        return await asyncQueryWebShells(params)
    })

    // Ping
    const asyncPing = (params) => {
        return new Promise((resolve, reject) => {
            getClient().Ping(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("Ping", async (e, params) => {
        return await asyncPing(params)
    })

    // GetBasicInfo
    const asyncGetBasicInfo = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetBasicInfo(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetBasicInfo", async (e, params) => {
        return await asyncGetBasicInfo(params)
    })
}