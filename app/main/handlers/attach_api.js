const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    /* 追加查看引擎输出的接口 */
    const streamAttachCombinedOutputMap = new Map();
    ipcMain.handle("cancel-AttachCombinedOutput", handlerHelper.cancelHandler(streamAttachCombinedOutputMap));
    ipcMain.handle("AttachCombinedOutput", (e, params, token) => {
        let stream = getClient().AttachCombinedOutput(params);
        handlerHelper.registerHandler(win, stream, streamAttachCombinedOutputMap, token)
    })


    // asyncSaveTextToTemporalFile wrapper
    const asyncSaveTextToTemporalFile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveTextToTemporalFile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("SaveTextToTemporalFile", async (e, params) => {
        return await asyncSaveTextToTemporalFile(params)
    })
}