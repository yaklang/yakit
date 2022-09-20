const {ipcMain} = require("electron")

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

    const handlerHelper = require("./handleStreamWithContext")

    const streamSavePayloadStreamMap = new Map()
    ipcMain.handle("cancel-SavePayloadStream", handlerHelper.cancelHandler(streamSavePayloadStreamMap))
    ipcMain.handle("SavePayloadStream", (e, params, token) => {
        let stream = getClient().SavePayloadStream(params)
        handlerHelper.registerHandler(win, stream, streamSavePayloadStreamMap, token)
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

    const asyncDeletePayloadByContent = (params) => {
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
    ipcMain.handle("DeletePayloadByContent", async (e, params) => {
        return await asyncDeletePayloadByContent(params)
    })

    const asyncUpdatePayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdatePayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdatePayload", async (e, params) => {
        return await asyncUpdatePayload(params)
    })
}
