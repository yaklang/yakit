const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext");

    const streamStartFacadesMap = new Map();
    ipcMain.handle("cancel-StartFacades", handlerHelper.cancelHandler(streamStartFacadesMap));
    ipcMain.handle("StartFacades", (e, params, token) => {
        let stream = getClient().StartFacades(params);
        handlerHelper.registerHandler(win, stream, streamStartFacadesMap, token)
    })
}