const {ipcMain, dialog} = require("electron")
const FS = require("fs")
const PATH = require("path")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    const streamExecMap = new Map()
    ipcMain.handle("cancel-ExecYakCode", handlerHelper.cancelHandler(streamExecMap))
    ipcMain.handle("ExecYakCode", (e, params, token) => {
        let stream = getClient().Exec(params)
        handlerHelper.registerHandler(win, stream, streamExecMap, token)
    })

    let streamExec
    ipcMain.handle("cancel-yak", async () => {
        if (streamExec) streamExec.cancel()
    })
    ipcMain.handle("cancel-exec-yak", async () => {
        if (streamExec) streamExec.cancel()
    })
    ipcMain.handle("exec-yak", async (e, execRequest) => {
        streamExec = getClient().Exec(execRequest)
        streamExec.on("data", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("client-yak-data", e)
        })
        streamExec.on("error", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("client-yak-error", e)
        })
        streamExec.on("end", () => {
            streamExec.cancel()
            streamExec = null
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

    ipcMain.handle("update-nuclei-poc", (e) => {
        getClient().LoadNucleiTemplates({}, (err) => {
            if (err) {
                console.info(`update nuclei template failed: ${err}`)
            }
        })
    })
    ipcMain.handle("auto-update-yak-module", (e) => {
        let stream = getClient().AutoUpdateYakModule({})
        stream.on("data", (data) => {
            if (!win) {
                return
            }

            win.webContents.send("client-auto-update-yak-module-data", data)
        })
        stream.on("end", (data) => {
            if (!win) {
                return
            }

            win.webContents.send("client-auto-update-yak-module-end")
        })
        stream.on("error", (error) => {
            if (!win) {
                return
            }

            win.webContents.send("client-auto-update-yak-module-error", error?.details)
        })
    })

    const streamExecYakScriptMap = new Map()
    ipcMain.handle("cancel-exec-yak-script", async (e, token) => {
        const stream = streamExecYakScriptMap.get(token)
        console.info(`cancel exec yak script by token: ${token}`)
        stream && stream.cancel()
        streamExecYakScriptMap.delete(token)
    })
    ipcMain.handle("exec-yak-script", (e, params, token) => {
        let stream = getClient().ExecYakScript(params)
        streamExecYakScriptMap.set(token, stream)
        stream.on("data", (data) => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-data`, data)
        })
        stream.on("error", (error) => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-error`, error && error.details)
        })
        stream.on("end", () => {
            streamExecYakScriptMap.delete(token)
            if (!win) {
                return
            }
            win.webContents.send(`${token}-end`)
        })
    })

    ipcMain.handle("cancel-exec-batch-yak-script", async (e, token) => {
        const stream = streamExecYakScriptMap.get(token)
        console.info(`cancel exec batch yak script by token: ${token}`)
        stream && stream.cancel()
        streamExecYakScriptMap.delete(token)
    })

    ipcMain.handle("exec-batch-yak-script", async (e, params, token) => {
        let stream = getClient().ExecBatchYakScript(params)
        streamExecYakScriptMap.set(token, stream)
        stream.on("data", (data) => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-exec-batch-yak-script-data`, data)
        })
        stream.on("error", (error) => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-exec-batch-yak-script-error`, error && error.details)
        })
        stream.on("end", () => {
            streamExecYakScriptMap.delete(token)
            if (!win) {
                return
            }
            win.webContents.send(`${token}-exec-batch-yak-script-end`)
        })
    })

    /*
     * 这个接口用于控制批量执行 Yak 模块
     *    不仅可用在批量执行 nuclei 脚本，也可以用于批量执行 yak 脚本
     * */
    const streamExecBatchYakScriptMap = new Map()
    ipcMain.handle("cancel-ExecBatchYakScript", handlerHelper.cancelHandler(streamExecBatchYakScriptMap))
    ipcMain.handle("ExecBatchYakScript", (e, params, token) => {
        let stream = getClient().ExecBatchYakScript(params)
        handlerHelper.registerHandler(win, stream, streamExecBatchYakScriptMap, token)
    })

    // asyncGetExecBatchYakScriptUnfinishedTask wrapper
    const asyncGetExecBatchYakScriptUnfinishedTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetExecBatchYakScriptUnfinishedTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetExecBatchYakScriptUnfinishedTask", async (e, params) => {
        return await asyncGetExecBatchYakScriptUnfinishedTask(params)
    })

    // asyncGetExecBatchYakScriptUnfinishedTaskByUid wrapper
    const asyncGetExecBatchYakScriptUnfinishedTaskByUid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetExecBatchYakScriptUnfinishedTaskByUid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetExecBatchYakScriptUnfinishedTaskByUid", async (e, params) => {
        return await asyncGetExecBatchYakScriptUnfinishedTaskByUid(params)
    })


    // asyncPopExecBatchYakScriptUnfinishedTaskByUid wrapper
    const asyncPopExecBatchYakScriptUnfinishedTaskByUid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().PopExecBatchYakScriptUnfinishedTaskByUid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PopExecBatchYakScriptUnfinishedTaskByUid", async (e, params) => {
        return await asyncPopExecBatchYakScriptUnfinishedTaskByUid(params)
    })

    const streamRecoverExecBatchYakScriptUnfinishedTaskMap = new Map()
    ipcMain.handle(
        "cancel-RecoverExecBatchYakScriptUnfinishedTask",
        handlerHelper.cancelHandler(streamRecoverExecBatchYakScriptUnfinishedTaskMap)
    )
    ipcMain.handle("RecoverExecBatchYakScriptUnfinishedTask", (e, params, token) => {
        let stream = getClient().RecoverExecBatchYakScriptUnfinishedTask(params)
        handlerHelper.registerHandler(win, stream, streamRecoverExecBatchYakScriptUnfinishedTaskMap, token)
    })

    // 批量执行脚本的新接口：通过一个短 Filter 执行
    const streamExecutePacketYakScriptMap = new Map()
    ipcMain.handle("cancel-ExecutePacketYakScript", handlerHelper.cancelHandler(streamExecutePacketYakScriptMap))
    ipcMain.handle("ExecutePacketYakScript", (e, params, token) => {
        let stream = getClient().ExecutePacketYakScript(params)
        handlerHelper.registerHandler(win, stream, streamExecutePacketYakScriptMap, token)
    })

    // 新的扫描模式
    const streamExecPacketScanMap = new Map()
    ipcMain.handle("cancel-ExecPacketScan", handlerHelper.cancelHandler(streamExecPacketScanMap))
    ipcMain.handle("ExecPacketScan", (e, params, token) => {
        let stream = getClient().ExecPacketScan(params)
        handlerHelper.registerHandler(win, stream, streamExecPacketScanMap, token)
    })


    // 通用的漏洞检测技术方案
    const streamExecYakitPluginsByYakScriptFilterMap = new Map()
    ipcMain.handle(
        "cancel-ExecYakitPluginsByYakScriptFilter",
        handlerHelper.cancelHandler(streamExecYakitPluginsByYakScriptFilterMap)
    )
    ipcMain.handle("ExecYakitPluginsByYakScriptFilter", (e, params, token) => {
        let stream = getClient().ExecYakitPluginsByYakScriptFilter(params)
        handlerHelper.registerHandler(win, stream, streamExecYakitPluginsByYakScriptFilterMap, token)
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
}
