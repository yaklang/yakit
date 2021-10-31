const {ipcMain, app} = require("electron");

module.exports = (win, getClient) => {
    ipcMain.handle("yakit-version", ()=>{
        return app.getVersion()
    })
}