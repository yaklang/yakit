const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    const streamStartBruteMap = new Map();
    ipcMain.handle("cancel-StartBrute", handlerHelper.cancelHandler(streamStartBruteMap));
    ipcMain.handle("StartBrute", (e, params, token) => {
        let stream = getClient().StartBrute(params);
        handlerHelper.registerHandler(win, stream, streamStartBruteMap, token)
    })

    // asyncGetAvailableBruteTypes wrapper
    const asyncGetAvailableBruteTypes = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAvailableBruteTypes(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAvailableBruteTypes", async (e, params) => {
        return await asyncGetAvailableBruteTypes(params)
    })

}
