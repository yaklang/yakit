const {ipcMain} = require("electron");


module.exports = (win, getClient) => {
    ipcMain.handle("string-fuzzer", (e, params) => {
        getClient().StringFuzzer({Template: params.template}, (err, data) => {
            if (win) {
                win.webContents.send(params.token, {
                    error: err,
                    data: err ? undefined : {
                        Results: (data || {Results: []}).Results.map(i => {
                            return i.toString()
                        })
                    },
                })
            }
        })
    })
    ipcMain.handle("http-fuzzer", (e, params) => {
        let client = getClient();
        let stream = client.HTTPFuzzer({
            Request: params.request,
            IsHTTPS: params.isHttps,
            ForceFuzz: params.forceFuzz,
            Concurrent: params.concurrent,
            PerRequestTimeoutSeconds: params.timeout,
            Proxy: params.proxy,
        });
        stream.on("data", (data) => {
            if (win && data) win.webContents.send("client-http-fuzzer-data", data)
        })
        stream.on("error", (err) => {
            if (win && err) win.webContents.send("client-http-fuzzer-error", err.details)
        })
        stream.on("end", () => {
            if (win) win.webContents.send("client-http-fuzzer-end")
        })
    })
    ipcMain.handle("analyze-fuzzer-response", (e, rsp, flag) => {
        getClient().ConvertFuzzerResponseToHTTPFlow(rsp, (err, req) => {
            if (err && win) {
                win.webContents.send(`ERROR:${flag}`, err?.details || "unknown")
            }

            if (req && win) {
                win.webContents.send(flag, req)
            }
        })
    })
}