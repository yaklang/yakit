const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    ipcMain.handle("yak-version", () => {
        getClient().Version({}, async (err, data) => {
            if (win && data.Version) {
                win.webContents.send("client-yak-version", data.Version)
            }
        })
    })
    ipcMain.handle("engine-status", () => {
        const text = "hello yak grpc engine";
        getClient().Echo({text}, (err, data) => {
            if (win) {
                if (data?.result === text) {
                    win.webContents.send("client-engine-status-ok")
                } else {
                    win.webContents.send("client-engine-status-error")
                }
            }
        })
    })
}