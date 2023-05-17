const {ipcMain} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {

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
    ipcMain.handle("delete-http-flows-all", async (e, params) => {
        getClient().DeleteHTTPFlows({DeleteAll: true, ...params}, (err, data) => {})
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

    const asyncHTTPFlowsFieldGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().HTTPFlowsFieldGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("HTTPFlowsFieldGroup", async (e, params) => {
        return await asyncHTTPFlowsFieldGroup(params)
    })

    // asyncGetRequestBodyByHTTPFlowID wrapper
    const asyncGetRequestBodyByHTTPFlowID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetRequestBodyByHTTPFlowID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetRequestBodyByHTTPFlowID", async (e, params) => {
        return await asyncGetRequestBodyByHTTPFlowID(params)
    })

    // asyncGetResponseBodyByHTTPFlowID wrapper
    const asyncGetResponseBodyByHTTPFlowID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetResponseBodyByHTTPFlowID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetResponseBodyByHTTPFlowID", async (e, params) => {
        return await asyncGetResponseBodyByHTTPFlowID(params)
    })

    // asyncGetHTTPPacketBody wrapper
    const asyncGetHTTPPacketBody = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetHTTPPacketBody(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetHTTPPacketBody", async (e, params) => {
        return await asyncGetHTTPPacketBody(params)
    })
}