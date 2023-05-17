const {ipcMain} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    // asyncGetAllYsoGadgetOptions wrapper
    const asyncGetAllYsoGadgetOptions = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllYsoGadgetOptions(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllYsoGadgetOptions", async (e, params) => {
        return await asyncGetAllYsoGadgetOptions(params)
    })

    // asyncGetAllYsoClassOptions wrapper
    const asyncGetAllYsoClassOptions = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllYsoClassOptions(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllYsoClassOptions", async (e, params) => {
        return await asyncGetAllYsoClassOptions(params)
    })


    // asyncGetAllYsoClassGeneraterOptions wrapper
    const asyncGetAllYsoClassGeneraterOptions = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllYsoClassGeneraterOptions(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllYsoClassGeneraterOptions", async (e, params) => {
        return await asyncGetAllYsoClassGeneraterOptions(params)
    })

    // asyncGenerateYsoCode wrapper
    const asyncGenerateYsoCode = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateYsoCode(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateYsoCode", async (e, params) => {
        return await asyncGenerateYsoCode(params)
    })


    // asyncGenerateYsoBytes wrapper
    const asyncGenerateYsoBytes = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateYsoBytes(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateYsoBytes", async (e, params) => {
        return await asyncGenerateYsoBytes(params)
    })

    // asyncYsoDump wrapper
    const asyncYsoDump = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YsoDump(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("YsoDump", async (e, params) => {
        return await asyncYsoDump(params)
    })



}