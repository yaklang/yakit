const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncQueryYakScript wrapper
    const asyncQueryYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryYakScript", async (e, params) => {
        return await asyncQueryYakScript(params)
    })

    // asyncSaveYakScript wrapper
    const asyncSaveYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveYakScript", async (e, params) => {
        return await asyncSaveYakScript(params)
    })


    ipcMain.handle("delete-yak-script", (e, Id) => {
        getClient().DeleteYakScript({Id}, (err, _) => {
            err && console.info(err)
        })
    })

    const asyncDeleteYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("DeleteYakScript", async (e, params) => {
        return await asyncDeleteYakScript(params)
    })

    // asyncGetYakScriptById wrapper
    const asyncGetYakScriptById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetYakScriptById", async (e, params) => {
        return await asyncGetYakScriptById(params)
    })

    // asyncGetYakScriptByName wrapper
    const asyncGetYakScriptByName = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptByName(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetYakScriptByName", async (e, params) => {
        return await asyncGetYakScriptByName(params)
    })

    const asyncGetYakScriptByOnlineID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptByOnlineID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //通过OnlineID 查询本地插件数据
    ipcMain.handle("GetYakScriptByOnlineID", async (e, params) => {
        return await asyncGetYakScriptByOnlineID(params)
    })

    // asyncIgnoreYakScript wrapper
    const asyncIgnoreYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IgnoreYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IgnoreYakScript", async (e, params) => {
        return await asyncIgnoreYakScript(params)
    })

    // asyncUnIgnoreYakScript wrapper
    const asyncUnIgnoreYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UnIgnoreYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UnIgnoreYakScript", async (e, params) => {
        return await asyncUnIgnoreYakScript(params)
    })

    // asyncExportYakScript wrapper
    const asyncExportYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExportYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExportYakScript", async (e, params) => {
        return await asyncExportYakScript(params)
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
    //删除本地插件,带条件
    ipcMain.handle("GetYakScriptTags", async (e, params) => {
        return await asyncGetYakScriptTags(params)
    })

    const asyncQueryYakScriptLocalAndUser = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptLocalAndUser(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //通过OnlineBaseUrl与UserId 获取所有可上传插件
    ipcMain.handle("QueryYakScriptLocalAndUser", async (e, params) => {
        return await asyncQueryYakScriptLocalAndUser(params)
    })


    const asyncQueryYakScriptByOnlineGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptByOnlineGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //通过OnlineGroup查询
    ipcMain.handle("QueryYakScriptByOnlineGroup", async (e, params) => {
        return await asyncQueryYakScriptByOnlineGroup(params)
    })

    const asyncQueryYakScriptLocalAll = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptLocalAll(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //企业版管理员获取所有可上传插件
    ipcMain.handle("QueryYakScriptLocalAll", async (e, params) => {
        return await asyncQueryYakScriptLocalAll(params)
    })

    // asyncQueryYakScriptExecResult wrapper
    const asyncQueryYakScriptExecResult = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptExecResult(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryYakScriptExecResult", async (e, params) => {
        return await asyncQueryYakScriptExecResult(params)
    })

    // asyncQueryYakScriptNameInExecResult wrapper
    const asyncQueryYakScriptNameInExecResult = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptNameInExecResult(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryYakScriptNameInExecResult", async (e, params) => {
        return await asyncQueryYakScriptNameInExecResult(params)
    })

    // asyncDeleteYakScriptExecResult wrapper
    const asyncDeleteYakScriptExecResult = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteYakScriptExecResult(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteYakScriptExecResult", async (e, params) => {
        return await asyncDeleteYakScriptExecResult(params)
    })

    const asyncDeleteYakScriptExec = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteYakScriptExec(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteYakScriptExec", async (e, params) => {
        return await asyncDeleteYakScriptExec(params)
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