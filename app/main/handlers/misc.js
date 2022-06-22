const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    // asyncGetAvailableBruteTypes wrapper
    const asyncGetAvailableBruteTypes = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAvailableBruteTypes(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAvailableBruteTypes", async (e, params) => {
        return await asyncGetAvailableBruteTypes(params)
    })

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
}