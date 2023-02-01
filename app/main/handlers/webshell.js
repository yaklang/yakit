const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    const asyncQueryWebShells = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryWebShells(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryWebShells", async (e, params) => {
        return await asyncQueryWebShells(params)
    })

    const asyncCreateWebShell = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateWebShell(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateWebShell", async (e, params) => {
        return await asyncCreateWebShell(params)
    })

}
