const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // get plugins risk list
    const asyncGetRiskList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YakScriptRiskTypeList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PluginsGetRiskList", async (e, params) => {
        return await asyncGetRiskList(params)
    })

    // get plugins risk info
    const asyncGetRiskInfo = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptRiskDetailByCWE(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PluginsGetRiskInfo", async (e, params) => {
        return await asyncGetRiskInfo(params)
    })
}
