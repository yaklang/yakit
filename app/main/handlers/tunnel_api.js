const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncGetTunnelServerExternalIP wrapper
    const asyncGetTunnelServerExternalIP = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetTunnelServerExternalIP(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetTunnelServerExternalIP", async (e, params) => {
        return await asyncGetTunnelServerExternalIP(params)
    })

    // asyncSetYakBridgeLogServer wrapper
    const asyncSetYakBridgeLogServer = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetYakBridgeLogServer(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetYakBridgeLogServer", async (e, params) => {
        return await asyncSetYakBridgeLogServer(params)
    })

}