const {ipcMain} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    // asyncSetCurrentProject wrapper
    const asyncSetCurrentProject = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetCurrentProject(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetCurrentProject", async (e, params) => {
        return await asyncSetCurrentProject(params)
    })

    // asyncGetCurrentProject wrapper
    const asyncGetCurrentProject = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetCurrentProject(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetCurrentProject", async (e, params) => {
        return await asyncGetCurrentProject(params)
    })

    // asyncGetProjects wrapper
    const asyncGetProjects = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetProjects(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetProjects", async (e, params) => {
        return await asyncGetProjects(params)
    })

    // asyncNewProject wrapper
    const asyncNewProject = (params) => {
        return new Promise((resolve, reject) => {
            getClient().NewProject(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("NewProject", async (e, params) => {
        return await asyncNewProject(params)
    })

    const asyncIsProjectNameValid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsProjectNameValid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsProjectNameValid", async (e, params) => {
        return await asyncIsProjectNameValid(params)
    })

    // asyncRemoveProject wrapper
    const asyncRemoveProject = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RemoveProject(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RemoveProject", async (e, params) => {
        return await asyncRemoveProject(params)
    })

    // asyncDeleteProject wrapper
    const asyncDeleteProject = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteProject(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteProject", async (e, params) => {
        return await asyncDeleteProject(params)
    })

    // asyncGetDefaultProject wrapper
    const asyncGetDefaultProject = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetDefaultProject(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetDefaultProject", async (e) => {
        return await asyncGetDefaultProject()
    })

    const streamExportProjectMap = new Map();
    ipcMain.handle("cancel-ExportProject", handlerHelper.cancelHandler(streamExportProjectMap));
    ipcMain.handle("ExportProject", (e, params, token) => {
        let stream = getClient().ExportProject(params);
        handlerHelper.registerHandler(win, stream, streamExportProjectMap, token)
    })

    const streamImportProjectMap = new Map();
    ipcMain.handle("cancel-ImportProject", handlerHelper.cancelHandler(streamImportProjectMap));
    ipcMain.handle("ImportProject", (e, params, token) => {
        let stream = getClient().ImportProject(params);
        handlerHelper.registerHandler(win, stream, streamImportProjectMap, token)
    })

    // asyncMigrateLegacyDatabase wrapper
    const asyncMigrateLegacyDatabase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().MigrateLegacyDatabase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("MigrateLegacyDatabase", async (e, params) => {
        return await asyncMigrateLegacyDatabase(params)
    })
}