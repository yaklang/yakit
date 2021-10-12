const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    const asyncQueryPayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryPayload", async (e, params) => {
        return await asyncQueryPayload(params)
    })

    const asyncDeletePayloadByGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePayloadByGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePayloadByGroup", async (e, params) => {
        return await asyncDeletePayloadByGroup(params)
    })

    // asyncDeletePayload wrapper
    const asyncDeletePayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePayload", async (e, params) => {
        return await asyncDeletePayload(params)
    })

    // asyncSavePayload wrapper
    const asyncSavePayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SavePayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SavePayload", async (e, params) => {
        return await asyncSavePayload(params)
    })

    // asyncGetAllPayloadGroup wrapper
    const asyncGetAllPayloadGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllPayloadGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllPayloadGroup", async (e, params) => {
        return await asyncGetAllPayloadGroup(params)
    })
}