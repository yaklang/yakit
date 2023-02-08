const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
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

    const asyncUpdateWebShellById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateWebShellById(params, (err, data) => {
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

    const asyncPingWebShells = (params) => {
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
        return await asyncPingWebShells(params)
    })

}
