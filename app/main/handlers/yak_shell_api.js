const {ipcMain} = require("electron")

const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {

    const streamInteractiveRunYakCodeMap = new Map()
    ipcMain.handle("cancel-InteractiveRunYakCode", handlerHelper.cancelHandler(streamInteractiveRunYakCodeMap))
    ipcMain.handle("InteractiveRunYakCodeWrite", (e, token, data) => {
        let stream = streamInteractiveRunYakCodeMap.get(token)
        if (!!stream) {
            stream.write(data)
        }
    })
    ipcMain.handle("InteractiveRunYakCode", (e, token) => {
        let stream = getClient().CreateYaklangShell()
        handlerHelper.registerHandler(win, stream, streamInteractiveRunYakCodeMap, token)

        streamInteractiveRunYakCodeMap.set(token, stream)
        stream.on("data", (data) => {
            if (!win) {
                return
            }
            if (data.Scope && data.Scope.length > 0) {
                win.webContents.send(`${token}-data-scope`, data.Scope)
            }
            if (data.RawResult) {
                if (Boolean(data.RawResult?.IsMessage) && data.RawResult.Message.toString() === "signal-interactive-exec-end") {
                    win.webContents.send(`${token}-exec-end`)
                } else {
                    win.webContents.send(`${token}-data`, data.RawResult)
                }

            }
        })
        stream.on("error", (error) => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-error`, error && error.details)
        })
        stream.on("end", () => {
            streamInteractiveRunYakCodeMap.delete(token)
            if (!win) {
                return
            }
            win.webContents.send(`${token}-end`)
        })
    })

}