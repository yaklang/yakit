const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    const asyncQuerySyntaxFlowRuleGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySyntaxFlowRuleGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 获取规则组数据
    ipcMain.handle("QuerySyntaxFlowRuleGroup", async (e, params) => {
        return await asyncQuerySyntaxFlowRuleGroup(params)
    })

    const asyncQuerySyntaxFlowRule = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySyntaxFlowRule(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 获取规则组所含规则
    ipcMain.handle("QuerySyntaxFlowRule", async (e, params) => {
        return await asyncQuerySyntaxFlowRule(params)
    })

    // 规则执行
    const handlerHelper = require("./handleStreamWithContext")
    const streamSyntaxFlowScanMap = new Map()
    ipcMain.handle("cancel-SyntaxFlowScan", handlerHelper.cancelHandler(streamSyntaxFlowScanMap))
    ipcMain.handle("SyntaxFlowScan", (e, params, token) => {
        let stream = streamSyntaxFlowScanMap.get(token)
        if (stream) {
            stream.write(params)
            return
        }
        stream = getClient().SyntaxFlowScan()
        stream.write(params)
        handlerHelper.registerHandler(win, stream, streamSyntaxFlowScanMap, token)
    })

    // 规则执行-任务列表
    const asyncQuerySyntaxFlowScanTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySyntaxFlowScanTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QuerySyntaxFlowScanTask", async (e, params) => {
        return await asyncQuerySyntaxFlowScanTask(params)
    })

    // 规则执行-任务列表/删除
    const asyncDeleteSyntaxFlowScanTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSyntaxFlowScanTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteSyntaxFlowScanTask", async (e, params) => {
        return await asyncDeleteSyntaxFlowScanTask(params)
    })

    const asyncQuerySyntaxFlowResult = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySyntaxFlowResult(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 获取审计结果
    ipcMain.handle("QuerySyntaxFlowResult", async (e, params) => {
        return await asyncQuerySyntaxFlowResult(params)
    })

    const asyncDeleteSyntaxFlowResult = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSyntaxFlowResult(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除审计结果
    ipcMain.handle("DeleteSyntaxFlowResult", async (e, params) => {
        return await asyncDeleteSyntaxFlowResult(params)
    })

    const asyncQuerySSAPrograms = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySSAPrograms(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 获取项目管理列表
    ipcMain.handle("QuerySSAPrograms", async (e, params) => {
        return await asyncQuerySSAPrograms(params)
    })

    const asyncUpdateSSAProgram = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateSSAProgram(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 更新项目管理数据
    ipcMain.handle("UpdateSSAProgram", async (e, params) => {
        return await asyncUpdateSSAProgram(params)
    })

    const asyncDeleteSSAPrograms = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSSAPrograms(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除项目管理数据
    ipcMain.handle("DeleteSSAPrograms", async (e, params) => {
        return await asyncDeleteSSAPrograms(params)
    })
}
