const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext")
const {USER_INFO} = require("../state")
const fs = require("fs")

module.exports = (win, getClient) => {
    // get plugins risk list
    const asyncGetRiskList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YakScriptRiskTypeList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PluginsGetRiskList", async (e, params) => {
        return await asyncGetRiskList(params)
    })

    // get plugins risk info
    const asyncGetRiskInfo = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptRiskDetailByCWE(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PluginsGetRiskInfo", async (e, params) => {
        return await asyncGetRiskInfo(params)
    })

    // save local plugin
    const asyncSaveLocalPlugin = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveNewYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveNewYakScript", async (e, params) => {
        return await asyncSaveLocalPlugin(params)
    })

    // 批量插件上传
    const streamSaveYakScriptToOnline = new Map()
    ipcMain.handle("cancel-SaveYakScriptToOnline", handlerHelper.cancelHandler(streamSaveYakScriptToOnline))
    ipcMain.handle("SaveYakScriptToOnline", async (e, params, token) => {
        params.Token = USER_INFO.token || ""
        let stream = getClient().SaveYakScriptToOnline(params)
        handlerHelper.registerHandler(win, stream, streamSaveYakScriptToOnline, token)
    })

    const streamSmokingEvaluatePluginBatch = new Map()
    ipcMain.handle("cancel-SmokingEvaluatePluginBatch", handlerHelper.cancelHandler(streamSmokingEvaluatePluginBatch))
    ipcMain.handle("SmokingEvaluatePluginBatch", async (e, params, token) => {
        let stream = getClient().SmokingEvaluatePluginBatch(params)
        handlerHelper.registerHandler(win, stream, streamSmokingEvaluatePluginBatch, token)
    })

    // 批量本地插件导入
    let importYakScriptStream
    ipcMain.handle("ImportYakScriptStream", async (e, params) => {
        try {
            const data = fs.readFileSync(params.Filename, null)
            const uint8Array = new Uint8Array(data)
            params.Data = uint8Array
            importYakScriptStream = getClient().ImportYakScriptStream(params)
            importYakScriptStream.on("data", (e) => {
                if (!win) {
                    return
                }
                win.webContents.send("import-yak-script-data", e)
            })
            importYakScriptStream.on("error", (e) => {
                if (!win) {
                    return
                }
                win.webContents.send("import-yak-script-error", {message: e.message})
            })
            importYakScriptStream.on("end", () => {
                importYakScriptStream.cancel()
                importYakScriptStream = null
                if (!win) {
                    return
                }
                win.webContents.send("import-yak-script-end")
            })
        } catch (error) {
            if (!win) {
                return
            }
            win.webContents.send("import-yak-script-error", {message: error.message})
            win.webContents.send("import-yak-script-end")
        }
    })
    ipcMain.handle("cancel-ImportYakScriptStream", async () => {
        if (importYakScriptStream) importYakScriptStream.cancel()
    })

    // 批量导出本地插件
    let exportYakScriptStream
    ipcMain.handle("ExportYakScriptStream", async (e, params) => {
        exportYakScriptStream = getClient().ExportYakScriptStream(params)
        exportYakScriptStream.on("data", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("export-yak-script-data", e)
        })
        exportYakScriptStream.on("error", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("export-yak-script-error", e)
        })
        exportYakScriptStream.on("end", () => {
            exportYakScriptStream.cancel()
            exportYakScriptStream = null
            if (!win) {
                return
            }
            win.webContents.send("export-yak-script-end")
        })
    })
    ipcMain.handle("cancel-ExportYakScriptStream", async () => {
        if (exportYakScriptStream) exportYakScriptStream.cancel()
    })

    // 判断插件是否有老数据需要迁移提示
    const asyncYaklangGetCliCodeFromDatabase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YaklangGetCliCodeFromDatabase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("YaklangGetCliCodeFromDatabase", async (e, params) => {
        return await asyncYaklangGetCliCodeFromDatabase(params)
    })

    // 代码转参数&风险
    const asyncYaklangInspectInformation = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YaklangInspectInformation(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("YaklangInspectInformation", async (e, params) => {
        return await asyncYaklangInspectInformation(params)
    })

    // 通过 uuid 下载线上插件
    const asyncDownloadOnlinePluginByUUID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginByUUID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DownloadOnlinePluginByUUID", async (e, params) => {
        return await asyncDownloadOnlinePluginByUUID(params)
    })

    // 查询全部插件环境变量
    const asyncGetAllPluginEnv = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllPluginEnv(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllPluginEnv", async (e) => {
        return await asyncGetAllPluginEnv()
    })

    // 查询传入的插件环境变量名对应的值
    const asyncQueryPluginEnv = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPluginEnv(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryPluginEnv", async (e, params) => {
        return await asyncQueryPluginEnv(params)
    })

    // 批量创建插件环境变量
    const asyncCreatePluginEnv = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreatePluginEnv(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreatePluginEnv", async (e, params) => {
        return await asyncCreatePluginEnv(params)
    })

    // 批量设置插件环境变量
    const asyncSetPluginEnv = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetPluginEnv(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetPluginEnv", async (e, params) => {
        return await asyncSetPluginEnv(params)
    })

    // 删除插件环境变量
    const asyncDeletePluginEnv = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePluginEnv(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePluginEnv", async (e, params) => {
        return await asyncDeletePluginEnv(params)
    })
}
