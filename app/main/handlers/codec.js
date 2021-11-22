const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    // asyncCodec wrapper
    const asyncCodec = (params) => {
        return new Promise((resolve, reject) => {
            getClient().Codec(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("Codec", async (e, params) => {
        return await asyncCodec(params)
    })

    ipcMain.handle("codec", (e, data) => {
        getClient().Codec(data, (err, result) => {
            if (err) {
                win.webContents.send("client-codec-error", err.details)
                return
            }
            if (win && result?.Result) {
                win.webContents.send("client-codec", result?.Result || "")
            }
        })
    })
}