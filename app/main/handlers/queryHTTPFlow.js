const { ipcMain } = require("electron")
const { Uint8ArrayToString } = require("../toolsFunc")
const fs = require("fs")
const { handleSaveFileSystem } = require("../utils/fileSystemDialog")

module.exports = (win, getClient) => {
    ipcMain.handle("delete-http-flows-all", async (e, params) => {
        getClient().DeleteHTTPFlows({ DeleteAll: true, ...params }, (err, data) => { })
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

    const asyncQueryHTTPFlowsProcessNames = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHTTPFlowsProcessNames(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHTTPFlowsProcessNames", async (e, params) => {
        return await asyncQueryHTTPFlowsProcessNames(params)
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
                resolve({
                    ...data,
                    RequestString: !!data?.Request?.length ? Uint8ArrayToString(data.Request) : "",
                    ResponseString: !!data?.Response?.length ? Uint8ArrayToString(data.Response) : ""
                })
            })
        })
    }
    ipcMain.handle("GetHTTPFlowById", async (e, params) => {
        return await asyncGetHTTPFlowById(params)
    })

    // asyncGetHTTPFlowByIds wrapper
    const asyncGetHTTPFlowByIds = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetHTTPFlowByIds(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetHTTPFlowByIds", async (e, params) => {
        return await asyncGetHTTPFlowByIds(params)
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

    const execWriteFile = (uuid, resolve, reject) => {
        const context = activeRequests.get(uuid)
        if (!context) return
        const timer = setInterval(() => {
            if (context.dataChunks.length > 0) {
                try {
                    context.fileStream.write(context.dataChunks.shift())
                } catch (error) {
                    context.fileStream.end()
                    clearInterval(timer)
                    activeRequests.delete(uuid)
                    reject(error)
                }
            } else if (context.streamEnded) {
                context.fileStream.end()
                clearInterval(timer)
                activeRequests.delete(uuid)
                resolve(true)
            }
        }, 50)
    }
    let activeRequests = new Map()
    ipcMain.handle("GetHTTPFlowBodyById", (e, params) => {
        return new Promise((resolve, reject) => {
            const query = {
                ...params
            }
            delete query.uuid
            const context = {
                getHTTPFlowBodyByIdResponseStream: getClient().GetHTTPFlowBodyById(query),
                fileStream: null,
                dataChunks: [],
                streamEnded: false
            }

            activeRequests.set(params.uuid, context)

            context.getHTTPFlowBodyByIdResponseStream.on("data", (e) => {
                if (!win) {
                    return
                }

                if (e.Data) {
                    context.dataChunks.push(e.Data)
                }

                context.streamEnded = e.EOF

                // 只有第一次返回文件名
                if (e.Filename) {
                    const fileName = e.Filename
                    handleSaveFileSystem({
                        title: "保存文件",
                        defaultPath: fileName
                    })
                        .then((file) => {
                            if (!file.canceled) {
                                const filePath = file.filePath.toString()
                                context.fileStream = fs.createWriteStream(filePath)
                                execWriteFile(params.uuid, resolve, reject)
                            } else {
                                getHTTPFlowBodyByIdResponseStream.cancel()
                                activeRequests.delete(params.uuid)
                            }
                        })
                        .catch((err) => {
                            getHTTPFlowBodyByIdResponseStream.cancel()
                            activeRequests.delete(params.uuid)
                            reject(err)
                        })
                }
            })

            context.getHTTPFlowBodyByIdResponseStream.on("error", (e) => {
                if (!win) {
                    return
                }
                reject(e)
            })
        })
    })

    // asyncQueryMITMRuleExtractedData wrapper
    const asyncQueryMITMRuleExtractedData = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryMITMRuleExtractedData(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryMITMRuleExtractedData", async (e, params) => {
        return await asyncQueryMITMRuleExtractedData(params)
    })


    // asyncExportMITMRuleExtractedData wrapper
    const asyncExportMITMRuleExtractedData = (params) => {
        return new Promise((resolve, reject) => {
            const responseStream = getClient().ExportMITMRuleExtractedData(params)
            responseStream.on("data", (e) => {
                if (!win) {
                    return
                }
                if (e.Percent === 1) {
                    resolve(e.ExportFilePath)
                }
            })
            responseStream.on("error", (e) => {
                if (!win) {
                    return
                }
                reject(e)
            })
        })
    }
    ipcMain.handle("ExportMITMRuleExtractedData", async (e, params) => {
        return await asyncExportMITMRuleExtractedData(params)
    })

    const asyncHTTPFlowsShare = (params) => {
        return new Promise((resolve, reject) => {
            getClient().HTTPFlowsShare(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("HTTPFlowsShare", async (e, params) => {
        return await asyncHTTPFlowsShare(params)
    })
    const asyncHTTPFlowsExtract = (params) => {
        return new Promise((resolve, reject) => {
            getClient().HTTPFlowsExtract(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("HTTPFlowsExtract", async (e, params) => {
        return await asyncHTTPFlowsExtract(params)
    })

    const asyncGetHTTPFlowBare = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetHTTPFlowBare(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetHTTPFlowBare", async (e, params) => {
        return await asyncGetHTTPFlowBare(params)
    })

    const asyncExportHTTPFlows = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExportHTTPFlows(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExportHTTPFlows", async (e, params) => {
        return await asyncExportHTTPFlows(params)
    })

    const handlerHelper = require("./handleStreamWithContext");
    const streamExportHTTPFlowMap = new Map()
    ipcMain.handle("cancel-ExportHTTPFlowStream", handlerHelper.cancelHandler(streamExportHTTPFlowMap))
    ipcMain.handle("ExportHTTPFlowStream", (e, params, token) => {
        let stream = getClient().ExportHTTPFlowStream(params)
        handlerHelper.registerHandler(win, stream, streamExportHTTPFlowMap, token)
    })

    const streamImportHTTPFlowMap = new Map()
    ipcMain.handle("cancel-ImportHTTPFlowStream", handlerHelper.cancelHandler(streamImportHTTPFlowMap))
    ipcMain.handle("ImportHTTPFlowStream", (e, params, token) => {
        let stream = getClient().ImportHTTPFlowStream(params)
        handlerHelper.registerHandler(win, stream, streamImportHTTPFlowMap, token)
    })

    const asyncHTTPFlowsToOnline = (params) => {
        return new Promise((resolve, reject) => {
            getClient().HTTPFlowsToOnline(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("HTTPFlowsToOnline", async (e, params) => {
        return await asyncHTTPFlowsToOnline(params)
    })
}
