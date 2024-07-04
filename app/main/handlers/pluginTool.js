const { ipcMain } = require("electron")
const { USER_INFO } = require("../state")
const handlerHelper = require("./handleStreamWithContext")

module.exports = (win, getClient) => {
    const asyncSetOnlineProfile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetOnlineProfile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 设置私有域
    ipcMain.handle("SetOnlineProfile", async (e, params) => {
        return await asyncSetOnlineProfile(params)
    })
    const asyncGetOnlineProfile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetOnlineProfile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 获取私有域
    ipcMain.handle("GetOnlineProfile", async (e, params) => {
        return await asyncGetOnlineProfile(params)
    })
    const asyncDownloadOnlinePluginById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                if (params.OnlineID && params.UUID) win.webContents.send("ref-plugin-operator", { pluginOnlineId: params.OnlineID, pluginUUID: params.UUID })
                resolve(data)
            })
        })
    }
    // 下载插件
    ipcMain.handle("DownloadOnlinePluginById", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginById(params)
    })

    const asyncDownloadOnlinePluginBatch = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginBatch(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 新版-下载插件
    ipcMain.handle("DownloadOnlinePluginBatch", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginBatch(params)
    })

    // 新版-下载所有插件 全部添加
    const streamDownloadOnlinePluginsAll = new Map()
    ipcMain.handle("cancel-DownloadOnlinePlugins", handlerHelper.cancelHandler(streamDownloadOnlinePluginsAll))
    ipcMain.handle("DownloadOnlinePlugins", async (e, params, token) => {
        params.Token = USER_INFO.token
        let stream = getClient().DownloadOnlinePlugins(params)
        handlerHelper.registerHandler(win, stream, streamDownloadOnlinePluginsAll, token)
    })

    const asyncDownloadOnlinePluginByPluginName = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginByPluginName(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 新版-根据插件名称下载插件
    ipcMain.handle("DownloadOnlinePluginByPluginName", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginByPluginName(params)
    })

    const asyncDeletePluginByUserID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePluginByUserID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除插件
    ipcMain.handle("DeletePluginByUserID", async (e, params) => {
        return await asyncDeletePluginByUserID(params)
    })
    const asyncDeleteAllLocalPlugins = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAllLocalPlugins(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除本地插件 暂时废弃
    ipcMain.handle("DeleteAllLocalPlugins", async (e, params) => {
        return await asyncDeleteAllLocalPlugins(params)
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

    const asyncGetYakScriptTagsAndType = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptTagsAndType(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 统计
    ipcMain.handle("GetYakScriptTagsAndType", async (e, params) => {
        return await asyncGetYakScriptTagsAndType(params)
    })


    const asyncDeleteLocalPluginsByWhere = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteLocalPluginsByWhere(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除本地插件,带条件
    ipcMain.handle("DeleteLocalPluginsByWhere", async (e, params) => {
        return await asyncDeleteLocalPluginsByWhere(params)
    })

    const asyncQueryYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 获取插件组数据
    ipcMain.handle("QueryYakScriptGroup", async (e, params) => {
        return await asyncQueryYakScriptGroup(params)
    })

    const asyncRenameYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RenameYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 插件组名字修改
    ipcMain.handle("RenameYakScriptGroup", async (e, params) => {
        return await asyncRenameYakScriptGroup(params)
    })

    const asyncDeleteYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 插件组删除
    ipcMain.handle("DeleteYakScriptGroup", async (e, params) => {
        return await asyncDeleteYakScriptGroup(params)
    })

    const asyncSetGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 插件组新增
    ipcMain.handle("SetGroup", async (e, params) => {
        return await asyncSetGroup(params)
    })

    const asyncGetYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 获取插件所在插件组和其他插件组
    ipcMain.handle("GetYakScriptGroup", async (e, params) => {
        return await asyncGetYakScriptGroup(params)
    })

    const asyncSaveYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 更新插件所在组&新增插件组
    ipcMain.handle("SaveYakScriptGroup", async (e, params) => {
        return await asyncSaveYakScriptGroup(params)
    })

    const asyncResetYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ResetYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 重置插件组为线上插件组
    ipcMain.handle("ResetYakScriptGroup", async (e, params) => {
        return await asyncResetYakScriptGroup(params)
    })
}
