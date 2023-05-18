
const {ipcMain, dialog} = require("electron")


module.exports = (win, getClient) => {
    // asyncSaveMarkdownDocument wrapper
    const asyncSaveMarkdownDocument = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveMarkdownDocument(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveMarkdownDocument", async (e, params) => {
        return await asyncSaveMarkdownDocument(params)
    })

    // asyncGetMarkdownDocument wrapper
    const asyncGetMarkdownDocument = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetMarkdownDocument(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetMarkdownDocument", async (e, params) => {
        return await asyncGetMarkdownDocument(params)
    })

    // asyncDeleteMarkdownDocument wrapper
    const asyncDeleteMarkdownDocument = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteMarkdownDocument(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteMarkdownDocument", async (e, params) => {
        return await asyncDeleteMarkdownDocument(params)
    })

}

