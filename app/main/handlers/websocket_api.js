const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    /*
        * WebsocketFuzzer 套件
        * */
    const streamCreateWebsocketFuzzerMap = new Map();
    ipcMain.handle("cancel-CreateWebsocketFuzzer", handlerHelper.cancelHandler(streamCreateWebsocketFuzzerMap));
    ipcMain.handle("CreateWebsocketFuzzer", async (e, params, token) => {
        if (!token) {
            throw Error(`no token set`)
        }

        let exitedStream = streamCreateWebsocketFuzzerMap.get(token)
        if (!exitedStream) {
            let stream = getClient().CreateWebsocketFuzzer();
            stream.write(params)
            handlerHelper.registerHandler(win, stream, streamCreateWebsocketFuzzerMap, token)
        } else {
            exitedStream.write(params)
        }
    })

    // asyncQueryWebsocketFlowByHTTPFlowWebsocketHash wrapper
    const asyncQueryWebsocketFlowByHTTPFlowWebsocketHash = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryWebsocketFlowByHTTPFlowWebsocketHash(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryWebsocketFlowByHTTPFlowWebsocketHash", async (e, params) => {
        return await asyncQueryWebsocketFlowByHTTPFlowWebsocketHash(params)
    })

    // asyncDeleteWebsocketFlowByHTTPFlowWebsocketHash wrapper
    const asyncDeleteWebsocketFlowByHTTPFlowWebsocketHash = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteWebsocketFlowByHTTPFlowWebsocketHash(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteWebsocketFlowByHTTPFlowWebsocketHash", async (e, params) => {
        return await asyncDeleteWebsocketFlowByHTTPFlowWebsocketHash(params)
    })

    // asyncDeleteWebsocketFlowAll wrapper
    const asyncDeleteWebsocketFlowAll = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteWebsocketFlowAll(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteWebsocketFlowAll", async (e, params) => {
        return await asyncDeleteWebsocketFlowAll(params)
    })
}