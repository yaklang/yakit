const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext")

module.exports = (win, getClient) => {
    // #region AI-Task
    let aiChatTaskPool = new Map()
    // 开始执行 AI Task
    ipcMain.handle("start-ai-task", async (e, token, params) => {
        let stream = getClient().StartAITask()
        handlerHelper.registerHandler(win, stream, aiChatTaskPool, token)
        try {
            stream.write({...params})
        } catch (error) {
            throw new Error(error)
        }
    })
    // 发送信息给 AI Task
    ipcMain.handle("send-ai-task", async (e, token, params) => {
        const currentStream = aiChatTaskPool.get(token)
        if (!currentStream) {
            return Promise.reject("stream no exist")
        }
        try {
            currentStream.write({...params})
        } catch (error) {
            throw new Error(error)
        }
    })
    // 取消 AI Agent 聊天
    ipcMain.handle("cancel-ai-task", handlerHelper.cancelHandler(aiChatTaskPool))
    // #endregion

    // #region AI-ReAct
    let aiReActTaskPool = new Map()
    // 开始执行 AI ReAct
    ipcMain.handle("start-ai-re-act", async (e, token, params) => {
        let stream = getClient().StartAIReAct()
        handlerHelper.registerHandler(win, stream, aiReActTaskPool, token)
        try {
            stream.write({...params})
            const qs = params?.Params?.UserQuery
            if (!!qs) {
                stream.write({IsFreeInput: true, FreeInput: qs, AttachedFilePath: params?.AttachedFilePath})
            }
        } catch (error) {
            throw new Error(error)
        }
    })
    // 发送信息给 AI ReAct
    ipcMain.handle("send-ai-re-act", async (e, token, params) => {
        const currentStream = aiReActTaskPool.get(token)
        if (!currentStream) {
            return Promise.reject("stream no exist")
        }
        try {
            currentStream.write({...params})
        } catch (error) {
            throw new Error(error)
        }
    })
    // 取消 AI ReAct
    ipcMain.handle("cancel-ai-re-act", handlerHelper.cancelHandler(aiReActTaskPool))
    // #endregion

    // #region AI-Forge
    const asyncCreateAIForge = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateAIForge(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 创建 AI-Forge
    ipcMain.handle("CreateAIForge", async (e, params) => {
        return await asyncCreateAIForge(params)
    })

    const asyncUpdateAIForge = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateAIForge(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 编辑 AI-Forge
    ipcMain.handle("UpdateAIForge", async (e, params) => {
        return await asyncUpdateAIForge(params)
    })

    const asyncDeleteAIForge = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAIForge(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除 AI-Forge
    ipcMain.handle("DeleteAIForge", async (e, params) => {
        return await asyncDeleteAIForge(params)
    })

    const asyncQueryAIEvent = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAIEvent(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 查询QueryAIEvent
    ipcMain.handle("QueryAIEvent", async (e, params) => {
        return await asyncQueryAIEvent(params)
    })

    const asyncQueryAIForge = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAIForge(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 查询 AI-Forge 列表
    ipcMain.handle("QueryAIForge", async (e, params) => {
        return await asyncQueryAIForge(params)
    })

    const asyncGetAIForge = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAIForge(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 查询 AI-Forge 单个详情
    ipcMain.handle("GetAIForge", async (e, params) => {
        return await asyncGetAIForge(params)
    })
    // #endregion

    // #region AI-Triage
    let aiChatTriagePool = new Map()
    // 开始执行 AI Triage
    ipcMain.handle("start-ai-triage", async (e, token, params) => {
        let stream = getClient().StartAITriage()
        handlerHelper.registerHandler(win, stream, aiChatTriagePool, token)
        try {
            stream.write({...params})
            const qs = params?.Params?.UserQuery
            if (!!qs) stream.write({IsFreeInput: true, FreeInput: qs})
        } catch (error) {
            throw new Error(error)
        }
    })
    // 发送信息给 AI Triage
    ipcMain.handle("send-ai-triage", async (e, token, params) => {
        const currentStream = aiChatTriagePool.get(token)
        if (!currentStream) {
            return Promise.reject("stream no exist")
        }
        try {
            currentStream.write({...params})
        } catch (error) {
            throw new Error(error)
        }
    })
    // 取消 AI Triage
    ipcMain.handle("cancel-ai-triage", handlerHelper.cancelHandler(aiChatTriagePool))
    // #endregion

    //#region ai tool
    const asyncGetAIToolList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAIToolList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    /**获取工具列表 */
    ipcMain.handle("GetAIToolList", async (e, param) => {
        return await asyncGetAIToolList(param)
    })

    const asyncDeleteAITool = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAITool(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    /**获取工具列表 */
    ipcMain.handle("DeleteAITool", async (e, param) => {
        return await asyncDeleteAITool(param)
    })

    const asyncSaveAIToolV2 = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveAIToolV2(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    /**新增工具 */
    ipcMain.handle("SaveAIToolV2", async (e, param) => {
        return await asyncSaveAIToolV2(param)
    })

    const asyncUpdateAITool = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateAITool(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    /**新增工具 */
    ipcMain.handle("UpdateAITool", async (e, param) => {
        return await asyncUpdateAITool(param)
    })


    const asyncToggleAIToolFavorite = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ToggleAIToolFavorite(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    /**收藏 */
    ipcMain.handle("ToggleAIToolFavorite", async (e, param) => {
        return await asyncToggleAIToolFavorite(param)
    })

    const asyncAIToolGenerateMetadata = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AIToolGenerateMetadata(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AIToolGenerateMetadata", async (e, param) => {
        return await asyncAIToolGenerateMetadata(param)
    })
    //#endregion

    //#region ai 首页
    const asyncGetRandomAIMaterials = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetRandomAIMaterials(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 获取首页随机列表数据
    ipcMain.handle("GetRandomAIMaterials", async (e, params) => {
        return await asyncGetRandomAIMaterials(params)
    })
    // #endregion
}
