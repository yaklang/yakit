const {ipcMain} = require("electron")
const fs = require("fs")
const path = require("path")
const {yakProjects} = require("../filePath")

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

    // update local rule to group
    const asyncUpdateSyntaxFlowRuleAndGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateSyntaxFlowRuleAndGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 更新规则的所属组
    ipcMain.handle("UpdateSyntaxFlowRuleAndGroup", async (e, params) => {
        return await asyncUpdateSyntaxFlowRuleAndGroup(params)
    })

    // query rule for same group
    const asyncQuerySyntaxFlowSameGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySyntaxFlowSameGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 查询规则集合的组交集
    ipcMain.handle("QuerySyntaxFlowSameGroup", async (e, params) => {
        return await asyncQuerySyntaxFlowSameGroup(params)
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

    // 导出SyntaxFlow规则
    const exportSyntaxFlowsMap = new Map()
    ipcMain.handle("cancel-ExportSyntaxFlows", handlerHelper.cancelHandler(exportSyntaxFlowsMap))
    ipcMain.handle("ExportSyntaxFlows", (_, params, token) => {
        const {TargetPath} = params
        if (!fs.existsSync(yakProjects)) {
            try {
                fs.mkdirSync(yakProjects, {recursive: true})
            } catch (error) {}
        }
        params.TargetPath = path.join(yakProjects, TargetPath)
        let stream = getClient().ExportSyntaxFlows(params)
        handlerHelper.registerHandler(win, stream, exportSyntaxFlowsMap, token)
    })

    // 导入SyntaxFlow规则
    const importSyntaxFlowsMap = new Map()
    ipcMain.handle("cancel-ImportSyntaxFlows", handlerHelper.cancelHandler(importSyntaxFlowsMap))
    ipcMain.handle("ImportSyntaxFlows", (_, params, token) => {
        let stream = getClient().ImportSyntaxFlows(params)
        handlerHelper.registerHandler(win, stream, importSyntaxFlowsMap, token)
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

    // 生成 yakit-projects 文件夹下 projects 里面的文件路径
    ipcMain.handle("GenerateProjectsFilePath", async (e, fileName) => {
        return path.join(yakProjects, fileName)
    })
}
