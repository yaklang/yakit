const {ipcMain} = require("electron")

const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {

    // asyncImportChaosMakerRules wrapper
    const asyncImportChaosMakerRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ImportChaosMakerRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("ImportChaosMakerRules", async (e, params) => {
        return await asyncImportChaosMakerRules(params)
    })

    // asyncQueryChaosMakerRule wrapper
    const asyncQueryChaosMakerRule = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryChaosMakerRule(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryChaosMakerRules", async (e, params) => {
        return await asyncQueryChaosMakerRule(params)
    })
    ipcMain.handle("QueryChaosMakerRule", async (e, params) => {
        return await asyncQueryChaosMakerRule(params)
    })


    const streamExecuteChaosMakerRuleMap = new Map();
    ipcMain.handle("cancel-ExecuteChaosMakerRule", handlerHelper.cancelHandler(streamExecuteChaosMakerRuleMap));
    ipcMain.handle("ExecuteChaosMakerRule", (e, params, token) => {
        let stream = getClient().ExecuteChaosMakerRule(params);
        handlerHelper.registerHandler(win, stream, streamExecuteChaosMakerRuleMap, token)
    })

    // asyncIsRemoteAddrAvailable wrapper
    const asyncIsRemoteAddrAvailable = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsRemoteAddrAvailable(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("IsRemoteAddrAvailable", async (e, params) => {
        return await asyncIsRemoteAddrAvailable(params)
    })

}