const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext")

module.exports = (win, getClient) => {
    const asyncQuerySSARisks = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySSARisks(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 审计漏洞数据获取
    ipcMain.handle("QuerySSARisks", async (e, params) => {
        return await asyncQuerySSARisks(params)
    })

    const asyncDeleteSSARisks = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSSARisks(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 审计漏洞数据删除
    ipcMain.handle("DeleteSSARisks", async (e, params) => {
        return await asyncDeleteSSARisks(params)
    })

    const asyncCreateSSARiskDisposals = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateSSARiskDisposals(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 新建审计漏洞处置状态
    ipcMain.handle("CreateSSARiskDisposals", async (e, params) => {
        return await asyncCreateSSARiskDisposals(params)
    })

    const asyncGetSSARiskDisposal = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSSARiskDisposal(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("GetSSARiskDisposal", async (e, params) => {
        return await asyncGetSSARiskDisposal(params)
    })

    const asyncDeleteSSARiskDisposals = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSSARiskDisposals(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    // 删除审计漏洞处置
    ipcMain.handle("DeleteSSARiskDisposals", async (e, params) => {
        return await asyncDeleteSSARiskDisposals(params)
    })

    const asyncGetSSARiskFieldGroupEx = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSSARiskFieldGroupEx(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    // 审计漏洞FieldGroup左边详情获取
    ipcMain.handle("GetSSARiskFieldGroupEx", async (e, params) => {
        return await asyncGetSSARiskFieldGroupEx(params)
    })

    const asyncNewSSARiskRead = (params) => {
        return new Promise((resolve, reject) => {
            getClient().NewSSARiskRead(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 审计漏洞已读
    ipcMain.handle("NewSSARiskRead", async (e, params) => {
        return await asyncNewSSARiskRead(params)
    })

    const asyncGroupTableColumn = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GroupTableColumn(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    // 审计漏洞类型
    ipcMain.handle("GroupTableColumn", async (e, params) => {
        return await asyncGroupTableColumn(params)
    })

    // 审计漏洞误报反馈
    const asyncSSARiskFeedbackToOnline = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SSARiskFeedbackToOnline(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SSARiskFeedbackToOnline", async (e, params) => {
        return await asyncSSARiskFeedbackToOnline(params)
    })

    const asyncQueryNewSSARisks = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryNewSSARisks(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryNewSSARisks", async (e, params) => {
        return await asyncQueryNewSSARisks(params)
    })

    // 导出SSA风险数据 - 需要转换字段名 Process -> Percent 以兼容 ImportExportProgress 组件
    const streamExportSSARiskMap = new Map()
    ipcMain.handle("cancel-ExportSSARisk", handlerHelper.cancelHandler(streamExportSSARiskMap))
    ipcMain.handle("ExportSSARisk", (e, params, token) => {
        let stream = getClient().ExportSSARisk(params)
        streamExportSSARiskMap.set(token, stream)
        stream.on("data", (data) => {
            if (win) {
                // 转换字段名: Process -> Percent
                win.webContents.send(`${token}-data`, {
                    Percent: data.Process,
                    Verbose: data.Verbose,
                    ExportFilePath: data.ExportFilePath
                })
            }
        })
        stream.on("error", (error) => {
            if (win) {
                win.webContents.send(`${token}-error`, error?.details || error)
            }
        })
        stream.on("end", () => {
            streamExportSSARiskMap.delete(token)
            if (win) {
                win.webContents.send(`${token}-end`)
            }
        })
    })

    // 导入SSA风险数据 - 需要转换字段名 Process -> Percent 以兼容 ImportExportProgress 组件
    const streamImportSSARiskMap = new Map()
    ipcMain.handle("cancel-ImportSSARisk", handlerHelper.cancelHandler(streamImportSSARiskMap))
    ipcMain.handle("ImportSSARisk", (e, params, token) => {
        let stream = getClient().ImportSSARisk(params)
        streamImportSSARiskMap.set(token, stream)
        stream.on("data", (data) => {
            if (win) {
                // 转换字段名: Process -> Percent
                win.webContents.send(`${token}-data`, {
                    Percent: data.Process,
                    Verbose: data.Verbose
                })
            }
        })
        stream.on("error", (error) => {
            if (win) {
                win.webContents.send(`${token}-error`, error?.details || error)
            }
        })
        stream.on("end", () => {
            streamImportSSARiskMap.delete(token)
            if (win) {
                win.webContents.send(`${token}-end`)
            }
        })
    })
}
