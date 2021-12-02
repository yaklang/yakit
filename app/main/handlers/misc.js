const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    // asyncGetAvailableBruteTypes wrapper
    const asyncGetAvailableBruteTypes = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAvailableBruteTypes(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAvailableBruteTypes", async (e, params) => {
        return await asyncGetAvailableBruteTypes(params)
    })
}