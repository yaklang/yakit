const {ipcMain} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    // asyncIsCVEDatabaseReady wrapper
    const asyncIsCVEDatabaseReady = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsCVEDatabaseReady(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsCVEDatabaseReady", async (e, params) => {
        return await asyncIsCVEDatabaseReady(params)
    })

    const streamUpdateCVEDatabaseMap = new Map();
    ipcMain.handle("cancel-UpdateCVEDatabase", handlerHelper.cancelHandler(streamUpdateCVEDatabaseMap));
    ipcMain.handle("UpdateCVEDatabase", (e, params, token) => {
        let stream = getClient().UpdateCVEDatabase(params);
        handlerHelper.registerHandler(win, stream, streamUpdateCVEDatabaseMap, token)
    })

    // asyncQueryCVE wrapper
    const asyncQueryCVE = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryCVE(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryCVE", async (e, params) => {
        return await asyncQueryCVE(params)
    })

    // asyncGetCVE wrapper
    const asyncGetCVE = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetCVE(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetCVE", async (e, params) => {
        return await asyncGetCVE(params)
    })
}