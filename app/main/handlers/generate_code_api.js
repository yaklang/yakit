const {ipcMain} = require("electron")


module.exports = (win, getClient) => {
    // asyncGenerateYakCodeByPacket wrapper
    const asyncGenerateYakCodeByPacket = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateYakCodeByPacket(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateYakCodeByPacket", async (e, params) => {
        return await asyncGenerateYakCodeByPacket(params)
    })

    // asyncGenerateCSRFPocByPacket wrapper
    const asyncGenerateCSRFPocByPacket = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateCSRFPocByPacket(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateCSRFPocByPacket", async (e, params) => {
        return await asyncGenerateCSRFPocByPacket(params)
    })
}