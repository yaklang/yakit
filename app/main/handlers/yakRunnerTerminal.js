const {ipcMain, clipboard} = require("electron")

module.exports = (win, getClient) => {
    let streams = {}
    const getStreamByRunner = (path) => {
        return streams[path]
    }
    const removeStreamRunner = (path) => {
        const stream = streams[path]
        if (stream) {
            stream.cancel()
            delete streams[path]
        }
    }
    const clearStreamRunner = () => {
        if(Object.keys(streams)!==0){
            for (let key of Object.keys(streams)) {
                removeStreamRunner(key)
            }
        }
    }

    ipcMain.handle("runner-terminal-query-addrs", () => {
        return Object.keys(streams).map((i) => `${i}`)
    })
    ipcMain.handle("runner-terminal-input", async (e, path, data) => {
        const stream = getStreamByRunner(path)
        if (stream) {
            stream.write({
                raw: Buffer.from(data, "utf8")
            })
        }
    })
    ipcMain.handle("runner-terminal-size", async (e, path, size) => {
        const stream = getStreamByRunner(path)
        if (stream) {
            stream.write({
                ...size
            })
        }
    })
    ipcMain.handle("runner-terminal-cancel", async (e, path) => {
        removeStreamRunner(path)
    })
    ipcMain.handle("runner-terminal-clear", async (e, path) => {
        clearStreamRunner()
    })
    ipcMain.handle("runner-terminal", async (e, params) => {
        const {path} = params
        if (getStreamByRunner(path)) {
            throw Error("listened terminal")
        }
        stream = getClient().YaklangTerminal()
        // 如果有问题，重置
        stream.on("error", (e) => {
            removeStreamRunner(path)
        })

        // 发送回数据
        stream.on("data", (data) => {
            if (data.control) {
                if (win && data.waiting) {
                    win.webContents.send(`client-listening-terminal-success-${path}`)
                }
                if (win && data.closed) {
                    removeStreamRunner(path)
                }
                return
            }

            if (win) {
                win.webContents.send(`client-listening-terminal-data-${path}`, data)
            }
        })
        stream.on("end", () => {
            removeStreamRunner(path)
            if (win) {
                win.webContents.send("client-listening-terminal-end", path)
            }
        })
        stream.write(params)
        streams[path] = stream
    })
}
