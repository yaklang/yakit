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

    const asyncUpdateSSARiskTags = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateSSARiskTags(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 审计漏洞状态更新
    ipcMain.handle("UpdateSSARiskTags", async (e, params) => {
        return await asyncUpdateSSARiskTags(params)
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
}