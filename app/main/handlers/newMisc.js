const {ipcMain} = require("electron")
module.exports = {
    registerNewIPC: (win, getClient, ipcEventPre) => {
        // asyncGetKey wrapper
        const asyncGetKey = (params) => {
            return new Promise((resolve, reject) => {
                getClient().GetKey(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data.Value)
                })
            })
        }
        ipcMain.handle(ipcEventPre + "GetKey", async (e, params) => {
            return await asyncGetKey(params)
        })

        // asyncSetKey wrapper
        const asyncSetKey = (params) => {
            return new Promise((resolve, reject) => {
                getClient().SetKey(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle(ipcEventPre + "SetKey", async (e, params) => {
            return await asyncSetKey(params)
        })
    }
}
