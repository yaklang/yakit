const {ipcMain} = require("electron")
module.exports = (win, getClient) => {
    const asyncQuerySSARisks = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySSARisks(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 审计漏洞数据获取
    ipcMain.handle("QuerySSARisks", async (e, params) => {
        return await asyncQuerySSARisks(params)
    })

    const asyncDeleteSSARisks = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSSARisks(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 审计漏洞数据删除
    ipcMain.handle("DeleteSSARisks", async (e, params) => {
        return await asyncDeleteSSARisks(params)
    })

    const asyncCreateSSARiskDisposals = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateSSARiskDisposals(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 新建审计漏洞处置状态
    ipcMain.handle("CreateSSARiskDisposals", async (e, params) => {
        return await asyncCreateSSARiskDisposals(params)
    })

    const asyncGetSSARiskDisposal = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSSARiskDisposal(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("GetSSARiskDisposal", async (e, params) => {
        return await asyncGetSSARiskDisposal(params)
    })

    const asyncDeleteSSARiskDisposals = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSSARiskDisposals(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    // 删除审计漏洞处置
    ipcMain.handle("DeleteSSARiskDisposals", async (e, params) => {
        return await asyncDeleteSSARiskDisposals(params)
    })

    const asyncGetSSARiskFieldGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSSARiskFieldGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 审计漏洞FieldGroup左边详情获取
    ipcMain.handle("GetSSARiskFieldGroup", async (e, params) => {
        return await asyncGetSSARiskFieldGroup(params)
    })

    const asyncNewSSARiskRead = (params) => {
        return new Promise((resolve, reject) => {
            getClient().NewSSARiskRead(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 审计漏洞已读
    ipcMain.handle("NewSSARiskRead", async (e, params) => {
        return await asyncNewSSARiskRead(params)
    })

    const asyncGroupTableColumn = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GroupTableColumn(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    // 审计漏洞类型
    ipcMain.handle("GroupTableColumn", async (e, params) => {
        return await asyncGroupTableColumn(params)
    })

    // 审计漏洞误报反馈
    const asyncSSARiskFeedbackToOnline = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SSARiskFeedbackToOnline(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SSARiskFeedbackToOnline", async (e, params) => {
        return await asyncSSARiskFeedbackToOnline(params)
    })

    const asyncQueryNewSSARisks = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryNewSSARisks(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryNewSSARisks", async (e, params) => {
        return await asyncQueryNewSSARisks(params)
    })
}
