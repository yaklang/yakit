const {ipcMain} = require("electron");


module.exports = (win, getClient) => {
    ipcMain.handle("delete-http-flows-all", async () => {
        getClient().DeleteHTTPFlows({DeleteAll: true}, (err, data) => {
        })
    })
    ipcMain.handle("query-http-flows", async (e, params) => {
        getClient().QueryHTTPFlows(params, (err, data) => {
            if (err && win) {
                win.webContents.send("client-query-http-flows-error", err?.details || "unknown")
                return
            }

            if (data) {
                win.webContents.send("client-query-http-flows-response", data)
            }
        })
    })

    // asyncQueryHTTPFlows wrapper
    const asyncQueryHTTPFlows = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHTTPFlows(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHTTPFlows", async (e, params) => {
        return await asyncQueryHTTPFlows(params)
    })


    // asyncQueryHTTPFlows wrapper
    const asyncGetHTTPFlowByHash = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetHTTPFlowByHash(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetHTTPFlowByHash", async (e, params) => {
        return await asyncGetHTTPFlowByHash(params)
    })

    ipcMain.handle("get-http-flow", async (r, hash) => {
        getClient().GetHTTPFlowByHash({
            Hash: hash,
        }, (err, data) => {
            if (err && win) {
                try {
                    win.webContents.send(`ERROR:${hash}`, err?.details || "UNKNOWN")
                } catch (e) {
                    console.info(e)
                }
                return
            }

            if (data && win) {
                win.webContents.send(hash, data)
            }
        });
    })
}