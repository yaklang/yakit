const {ipcMain} = require("electron")

module.exports = (win, client) => {
    const asyncCreateWebShell = (params) => {
        return new Promise((resolve, reject) => {
            client().CreateWebShell(params, (err, data) => {
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

    const asyncDeleteWebShell = (params) => {
        return new Promise((resolve, reject) => {
            client().DeleteWebShell(params, (err, data) => {
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

    const asyncUpdateWebShellById = (params) => {
        return new Promise((resolve, reject) => {
            client().UpdateWebShellById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateWebShellById", async (e, params) => {
        return await asyncUpdateWebShellById(params)
    })


    const asyncQueryWebShells = (params) => {
        return new Promise((resolve, reject) => {
            client().QueryWebShells(params, (err, data) => {
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

    const asyncPingWebShells = (params) => {
        return new Promise((resolve, reject) => {
            client().Ping(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("Ping", async (e, params) => {
        return await asyncPingWebShells(params)
    })

    const asyncGetBasicInfoWebShells = (params) => {
        return new Promise((resolve, reject) => {
            client().GetBasicInfo(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetBasicInfo", async (e, params) => {
        return await asyncGetBasicInfoWebShells(params)
    })

}