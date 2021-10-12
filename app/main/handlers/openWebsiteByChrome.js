const electronFull = require("electron");
const {ipcMain, shell} = electronFull;
module.exports = (win, getClient) => {
    ipcMain.handle("shell-open-external", async (e, url) => {
        shell.openExternal(url)
    })
}