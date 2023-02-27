const {ipcMain} = require("electron")
const {USER_INFO} = require("../state")
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
                if (params.OnlineID&&params.UUID) win.webContents.send("ref-plugin-operator", {pluginOnlineId: params.OnlineID,pluginUUID:params.UUID})
                resolve(data)
            })
        })
    }
    // 下载插件
    ipcMain.handle("DownloadOnlinePluginById", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginById(params)
    })
    const asyncDownloadOnlinePluginByIds = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginByIds(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 下载插件
    ipcMain.handle("DownloadOnlinePluginByIds", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginByIds(params)
    })
    // 全部添加
    const streamDownloadOnlinePluginAll = new Map()
    ipcMain.handle("cancel-DownloadOnlinePluginAll", handlerHelper.cancelHandler(streamDownloadOnlinePluginAll))
    ipcMain.handle("DownloadOnlinePluginAll", (e, params, token) => {
        // params传Token，登录时调用：添加该用户名下的所有插件；不传Token：添加所有的
        const newParams = {
            ...params
        }
        if (params.isAddToken) {
            newParams.Token = USER_INFO.token
        }
        delete newParams.isAddToken
        let stream = getClient().DownloadOnlinePluginAll(newParams)
        handlerHelper.registerHandler(win, stream, streamDownloadOnlinePluginAll, token)
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

    // 参数携带
    ipcMain.on("yakit-store-params", (event, arg) => {
        win.webContents.send("get-yakit-store-params", arg)
    })
}
