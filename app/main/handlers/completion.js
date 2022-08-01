const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    // asyncGetYakitCompletionRaw wrapper
    const asyncGetYakitCompletionRaw = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakitCompletionRaw(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetYakitCompletionRaw", async (e, params) => {
        return await asyncGetYakitCompletionRaw(params)
    })

    // asyncStaticAnalyzeError wrapper
    const asyncStaticAnalyzeError = (params) => {
        return new Promise((resolve, reject) => {
            getClient().StaticAnalyzeError(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("StaticAnalyzeError", async (e, params) => {
        return await asyncStaticAnalyzeError(params)
    })
}