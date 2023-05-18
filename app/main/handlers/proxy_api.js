const {ipcMain} = require("electron")


module.exports = (win, getClient) => {
    // asyncGetEngineDefaultProxy wrapper
    const asyncGetEngineDefaultProxy = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetEngineDefaultProxy(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetEngineDefaultProxy", async (e, params) => {
        return await asyncGetEngineDefaultProxy(params)
    })

    // asyncSetEngineDefaultProxy wrapper
    const asyncSetEngineDefaultProxy = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetEngineDefaultProxy(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetEngineDefaultProxy", async (e, params) => {
        return await asyncSetEngineDefaultProxy(params)
    })
}