const {ipcMain} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")

module.exports = (win, getClient) => {
    // asyncQueryReports wrapper
    const asyncQueryReports = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryReports(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryReports", async (e, params) => {
        return await asyncQueryReports(params)
    })

    // asyncQueryReport wrapper
    const asyncQueryReport = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryReport(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryReport", async (e, params) => {
        return await asyncQueryReport(params)
    })

    // asyncDeleteReport wrapper
    const asyncDeleteReport = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteReport(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteReport", async (e, params) => {
        return await asyncDeleteReport(params)
    })

    // asyncQueryAvailableReportFrom wrapper
    const asyncQueryAvailableReportFrom = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAvailableReportFrom(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAvailableReportFrom", async (e, params) => {
        return await asyncQueryAvailableReportFrom(params)
    })






}