const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    ipcMain.handle("yak-version", () => {
        try {
            getClient().Version({}, async (err, data) => {
                if (win && data.Version) {
                    win.webContents.send("client-yak-version", data.Version)
                }
            })
        } catch (e) {
            if (win && data.Version) {
                win.webContents.send("client-yak-version", "")
            }
        }
    })

    ipcMain.handle("engine-status", () => {
        try {
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
        } catch (e) {
            if (win) {
                win.webContents.send("client-engine-status-error")
            }
        }
    })
}