const {ipcMain} = require("electron");


module.exports = (win, getClient) => {
    ipcMain.handle("delete-http-flows-all", async (e, params) => {
        getClient().DeleteHTTPFlows({DeleteAll: true, ...params}, (err, data) => {
        })
    })

    // asyncDeleteHTTPFlows wrapper
    const asyncDeleteHTTPFlows = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteHTTPFlows(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteHTTPFlows", async (e, params) => {
        return await asyncDeleteHTTPFlows(params)
    })

    // asyncDeleteHTTPFlows wrapper
    const asyncQueryHTTPFlowsIds = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHTTPFlowsIds(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHTTPFlowsIds", async (e, params) => {
        return await asyncQueryHTTPFlowsIds(params)
    })

    ipcMain.handle("query-http-flows", async (e, params) => {
        getClient().QueryHTTPFlows(params, (err, data) => {
            if (err && win) {
                win.webContents.send("client-query-http-flows-error", err?.details || "unknown")
                return
            }

            if (data) {
                win.webContents.send("client-query-http-flows-response", data)
            }
        })
    })

    // asyncQueryHTTPFlows wrapper
    const asyncQueryHTTPFlows = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHTTPFlows(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHTTPFlows", async (e, params) => {
        return await asyncQueryHTTPFlows(params)
    })

    // asyncQueryHTTPFlowByIds wrapper
    const asyncQueryHTTPFlowByIds = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHTTPFlowByIds(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHTTPFlowByIds", async (e, params) => {
        return await asyncQueryHTTPFlowByIds(params)
    })

    // asyncSetTagForHTTPFlow wrapper
    const asyncSetTagForHTTPFlow = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetTagForHTTPFlow(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetTagForHTTPFlow", async (e, params) => {
        return await asyncSetTagForHTTPFlow(params)
    })


    // asyncGetHTTPFlowById wrapper
    const asyncGetHTTPFlowById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetHTTPFlowById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetHTTPFlowById", async (e, params) => {
        return await asyncGetHTTPFlowById(params)
    })

    // asyncGetAvailableYakScriptTags wrapper
    const asyncGetAvailableYakScriptTags = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAvailableYakScriptTags(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAvailableYakScriptTags", async (e, params) => {
        return await asyncGetAvailableYakScriptTags(params)
    })

    // asyncForceUpdateAvailableYakScriptTags wrapper
    const asyncForceUpdateAvailableYakScriptTags = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ForceUpdateAvailableYakScriptTags(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ForceUpdateAvailableYakScriptTags", async (e, params) => {
        return await asyncForceUpdateAvailableYakScriptTags(params)
    })
}