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

    const asyncGetAIGlobalConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAIGlobalConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAIGlobalConfig", async (e, params) => {
        return await asyncGetAIGlobalConfig(params)
    })

    const asyncSetAIGlobalConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetAIGlobalConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetAIGlobalConfig", async (e, params) => {
        return await asyncSetAIGlobalConfig(params)
    })

    const asyncListAIProviders = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ListAIProviders(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ListAIProviders", async (e, params) => {
        return await asyncListAIProviders(params)
    })

    const asyncAIConfigHealthCheck = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AIConfigHealthCheck(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AIConfigHealthCheck", async (e, params) => {
        return await asyncAIConfigHealthCheck(params)
    })
    
    const asyncQueryAIProvider = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAIProvider(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAIProvider", async (e, params) => {
        return await asyncQueryAIProvider(params)
    })

    const asyncUpsertAIProvider = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpsertAIProvider(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpsertAIProvider", async (e, params) => {
        return await asyncUpsertAIProvider(params)
    })

    const asyncDeleteAIProvider = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAIProvider(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteAIProvider", async (e, params) => {
        return await asyncDeleteAIProvider(params)
    })

    const asyncGetAIThirdPartyAppConfigTemplate = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAIThirdPartyAppConfigTemplate(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAIThirdPartyAppConfigTemplate", async (e, params) => {
        return await asyncGetAIThirdPartyAppConfigTemplate(params)
    })
    

    // 查询自定义代码片段
    const asyncQuerySnippets = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySnippets(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QuerySnippets", async (e, parmas) => {
        return await asyncQuerySnippets(parmas)
    })

    // 增加自定义代码片段
    const asyncCreateSnippet = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateSnippet(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateSnippet", async (_, parmas) => {
        return await asyncCreateSnippet(parmas)
    })

    // 删除代码片段
    const asyncDeleteSnippets = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSnippets(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteSnippets", async (_, parmas) => {
        return await asyncDeleteSnippets(parmas)
    })

    // 更新代码片段
    const asyncUpdateSnippet = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateSnippet(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateSnippet", async (_, parmas) => {
        return await asyncUpdateSnippet(parmas)
    })
}
