const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext");

    const streamPortScanMap = new Map();
    ipcMain.handle("cancel-StartBrute", handlerHelper.cancelHandler(streamPortScanMap));
    ipcMain.handle("StartBrute", (e, params, token) => {
        let stream = getClient().StartBrute(params);
        handlerHelper.registerHandler(win, stream, streamPortScanMap, token)
    })
}