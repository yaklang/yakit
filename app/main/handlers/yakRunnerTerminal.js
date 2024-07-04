const {ipcMain, clipboard} = require("electron");

module.exports = (win, getClient) => {

    let streams = {};
    const getStreamByPort = (path) => {
        return streams[path];
    }
    const removeStreamPort = (path) => {
        // const stream = streams[path];
        // if (stream) {
        //     stream.cancel();
        //     delete streams[path];
        // }
    };

    ipcMain.handle("runner-terminal-query-addrs", () => {
        return Object.keys(streams).map(i => `${i}`)
    });
    ipcMain.handle("runner-terminal-input", async (e, path, data) => {
        const stream = getStreamByPort(path);
        if (stream) {
            stream.write({
                raw: Buffer.from(data, "utf8")
            })
        }
    })
    ipcMain.handle("runner-terminal-cancel", async (e, path) => {
        removeStreamPort(path)
    });
    ipcMain.handle("runner-terminal", async (e, params) => {
        const {path} = params
        if (getStreamByPort(path)) {
            throw Error("listened terminal");
        }
        stream = getClient().YaklangTerminal();
        // 如果有问题，重置
        stream.on("error", (e) => {
            console.log("error---",e);
            removeStreamPort(path)
        })

        // 发送回数据
        stream.on("data", data => {
            console.log("data---",e);
            if (data.control) {
                if (win && data.waiting) {
                    win.webContents.send(`client-listening-terminal-success-${path}`)
                }
                if (win && data.closed) {
                    removeStreamPort(path)
                }
                return
            }

            if (win) {
                win.webContents.send(`client-listening-terminal-data-${path}`, data)
            }
        })
        stream.on("end", () => {
            console.log("end---",e);
            removeStreamPort(path)
            if (win) {
                win.webContents.send("client-listening-terminal-end", path);
            }
        })
        console.log("start---",params);
        stream.write(params)
        streams[path] = stream;
    })
}