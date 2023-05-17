const {ipcMain} = require("electron")



module.exports = (win, getClient) => {

    // asyncResetAndInvalidUserData wrapper
    const asyncResetAndInvalidUserData = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ResetAndInvalidUserData(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ResetAndInvalidUserData", async (e, params) => {
        return await asyncResetAndInvalidUserData(params)
    })

    /*
        * File Ops
        * */
    // asyncIsPrivilegedForNetRaw wrapper
    const asyncIsPrivilegedForNetRaw = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsPrivilegedForNetRaw(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsPrivilegedForNetRaw", async (e, params) => {
        return await asyncIsPrivilegedForNetRaw(params)
    })


    // asyncPromotePermissionForUserPcap wrapper
    const asyncPromotePermissionForUserPcap = (params) => {
        return new Promise((resolve, reject) => {
            getClient().PromotePermissionForUserPcap(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PromotePermissionForUserPcap", async (e, params) => {
        return await asyncPromotePermissionForUserPcap(params)
    })

    // asyncGetMachineID wrapper
    const asyncGetMachineID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetMachineID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetMachineID", async (e, params) => {
        return await asyncGetMachineID(params)
    })
}