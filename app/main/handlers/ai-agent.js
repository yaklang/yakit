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
    // 查询 AI-Forge
    ipcMain.handle("QueryAIForge", async (e, params) => {
        return await asyncQueryAIForge(params)
    })
    // #endregion

    // #region AI-Triage
    let aiChatTriagePool = new Map()
    // 开始执行 AI Triage
    ipcMain.handle("start-ai-triage", async (e, token, params) => {
        let stream = getClient().StartAITriage()
        handlerHelper.registerHandler(win, stream, aiChatTriagePool, token)
        try {
            const request = JSON.parse(JSON.stringify(params))
            const qs = request?.Params?.UserQuery
            if (request && request.Params && request.Params.UserQuery) {
                request.Params.UserQuery = ""
            }
            stream.write({...params})
            stream.write({IsFreeInput: true, FreeInput: qs})
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

    /**获取工具列表 */
    ipcMain.handle("ToggleAIToolFavorite", async (e, param) => {
        return await asyncToggleAIToolFavorite(param)
    })
    //#endregion
}
