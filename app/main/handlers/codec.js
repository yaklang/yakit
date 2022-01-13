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
}