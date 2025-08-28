const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncGetGlobalNetworkConfig wrapper
    const asyncGetGlobalNetworkConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetGlobalNetworkConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetGlobalNetworkConfig", async (e, params) => {
        return await asyncGetGlobalNetworkConfig(params)
    })

    // asyncSetGlobalNetworkConfig wrapper
    const asyncSetGlobalNetworkConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetGlobalNetworkConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetGlobalNetworkConfig", async (e, params) => {
        return await asyncSetGlobalNetworkConfig(params)
    })

    // asyncValidP12PassWord wrapper
    const asyncValidP12PassWord = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ValidP12PassWord(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ValidP12PassWord", async (e, params) => {
        return await asyncValidP12PassWord(params)
    })

    // asyncResetGlobalNetworkConfig wrapper
    const asyncResetGlobalNetworkConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ResetGlobalNetworkConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ResetGlobalNetworkConfig", async (e, params) => {
        return await asyncResetGlobalNetworkConfig(params)
    })

    const asyncGetThirdPartyAppConfigTemplate = () => {
        return new Promise((resolve, reject) => {
            getClient().GetThirdPartyAppConfigTemplate({}, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetThirdPartyAppConfigTemplate", async (e) => {
        return await asyncGetThirdPartyAppConfigTemplate()
    })

    // AI相关
    const asyncCheckHahValidAiConfig = () => {
        return new Promise((resolve, reject) => {
            getClient().CheckHahValidAiConfig({}, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CheckHahValidAiConfig", async (e) => {
        return await asyncCheckHahValidAiConfig()
    })

    const asyncListAiModel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ListAiModel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ListAiModel", async (e, params) => {
        return await asyncListAiModel(params)
    })

    // 查询自定义代码片段
    const asyncQueryCustomCode = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryCustomCode(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryCustomCode", async (e, parmas) => {
        return await asyncQueryCustomCode(parmas)
    })

    // 增加自定义代码片段
    const asyncCreateCustomCode = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateCustomCode(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateCustomCode", async (_, parmas) => {
        return await asyncCreateCustomCode(parmas)
    })

    // 删除代码片段
    const asyncDeleteCustomCode = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteCustomCode(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteCustomCode", async (_, parmas) => {
        return await asyncDeleteCustomCode(parmas)
    })

    // 更新代码片段
    const asyncUpdateCustomCode = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateCustomCode(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateCustomCode", async (_, parmas) => {
        return await asyncUpdateCustomCode(parmas)
    })
}
