const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext");

module.exports = (win, getClient) => {
    // asyncQueryTrafficSession wrapper
    const asyncQueryTrafficSession = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryTrafficSession(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryTrafficSession", async (e, params) => {
        return await asyncQueryTrafficSession(params)
    })

    // asyncQueryTrafficPacket wrapper
    const asyncQueryTrafficPacket = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryTrafficPacket(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryTrafficPacket", async (e, params) => {
        return await asyncQueryTrafficPacket(params)
    })

    // asyncGetPcapMetadata wrapper
    const asyncGetPcapMetadata = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetPcapMetadata(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetPcapMetadata", async (e, params) => {
        return await asyncGetPcapMetadata(params)
    })

    const handlerHelper = require("./handleStreamWithContext");

    const streamPcapXMap = new Map();
    ipcMain.handle("cancel-PcapX", handlerHelper.cancelHandler(streamPcapXMap));
    ipcMain.handle("PcapX", (e, params, token) => {
        if (streamPcapXMap.has(token)) {
            const stream = streamPcapXMap.get(token);
            stream.write(params);
            return
        }
        const stream = getClient().PcapX();
        stream.write(params);
        handlerHelper.registerHandler(win, stream, streamPcapXMap, token)
    })
}
