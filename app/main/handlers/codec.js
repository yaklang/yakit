const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    ipcMain.handle("codec", (e, data) => {
        getClient().Codec(data, (err, result) => {
            if (err) {
                win.webContents.send("client-codec-error", err.details)
                return
            }
            if (win && result?.Result) {
                win.webContents.send("client-codec", result?.Result || "")
            }
        })
    })
}