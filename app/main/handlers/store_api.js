const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncGetKey wrapper
    const asyncGetKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data.Value)
            })
        })
    }
    ipcMain.handle("GetKey", async (e, params) => {
        return await asyncGetKey(params)
    })

    // asyncSetKey wrapper
    const asyncSetKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetKey", async (e, params) => {
        return await asyncSetKey(params)
    })

    // asyncDelKey wrapper
    const asyncDelKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DelKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DelKey", async (e, params) => {
        return await asyncDelKey(params)
    })

    // asyncGetAllProcessEnvKey wrapper
    const asyncGetAllProcessEnvKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllProcessEnvKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllProcessEnvKey", async (e, params) => {
        return await asyncGetAllProcessEnvKey(params)
    })

    // asyncSetProcessEnvKey wrapper
    const asyncSetProcessEnvKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetProcessEnvKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetProcessEnvKey", async (e, params) => {
        return await asyncSetProcessEnvKey(params)
    })

}