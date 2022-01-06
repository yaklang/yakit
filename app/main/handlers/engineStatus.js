const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    let client = null;
    ipcMain.handle("yak-version", () => {
        if (!client) {
            client = getClient(true)
        }

        try {
            getClient().Version({}, async (err, data) => {
                if (win && data.Version) {
                    win.webContents.send("client-yak-version", data.Version)
                }
            })
        } catch (e) {
            client = null;
            if (win && data.Version) {
                win.webContents.send("client-yak-version", "")
            }
        }
    })

    ipcMain.handle("engine-status", () => {
        if (!client) {
            client = getClient(true)
        }

        try {
            const text = "hello yak grpc engine";
            client.Echo({text}, (err, data) => {
                if (win) {
                    if (data?.result === text) {
                        win.webContents.send("client-engine-status-ok")
                    } else {
                        // win.webContents.send("client-engine-status-error")
                    }
                }
            })
        } catch (e) {
            client = null;
            if (win) {
                // win.webContents.send("client-engine-status-error")
            }
        }
    })
}