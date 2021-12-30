const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext");

    const streamPortScanMap = new Map();
    ipcMain.handle("cancel-StartBrute", handlerHelper.cancelHandler(streamPortScanMap));
    ipcMain.handle("StartBrute", (e, params, token) => {
        let stream = getClient().StartBrute(params);
        handlerHelper.registerHandler(win, stream, streamPortScanMap, token)
    })

    // asyncGetTunnelServerExternalIP wrapper
    const asyncGetTunnelServerExternalIP = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetTunnelServerExternalIP(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetTunnelServerExternalIP", async (e, params) => {
        return await asyncGetTunnelServerExternalIP(params)
    })
}