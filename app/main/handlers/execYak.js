const {ipcMain, dialog} = require("electron")
const FS = require("fs")
const PATH = require("path")

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext")

    const streamExecMap = new Map()
    ipcMain.handle("cancel-ExecYakCode", handlerHelper.cancelHandler(streamExecMap))
    ipcMain.handle("ExecYakCode", (e, params, token) => {
        let stream = getClient().Exec(params)
        handlerHelper.registerHandler(win, stream, streamExecMap, token)
    })

    let stream
    ipcMain.handle("cancel-yak", async () => {
        if (stream) stream.cancel()
    })
    ipcMain.handle("cancel-exec-yak", async () => {
        if (stream) stream.cancel()
    })
    ipcMain.handle("exec-yak", async (e, execRequest) => {
        stream = getClient().Exec(execRequest)
        stream.on("data", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("client-yak-data", e)
        })
        stream.on("error", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("client-yak-error", e)
        })
        stream.on("end", () => {
            stream.cancel()
            stream = null
            if (!win) {
                return
            }
            win.webContents.send("client-yak-end")
        })
    })

    ipcMain.handle("yak-exec-history", async (e, req) => {
        getClient().QueryExecHistory(req, (err, response) => {
            if (win && err) {
                win.webContents.send("client-yak-exec-history", err.details || "execHistory querying unknown error")
            } else win && response
            {
                win.webContents.send("client-yak-exec-history", response)
            }
        })
    })

    // asyncQueryExecHistory wrapper
    const asyncQueryExecHistory = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryExecHistory(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryExecHistory", async (e, params) => {
        return await asyncQueryExecHistory(params)
    })

    // 弹出保存窗口
    const asyncSaveFileDialog = async (params) => {
        return new Promise((resolve, reject) => {
            dialog
                .showSaveDialog(win, {
                    title: "保存文件",
                    defaultPath: params
                })
                .then((res) => {
                    const params = res
                    params.name = PATH.basename(res.filePath)
                    resolve(params)
                })
        })
    }
    ipcMain.handle("show-save-dialog", async (e, params) => {
        return await asyncSaveFileDialog(params)
    })

    // 删除文件
    const asyncDeleteCodeFile = (params) => {
        return new Promise((resolve, reject) => {
            FS.unlink(params, function (err) {
                if (err) reject(err)
                else resolve("success")
            })
        })
    }
    ipcMain.handle("delelte-code-file", async (e, params) => {
        return await asyncDeleteCodeFile(params)
    })

    //判断文件是否存在
    const asyncIsExistsFile = (params) => {
        return new Promise((resolve, reject) => {
            FS.access(params, FS.constants.F_OK, function (err) {
                if (err) resolve(err)
                else reject("fail")
            })
        })
    }
    ipcMain.handle("is-exists-file", async (e, params) => {
        return await asyncIsExistsFile(params)
    })

    //文件重命名
    const asyncRenameFile = (params) => {
        return new Promise((resolve, reject) => {
            FS.rename(params.old, params.new, function (err) {
                if (err) reject(err)
                else resolve("success")
            })
        })
    }
    ipcMain.handle("rename-file", async (e, params) => {
        if (!params.old || !params.new) return "fail"
        return await asyncRenameFile(params)
    })

    // 将内容写入文件,文件未存在则新建文件后再进行写入
    const asyncWriteFile = (params) => {
        return new Promise((resolve, reject) => {
            FS.writeFile(params.route, params.data, function (err) {
                if (err) reject(err)
                else resolve("success")
            })
        })
    }
    ipcMain.handle("write-file", async (e, params) => {
        if (!params.route || !params.data) return "fail"
        return await asyncWriteFile(params)
    })

    // 批量执行脚本的新接口：通过一个短 Filter 执行
    const streamExecutePacketYakScriptMap = new Map()
    ipcMain.handle("cancel-ExecutePacketYakScript", handlerHelper.cancelHandler(streamExecutePacketYakScriptMap))
    ipcMain.handle("ExecutePacketYakScript", (e, params, token) => {
        let stream = getClient().ExecutePacketYakScript(params)
        handlerHelper.registerHandler(win, stream, streamExecutePacketYakScriptMap, token)
    })

    const streamExecYakitPluginsByYakScriptFilterMap = new Map()
    ipcMain.handle(
        "cancel-ExecYakitPluginsByYakScriptFilter",
        handlerHelper.cancelHandler(streamExecYakitPluginsByYakScriptFilterMap)
    )
    ipcMain.handle("ExecYakitPluginsByYakScriptFilter", (e, params, token) => {
        let stream = getClient().ExecYakitPluginsByYakScriptFilter(params)
        handlerHelper.registerHandler(win, stream, streamExecYakitPluginsByYakScriptFilterMap, token)
    })

    const streamExecPacketScanMap = new Map()
    ipcMain.handle("cancel-ExecPacketScan", handlerHelper.cancelHandler(streamExecPacketScanMap))
    ipcMain.handle("ExecPacketScan", (e, params, token) => {
        let stream = getClient().ExecPacketScan(params)
        handlerHelper.registerHandler(win, stream, streamExecPacketScanMap, token)
    })

    const asyncGetYakScriptTags = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptTags(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除本地插件,带条件
    ipcMain.handle("GetYakScriptTags", async (e, params) => {
        return await asyncGetYakScriptTags(params)
    })


    /* 追加查看引擎输出的接口 */
    const streamAttachCombinedOutputMap = new Map();
    ipcMain.handle("cancel-AttachCombinedOutput", handlerHelper.cancelHandler(streamAttachCombinedOutputMap));
    ipcMain.handle("AttachCombinedOutput", (e, params, token) => {
        let stream = getClient().AttachCombinedOutput(params);
        handlerHelper.registerHandler(win, stream, streamAttachCombinedOutputMap, token)
    })

    const streamInteractiveRunYakCodeMap = new Map()
    ipcMain.handle("cancel-InteractiveRunYakCode", handlerHelper.cancelHandler(streamInteractiveRunYakCodeMap))
    ipcMain.handle("InteractiveRunYakCodeWrite", (e, token, data) => {
        let stream = streamInteractiveRunYakCodeMap.get(token)
        if (!!stream) {
            stream.write(data)
        }
    })
    ipcMain.handle("InteractiveRunYakCode", (e, token) => {
        let stream = getClient().CreateYaklangShell()
        handlerHelper.registerHandler(win, stream, streamInteractiveRunYakCodeMap, token)

        streamInteractiveRunYakCodeMap.set(token, stream)
        stream.on("data", (data) => {
            if (!win) {
                return
            }
            if (data.Scope && data.Scope.length > 0) {
                win.webContents.send(`${token}-data-scope`, data.Scope)
            }
            if (data.RawResult) {
                if (Boolean(data.RawResult?.IsMessage) && data.RawResult.Message.toString() === "signal-interactive-exec-end") {
                    win.webContents.send(`${token}-exec-end`)
                } else {
                    win.webContents.send(`${token}-data`, data.RawResult)
                }

            }
        })
        stream.on("error", (error) => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-error`, error && error.details)
        })
        stream.on("end", () => {
            streamInteractiveRunYakCodeMap.delete(token)
            if (!win) {
                return
            }
            win.webContents.send(`${token}-end`)
        })
    })

    const streamHybridScanMap = new Map();
    ipcMain.handle("cancel-HybridScan", handlerHelper.cancelHandler(streamHybridScanMap));
    ipcMain.handle("HybridScan", (e, params, token) => {
        let current = streamHybridScanMap.get(token);
        if (current !== undefined) {
            current.write(params)
            return
        }

        console.info("HybridScan task start")
        let stream = getClient().HybridScan();
        stream.write(params)
        handlerHelper.registerHandler(win, stream, streamHybridScanMap, token)
    })

    // asyncQueryHybridScanTask wrapper
    const asyncQueryHybridScanTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHybridScanTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHybridScanTask", async (e, params) => {
        return await asyncQueryHybridScanTask(params)
    })

    // asyncDeleteHybridScanTask wrapper
    const asyncDeleteHybridScanTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteHybridScanTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteHybridScanTask", async (e, params) => {
        return await asyncDeleteHybridScanTask(params)
    })
}
