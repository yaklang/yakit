const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    const asyncGetGlobalProxyRulesConfig = () => {
        return new Promise((resolve, reject) => {
            getClient().GetGlobalProxyRulesConfig({}, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("GetGlobalProxyRulesConfig", async () => {
        return await asyncGetGlobalProxyRulesConfig()
    })

    const asyncSetGlobalProxyRulesConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetGlobalProxyRulesConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("SetGlobalProxyRulesConfig", async (e, params) => {
        const request = params && params.Config ? params : {Config: params}
        return await asyncSetGlobalProxyRulesConfig(request)
    })
}
