const electronFull = require("electron");
const {ipcMain, shell} = electronFull;

module.exports = (win, getClient) => {
    ipcMain.handle("shell-open-external", async (e, url) => {
        await shell.openExternal(url)
    })


    ipcMain.handle("shell-open-abs-file", async (e, file) => {
        return shell.openPath(file)
    })
}