const {ipcMain} = require("electron");


module.exports = (win, getClient) => {
    let stream;
    ipcMain.handle("cancel-yak", async () => {
        if (stream) stream.cancel();
    })
    ipcMain.handle("exec-yak", async (e, execRequest) => {
        stream = getClient().Exec(execRequest);
        stream.on("data", e => {
            if (!win) {
                return
            }
            win.webContents.send("client-yak-data", e)
        })
        stream.on("error", e => {
            if (!win) {
                return
            }
            win.webContents.send("client-yak-error", e)
        })
        stream.on("end", () => {
            stream.cancel()
            stream = null;
            if (!win) {
                return
            }
            win.webContents.send("client-yak-end")
        })
    })

    ipcMain.handle("yak-exec-history", async (e, req) => {
        getClient().QueryExecHistory(req, (err, response) => {
            if (win && err) {
                win.webContents.send("client-yak-exec-history", err.details || "execHistory querying unknown error")
            } else (win && response)
            {
                win.webContents.send("client-yak-exec-history", response)
            }
        })
    })

    // asyncQueryExecHistory wrapper
    const asyncQueryExecHistory = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryExecHistory(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryExecHistory", async (e, params) => {
        return await asyncQueryExecHistory(params)
    })
}