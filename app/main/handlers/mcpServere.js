const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncAddMCPServer wrapper
    const asyncAddMCPServer = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AddMCPServer(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AddMCPServer", async (e, params) => {
        return await asyncAddMCPServer(params)
    })

    // asyncDeleteMCPServer wrapper
    const asyncDeleteMCPServer = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteMCPServer(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteMCPServer", async (e, params) => {
        return await asyncDeleteMCPServer(params)
    })

    // asyncUpdateMCPServer wrapper
    const asyncUpdateMCPServer = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateMCPServer(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateMCPServer", async (e, params) => {
        return await asyncUpdateMCPServer(params)
    })

    // asyncGetAllMCPServers wrapper
    const asyncGetAllMCPServers = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllMCPServers(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllMCPServers", async (e, params) => {
        return await asyncGetAllMCPServers(params)
    })
}
