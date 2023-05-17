
const {ipcMain, dialog} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")
const handlerHelper = require("./handleStreamWithContext");


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

    ipcMain.handle("openDialog", async (e, params) => {
        return await new Promise((resolve, reject) => {
            dialog.showOpenDialog({
                ...params
            }).then((res)=>{
                if(res){
                    let result = {...res}
                    resolve(result)
                }
                else{
                    reject("获取文件失败")
                }
            })
        })

    })

}

