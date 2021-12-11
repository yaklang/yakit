const {ipcMain} = require("electron");
const FS=require("fs")

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
            FS.readFile(params,'utf-8',function(err,data){
                if(err){
                    reject(err)
                }
                else{
                    resolve(data)
                }
            });
        })
    }

    // 获取URL的IP地址
    ipcMain.handle("fetch-file-content", async (e, params) => {
        return await asyncFetchFileContent(params)
    })
}