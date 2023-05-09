const {ipcMain} = require("electron")

module.exports = (win, getWsmClient) => {
    const asyncCreateWebShell = (params) => {
        return new Promise((resolve, reject) => {
            getWsmClient().CreateWebShell(params, (err, data) => {
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
            getWsmClient().DeleteWebShell(params, (err, data) => {
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
            getWsmClient().UpdateWebShellById(params, (err, data) => {
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
            getWsmClient().QueryWebShells(params, (err, data) => {
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
            getWsmClient().Ping(params, (err, data) => {
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
            getWsmClient().GetBasicInfo(params, (err, data) => {
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
