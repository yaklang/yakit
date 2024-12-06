const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // query local rule group list
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
    // 获取本地规则组数据
    ipcMain.handle("QuerySyntaxFlowRuleGroup", async (e, params) => {
        return await asyncQuerySyntaxFlowRuleGroup(params)
    })

    // create local rule group
    const asyncCreateSyntaxFlowRuleGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateSyntaxFlowRuleGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 创建本地规则组
    ipcMain.handle("CreateSyntaxFlowRuleGroup", async (e, params) => {
        return await asyncCreateSyntaxFlowRuleGroup(params)
    })

    // update local rule group
    const asyncUpdateSyntaxFlowRuleGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateSyntaxFlowRuleGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 更新本地规则组
    ipcMain.handle("UpdateSyntaxFlowRuleGroup", async (e, params) => {
        return await asyncUpdateSyntaxFlowRuleGroup(params)
    })

    // delete local rule group
    const asyncDeleteSyntaxFlowRuleGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSyntaxFlowRuleGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除本地规则组
    ipcMain.handle("DeleteSyntaxFlowRuleGroup", async (e, params) => {
        return await asyncDeleteSyntaxFlowRuleGroup(params)
    })

    // query rule list
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
    // 获取规则列表
    ipcMain.handle("QuerySyntaxFlowRule", async (e, params) => {
        return await asyncQuerySyntaxFlowRule(params)
    })

    // create rule
    const asyncCreateSyntaxFlowRuleEx = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateSyntaxFlowRuleEx(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 创建规则
    ipcMain.handle("CreateSyntaxFlowRuleEx", async (e, params) => {
        return await asyncCreateSyntaxFlowRuleEx(params)
    })

    // update rule
    const asyncUpdateSyntaxFlowRuleEx = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateSyntaxFlowRuleEx(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 更新规则
    ipcMain.handle("UpdateSyntaxFlowRuleEx", async (e, params) => {
        return await asyncUpdateSyntaxFlowRuleEx(params)
    })

    // delete rule
    const asyncDeleteSyntaxFlowRule = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSyntaxFlowRule(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除规则
    ipcMain.handle("DeleteSyntaxFlowRule", async (e, params) => {
        return await asyncDeleteSyntaxFlowRule(params)
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
}
