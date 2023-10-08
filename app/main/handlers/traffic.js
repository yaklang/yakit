const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext");

module.exports = (win, getClient) => {
    // asyncQueryTrafficSession wrapper
    const asyncQueryTrafficSession = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryTrafficSession(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryTrafficSession", async (e, params) => {
        return await asyncQueryTrafficSession(params)
    })

    // asyncQueryTrafficPacket wrapper
    const asyncQueryTrafficPacket = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryTrafficPacket(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryTrafficPacket", async (e, params) => {
        return await asyncQueryTrafficPacket(params)
    })
}
