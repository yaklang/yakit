const { ipcMain, clipboard } = require("electron");

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
        stream = getClient().OpenPort();
        // 如果有问题，重置
        stream.on("error", (e) => {
            if (win) {
                win.webContents.send(`client-listening-port-error-${addr}`, e);
            }
        })

        // 发送回数据
        stream.on("data", data => {
            if (win) {
                win.webContents.send(`client-listening-port-data-${addr}`, data)
            }
        })
        stream.on("end", () => {
            if (win) {
                win.webContents.send(`client-listening-port-end-${addr}`, addr);
            }
        })
        stream.write({
            host, port,
        })
        streams[addr] = stream;
    })

    const asyncGetReverseShellProgramList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetReverseShellProgramList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetReverseShellProgramList", async (e, params) => {
        return await asyncGetReverseShellProgramList(params)
    })

    const asyncGenerateReverseShellCommand = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateReverseShellCommand(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateReverseShellCommand", async (e, params) => {
        return await asyncGenerateReverseShellCommand(params)
    })
}