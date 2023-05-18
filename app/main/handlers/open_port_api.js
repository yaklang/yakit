const {ipcMain, app, clipboard} = require("electron")


module.exports = (win, getClient) => {
    let streams = {};
    const getStreamByPort = (addr) => {
        return streams[addr];
    }
    const removeStreamPort = (addr) => {
        const stream = streams[addr];
        if (stream) {
            stream.cancel();
            delete streams[addr];
        }
    };

    ipcMain.handle("listening-port-query-addrs", () => {
        return Object.keys(streams).map(i => `${i}`)
    });
    ipcMain.handle("listening-port-input", async (e, addr, data) => {
        const stream = getStreamByPort(addr);
        if (stream) {
            stream.write({
                raw: Buffer.from(data, "utf8")
            })
        }
    })
    ipcMain.handle("listening-port-cancel", async (e, addr) => {
        removeStreamPort(addr)
    });
    ipcMain.handle("listening-port", async (e, host, port) => {
        const addr = `${host}:${port}`
        if (getStreamByPort(addr)) {
            throw Error("listened port");
        }
        const stream = getClient().OpenPort();
        // 如果有问题，重置
        stream.on("error", (e) => {
            removeStreamPort(addr)
        })

        // 发送回数据
        stream.on("data", data => {
            if (data.control) {
                if (win && data.waiting) {
                    win.webContents.send(`client-listening-port-success-${addr}`)
                }
                if (win && data.closed) {
                    removeStreamPort(addr)
                }
                return
            }

            if (win) {
                win.webContents.send(`client-listening-port-data-${addr}`, data)
            }
        })
        stream.on("end", () => {
            removeStreamPort(addr)
            if (win) {
                win.webContents.send("client-listening-port-end", addr);
            }
        })
        stream.write({
            host, port,
        })
        streams[addr] = stream;
    })
}