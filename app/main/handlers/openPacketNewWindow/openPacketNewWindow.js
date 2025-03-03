const {ipcMain, BrowserWindow} = require("electron")
const path = require("path")

module.exports = {
    register: (win, getClient) => {
        ipcMain.handle("open-packet-new-window", async (e, url) => {
            const browserWindow = new BrowserWindow({
                width: 1200,
                height: 800,
                minWidth: 900,
                minHeight: 500,
                // autoHideMenuBar: true,
                webPreferences: {
                    preload: path.join(__dirname, "../../../preload/index.js"),
                    nodeIntegration: true,
                    contextIsolation: false,
                    sandbox: true
                },
            })
            browserWindow.loadFile(path.join(__dirname, "index.html"))
            return browserWindow
        })
    }
}
