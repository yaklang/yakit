const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncQueryPorts wrapper
    const asyncQueryPorts = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPorts(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryPorts", async (e, params) => {
        return await asyncQueryPorts(params)
    })

    // asyncDeletePorts wrapper
    const asyncDeletePorts = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePorts(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePorts", async (e, params) => {
        return await asyncDeletePorts(params)
    })

    // asyncGenerateWebsiteTree wrapper
    const asyncGenerateWebsiteTree = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateWebsiteTree(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateWebsiteTree", async (e, params) => {
        return await asyncGenerateWebsiteTree(params)
    })

    // asyncQueryDomains wrapper
    const asyncQueryDomains = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryDomains(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryDomains", async (e, params) => {
        return await asyncQueryDomains(params)
    })

    // asyncQueryDomains wrapper
    const asyncDeleteDomains = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteDomains(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteDomains", async (e, params) => {
        return await asyncDeleteDomains(params)
    })

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

    // asyncDeleteHistoryHTTPFuzzerTask wrapper
    const asyncDeleteHistoryHTTPFuzzerTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteHistoryHTTPFuzzerTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteHistoryHTTPFuzzerTask", async (e, params) => {
        return await asyncDeleteHistoryHTTPFuzzerTask(params)
    })

    // asyncQueryReports wrapper
    const asyncQueryReports = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryReports(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryReports", async (e, params) => {
        return await asyncQueryReports(params)
    })

    // asyncQueryReport wrapper
    const asyncQueryReport = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryReport(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryReport", async (e, params) => {
        return await asyncQueryReport(params)
    })

    // asyncDeleteReport wrapper
    const asyncDeleteReport = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteReport(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteReport", async (e, params) => {
        return await asyncDeleteReport(params)
    })

    // asyncQueryAvailableReportFrom wrapper
    const asyncQueryAvailableReportFrom = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAvailableReportFrom(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAvailableReportFrom", async (e, params) => {
        return await asyncQueryAvailableReportFrom(params)
    })
}
