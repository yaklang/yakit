const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncGetSystemProxy wrapper
    const asyncGetSystemProxy = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSystemProxy(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSystemProxy", async (e, params) => {
        return await asyncGetSystemProxy(params)
    })

    // asyncSetSystemProxy wrapper
    const asyncSetSystemProxy = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetSystemProxy(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetSystemProxy", async (e, params) => {
        return await asyncSetSystemProxy(params)
    })

}