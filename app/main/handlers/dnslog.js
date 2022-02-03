const {ipcMain} = require("electron")

module.exports = {
    register: (win, getClient) => {
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
    }
}