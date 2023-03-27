const {ipcMain} = require("electron");
const FS=require("fs")
const xlsx = require("node-xlsx")
const handlerHelper = require("./handleStreamWithContext");
module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext");

    const streamPortScanMap = new Map();
    ipcMain.handle("cancel-PortScan", handlerHelper.cancelHandler(streamPortScanMap));
    ipcMain.handle("PortScan", (e, params, token) => {
        let stream = getClient().PortScan(params);
        handlerHelper.registerHandler(win, stream, streamPortScanMap, token)
    })

    const asyncFetchFileContent = (params) => {
        return new Promise((resolve, reject) => {
            const type = params.split(".").pop()
            const typeArr = ['csv', 'xls', 'xlsx']
            // 读取Excel
            if(typeArr.includes(type)){
                // 读取xlsx
                try {
                    const obj = xlsx.parse(params)
                    resolve(obj)
                } catch (error) {
                    reject(err)
                }
            }
            // 读取txt
            else{
                FS.readFile(params,'utf-8',function(err,data){
                    if(err){
                        reject(err)
                    }
                    else{
                        resolve(data)
                    }
                });
            }
            
        })
    }


    const streamSimpleDetectMap = new Map();

    ipcMain.handle("cancel-SimpleDetect", handlerHelper.cancelHandler(streamSimpleDetectMap));

    ipcMain.handle("SimpleDetect", (e, params, token) => {
        let stream = getClient().SimpleDetect(params);
        handlerHelper.registerHandler(win, stream, streamSimpleDetectMap, token)
    })

    const asyncSaveCancelSimpleDetect = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CancelSimpleDetect(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveCancelSimpleDetect", async (e, params) => {
        return await asyncSaveCancelSimpleDetect(params)
    })

    // 获取URL的IP地址
    ipcMain.handle("fetch-file-content", async (e, params) => {
        return await asyncFetchFileContent(params)
    })
}