const {ipcMain} = require("electron");

module.exports = (win, callback, getClient) => {
    ipcMain.handle("connect-yak", async (e, {
        host, port, password, caPem,
    }) => {
        callback(`${host}:${port}`, password || "", caPem || "")
    })
    ipcMain.handle("echo-yak", async (e, txt) => {
        let client = getClient();
        try {
            client.Echo({text: txt || ""}, (err, result) => {
                if (err) {
                    switch (err.code) {
                        case 2:
                            if ((err.details || "").includes("secret verify failed...")) {
                                win.webContents.send("client-echo-yak", false, `Yak Server 认证密码错误`)
                                return
                            }
                            win.webContents.send("client-echo-yak", false, `Yak Server 错误: ${err.details}`)
                        case 14:
                            win.webContents.send("client-echo-yak", false, `Yak Server 未启动或网络不通，或证书不匹配`)
                            return
                        case 16:
                            win.webContents.send("client-echo-yak", false, `Yak Server 认证失败`)
                            return
                        default:
                            win.webContents.send("client-echo-yak", false, `${err}`)
                            return
                    }
                }
                if (win) {
                    win.webContents.send("client-echo-yak", true, result.result)
                }
            })
        } catch (e) {
            throw Error(`call yak echo failed: ${e}`)
        }
        return txt
    })
}