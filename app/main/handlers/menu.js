const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    // asyncAddToMenu wrapper
    const asyncAddToMenu = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AddToMenu(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AddToMenu", async (e, params) => {
        return await asyncAddToMenu(params)
    })

    // asyncRemoveFromMenu wrapper
    const asyncRemoveFromMenu = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RemoveFromMenu(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RemoveFromMenu", async (e, params) => {
        return await asyncRemoveFromMenu(params)
    })

    // asyncYakScriptIsInMenu wrapper
    const asyncYakScriptIsInMenu = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YakScriptIsInMenu(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("YakScriptIsInMenu", async (e, params) => {
        return await asyncYakScriptIsInMenu(params)
    })

    // asyncGetAllMenuItem wrapper
    const asyncGetAllMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllMenuItem", async (e, params) => {
        return await asyncGetAllMenuItem(params)
    })

    // asyncGetMenuItemById wrapper
    const asyncGetMenuItemById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetMenuItemById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetMenuItemById", async (e, params) => {
        return await asyncGetMenuItemById(params)
    })

    // asyncQueryGroupsByYakScriptId wrapper
    const asyncQueryGroupsByYakScriptId = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryGroupsByYakScriptId(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryGroupsByYakScriptId", async (e, params) => {
        return await asyncQueryGroupsByYakScriptId(params)
    })

    // asyncDeleteAllMenuItem wrapper
    const asyncDeleteAllMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAllMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteAllMenuItem", async (e, params) => {
        return await asyncDeleteAllMenuItem(params)
    })

    // asyncImportMenuItem wrapper
    const asyncImportMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ImportMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ImportMenuItem", async (e, params) => {
        return await asyncImportMenuItem(params)
    })

    // asyncExportMenuItem wrapper
    const asyncExportMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExportMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExportMenuItem", async (e, params) => {
        return await asyncExportMenuItem(params)
    })
}