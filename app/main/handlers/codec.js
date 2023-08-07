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

    // asyncAutoDecode wrapper
    const asyncAutoDecode = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AutoDecode(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AutoDecode", async (e, params) => {
        return await asyncAutoDecode(params)
    })

    // asyncPacketPrettifyHelper wrapper
    const asyncPacketPrettifyHelper = (params) => {
        return new Promise((resolve, reject) => {
            getClient().PacketPrettifyHelper(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PacketPrettifyHelper", async (e, params) => {
        return await asyncPacketPrettifyHelper(params)
    })
}