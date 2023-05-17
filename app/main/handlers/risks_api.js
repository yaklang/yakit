const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncQueryRisks wrapper
    const asyncQueryRisks = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryRisks(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryRisks", async (e, params) => {
        return await asyncQueryRisks(params)
    })

    // asyncQueryRisk wrapper
    const asyncQueryRisk = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryRisk(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryRisk", async (e, params) => {
        return await asyncQueryRisk(params)
    })

    // asyncDeleteRisk wrapper
    const asyncDeleteRisk = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteRisk(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteRisk", async (e, params) => {
        return await asyncDeleteRisk(params)
    })

    // asyncQueryAvailableRiskType wrapper
    const asyncQueryAvailableRiskType = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAvailableRiskType(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAvailableRiskType", async (e, params) => {
        return await asyncQueryAvailableRiskType(params)
    })

    // asyncQueryAvailableRiskLevel wrapper
    const asyncQueryAvailableRiskLevel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAvailableRiskLevel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAvailableRiskLevel", async (e, params) => {
        return await asyncQueryAvailableRiskLevel(params)
    })

    // asyncQueryRiskTableStats wrapper
    const asyncQueryRiskTableStats = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryRiskTableStats(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryRiskTableStats", async (e, params) => {
        return await asyncQueryRiskTableStats(params)
    })

    // asyncResetRiskTableStats wrapper
    const asyncResetRiskTableStats = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ResetRiskTableStats(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ResetRiskTableStats", async (e, params) => {
        return await asyncResetRiskTableStats(params)
    })

    /** 获取最新的风险与漏洞数据 */
    const asyncFetchLatestRisk = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryNewRisk(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("fetch-latest-risk-info", async (e, params) => {
        return await asyncFetchLatestRisk(params)
    })

    // NewRiskRead
    const asyncSetRiskInfoRead = (params) => {
        return new Promise((resolve, reject) => {
            getClient().NewRiskRead(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    /** 将单条/全部风险未读数据设置为已读 */
    ipcMain.handle("set-risk-info-read", async (e, params) => {
        return await asyncSetRiskInfoRead(params)
    })

    const asyncUploadRiskToOnline= (params) => {
        return new Promise((resolve, reject) => {
            getClient().UploadRiskToOnline(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    /** 同步数据 */
    ipcMain.handle("upload-risk-to-online", async (e, params) => {
        return await asyncUploadRiskToOnline(params)
    })

}

