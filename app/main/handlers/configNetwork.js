const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncGetGlobalNetworkConfig wrapper
    const asyncGetGlobalNetworkConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetGlobalNetworkConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetGlobalNetworkConfig", async (e, params) => {
        return await asyncGetGlobalNetworkConfig(params)
    })

    // asyncSetGlobalNetworkConfig wrapper
    const asyncSetGlobalNetworkConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetGlobalNetworkConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetGlobalNetworkConfig", async (e, params) => {
        return await asyncSetGlobalNetworkConfig(params)
    })

    // asyncValidP12PassWord wrapper
    const asyncValidP12PassWord = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ValidP12PassWord(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ValidP12PassWord", async (e, params) => {
        return await asyncValidP12PassWord(params)
    })

    // asyncResetGlobalNetworkConfig wrapper
    const asyncResetGlobalNetworkConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ResetGlobalNetworkConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ResetGlobalNetworkConfig", async (e, params) => {
        return await asyncResetGlobalNetworkConfig(params)
    })
}