const { ipcMain } = require("electron");

module.exports = (win, getClient) => {
    const asyncGetNaslFamilies = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetNaslFamilies(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetNaslFamilies", (e, params) => {
        return asyncGetNaslFamilies(params)
    })

    const asyncQueryNaslScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryNaslScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryNaslScript", async (e, params) => {
        return await asyncQueryNaslScript(params)
    })
}