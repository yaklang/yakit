const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    // asyncQueryYakScript wrapper
    const asyncQueryYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryYakScript", async (e, params) => {
        return await asyncQueryYakScript(params)
    })

    ipcMain.handle("query-yak-script", (e, params) => {
        getClient().QueryYakScript(params, (err, data) => {
            if (data) {
                if (win) win.webContents.send("client-query-yak-script-data", data);
            }

            if (err) {
                if (win) win.webContents.send("client-query-yak-script-error", err?.details || "UNKNOWN ERROR")
            }

        })
    })
    ipcMain.handle("update-nuclei-poc", (e) => {
        getClient().LoadNucleiTemplates({}, (err) => {
            if (err) {
                console.info(`update nuclei template failed: ${err}`)
            }
        })
    });
    ipcMain.handle("auto-update-yak-module", (e) => {
        let stream = getClient().AutoUpdateYakModule({});
        stream.on("data", data => {
            if (!win) {
                return
            }

            win.webContents.send("client-auto-update-yak-module-data", data)
        })
        stream.on("end", data => {
            if (!win) {
                return
            }

            win.webContents.send("client-auto-update-yak-module-end")
        })
        stream.on("error", error => {
            if (!win) {
                return
            }

            win.webContents.send("client-auto-update-yak-module-error", error?.details)
        })
    })

    // asyncSaveYakScript wrapper
    const asyncSaveYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveYakScript", async (e, params) => {
        return await asyncSaveYakScript(params)
    })

    ipcMain.handle("delete-yak-script", (e, Id) => {
        getClient().DeleteYakScript({Id}, (err, _) => {
            err && console.info(err)
        })
    })

    const streamMap = new Map();
    ipcMain.handle("cancel-exec-yak-script", async (e, token) => {
        const stream = streamMap.get(token);
        console.info(`cancel exec yak script by token: ${token}`)
        stream && stream.cancel()
        streamMap.delete(token)
    })
    ipcMain.handle("exec-yak-script", (e, params, token) => {
        let stream = getClient().ExecYakScript(params);
        streamMap.set(token, stream)
        stream.on("data", data => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-data`, data)
        })
        stream.on("error", error => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-error`, error && error.details)
        })
        stream.on("end", () => {
            streamMap.delete(token)
            if (!win) {
                return
            }
            win.webContents.send(`${token}-end`)
        })
    })

    ipcMain.handle("cancel-exec-batch-yak-script", async (e, token) => {
        const stream = streamMap.get(token);
        console.info(`cancel exec batch yak script by token: ${token}`)
        stream && stream.cancel()
        streamMap.delete(token)
    })
    ipcMain.handle("exec-batch-yak-script", async (e, params, token) => {
        let stream = getClient().ExecBatchYakScript(params);
        streamMap.set(token, stream);
        stream.on("data", data => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-exec-batch-yak-script-data`, data)
        })
        stream.on("error", error => {
            if (!win) {
                return
            }
            win.webContents.send(`${token}-exec-batch-yak-script-error`, error && error.details)
        })
        stream.on("end", () => {
            streamMap.delete(token)
            if (!win) {
                return
            }
            win.webContents.send(`${token}-exec-batch-yak-script-end`)
        })
    })

    // asyncGetYakScriptById wrapper
    const asyncGetYakScriptById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetYakScriptById", async (e, params) => {
        return await asyncGetYakScriptById(params)
    })

    // asyncIgnoreYakScript wrapper
    const asyncIgnoreYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IgnoreYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IgnoreYakScript", async (e, params) => {
        return await asyncIgnoreYakScript(params)
    })

    // asyncUnIgnoreYakScript wrapper
    const asyncUnIgnoreYakScript = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UnIgnoreYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UnIgnoreYakScript", async (e, params) => {
        return await asyncUnIgnoreYakScript(params)
    })

    // asyncSaveMarkdownDocument wrapper
    const asyncSaveMarkdownDocument = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveMarkdownDocument(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveMarkdownDocument", async (e, params) => {
        return await asyncSaveMarkdownDocument(params)
    })

    // asyncGetMarkdownDocument wrapper
    const asyncGetMarkdownDocument = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetMarkdownDocument(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetMarkdownDocument", async (e, params) => {
        return await asyncGetMarkdownDocument(params)
    })

    // asyncDeleteMarkdownDocument wrapper
    const asyncDeleteMarkdownDocument = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteMarkdownDocument(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteMarkdownDocument", async (e, params) => {
        return await asyncDeleteMarkdownDocument(params)
    })
};