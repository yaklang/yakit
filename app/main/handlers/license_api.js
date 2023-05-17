
const {ipcMain} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    const asyncGetLicense = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetLicense(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetLicense", async (e, params) => {
        return await asyncGetLicense(params)
    })

    const asyncCheckLicense = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CheckLicense(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CheckLicense", async (e, params) => {
        return await asyncCheckLicense(params)
    })
}

