const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext");

    const streamPortScanMap = new Map();
    ipcMain.handle("cancel-PortScan", handlerHelper.cancelHandler(streamPortScanMap));
    ipcMain.handle("PortScan", (e, params, token) => {
        let stream = getClient().PortScan(params);
        handlerHelper.registerHandler(win, stream, streamPortScanMap, token)
    })
}