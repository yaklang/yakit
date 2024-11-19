const {ipcMain, clipboard} = require("electron")

module.exports = (win, getClient) => {
    let streams = {}
    const getStreamByRunner = (id) => {
        return streams[id]
    }
    const removeStreamRunner = (id) => {
        const stream = streams[id]
        if (stream) {
            stream.cancel()
            delete streams[id]
        }
    }
    const clearStreamRunner = () => {
        if (Object.keys(streams) !== 0) {
            for (let key of Object.keys(streams)) {
                removeStreamRunner(key)
            }
        }
    }

    ipcMain.handle("runner-terminal-query-addrs", () => {
        return Object.keys(streams).map((i) => `${i}`)
    })
    ipcMain.handle("runner-terminal-input", async (e, id, data) => {
        const stream = getStreamByRunner(id)
        if (stream) {
            stream.write({
                raw: Buffer.from(data, "utf8")
            })
        }
    })
    ipcMain.handle("runner-terminal-size", async (e, id, size) => {
        const stream = getStreamByRunner(id)
        if (stream) {
            stream.write({
                ...size
            })
        }
    })
    ipcMain.handle("runner-terminal-cancel", async (e, id) => {
        removeStreamRunner(id)
    })
    ipcMain.handle("runner-terminal-clear", async (e) => {
        clearStreamRunner()
    })
    ipcMain.handle("runner-terminal", async (e, params) => {
        const {id, path, row, col} = params
        if (getStreamByRunner(id)) {
            throw Error("listened terminal")
        }
        stream = getClient().YaklangTerminal()
        // 如果有问题，重置
        stream.on("error", (e) => {
            removeStreamRunner(id)
            if(win){
                win.webContents.send("client-listening-terminal-error", {id, path})
            }
        })

        // 发送回数据
        stream.on("data", (data) => {
            if (data.control) {
                if (win && data.waiting) {
                    win.webContents.send(`client-listening-terminal-success`, {id, path, result: data})
                }
                if (win && data.closed) {
                    removeStreamRunner(id)
                }
                return
            }

            if (win) {
                win.webContents.send(`client-listening-terminal-data`, {id, path, result: data})
            }
        })
        stream.on("end", () => {
            removeStreamRunner(id)
            if (win) {
                win.webContents.send("client-listening-terminal-end", {id, path})
            }
        })
        stream.write({path, row, col})
        streams[id] = stream
    })
}
