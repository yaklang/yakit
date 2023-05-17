const {ipcMain} = require("electron")


module.exports = {
    register: (win, getClient) => {
        // register

        // asyncRequireDNSLogDomain wrapper
        const asyncRequireDNSLogDomain = (params) => {
            return new Promise((resolve, reject) => {
                getClient().RequireDNSLogDomain(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("RequireDNSLogDomain", async (e, params) => {
            return await asyncRequireDNSLogDomain(params)
        })


        // asyncQueryDNSLogByToken wrapper
        const asyncQueryDNSLogByToken = (params) => {
            return new Promise((resolve, reject) => {
                getClient().QueryDNSLogByToken(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("QueryDNSLogByToken", async (e, params) => {
            return await asyncQueryDNSLogByToken(params)
        })

        // asyncRequireICMPRandomLength wrapper
        const asyncRequireICMPRandomLength = (params) => {
            return new Promise((resolve, reject) => {
                getClient().RequireICMPRandomLength(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("RequireICMPRandomLength", async (e, params) => {
            return await asyncRequireICMPRandomLength(params)
        })

        // asyncQueryICMPTrigger wrapper
        const asyncQueryICMPTrigger = (params) => {
            return new Promise((resolve, reject) => {
                getClient().QueryICMPTrigger(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("QueryICMPTrigger", async (e, params) => {
            return await asyncQueryICMPTrigger(params)
        })

        // asyncRequireRandomPortToken wrapper
        const asyncRequireRandomPortToken = (params) => {
            return new Promise((resolve, reject) => {
                getClient().RequireRandomPortToken(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("RequireRandomPortToken", async (e, params) => {
            return await asyncRequireRandomPortToken(params)
        })

        // asyncQueryRandomPortTrigger wrapper
        const asyncQueryRandomPortTrigger = (params) => {
            return new Promise((resolve, reject) => {
                getClient().QueryRandomPortTrigger(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("QueryRandomPortTrigger", async (e, params) => {
            return await asyncQueryRandomPortTrigger(params)
        })
    }
}