const { ipcMain } = require("electron")
const handlerHelper = require("./handleStreamWithContext")
const { USER_INFO } = require("../state")

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
    ipcMain.handle("ImportYakScript", async (e, params) => {
        importYakScriptStream = getClient().ImportYakScript(params)

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
            win.webContents.send("import-yak-script-error", e)
        })
        importYakScriptStream.on("end", () => {
            importYakScriptStream.cancel()
            importYakScriptStream = null
            if (!win) {
                return
            }
            win.webContents.send("import-yak-script-end")
        })
    })
    ipcMain.handle("cancel-importYakScript", async () => {
        if (importYakScriptStream) importYakScriptStream.cancel()
    })

    // 批量导出本地插件
    let exportYakScriptStream
    ipcMain.handle("ExportLocalYakScript", async (e, params) => {
        exportYakScriptStream = getClient().ExportLocalYakScript(params)
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
    ipcMain.handle("cancel-exportYakScript", async () => {
        if (exportYakScriptStream) exportYakScriptStream.cancel()
    })
}
