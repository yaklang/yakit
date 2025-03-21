const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext")

module.exports = (win, getClient) => {
    const asyncCreateNote = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateNote(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateNote", async (e, params) => {
        return await asyncCreateNote(params)
    })

    const asyncUpdateNote = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateNote(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateNote", async (e, params) => {
        return await asyncUpdateNote(params)
    })

    const asyncDeleteNote = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteNote(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteNote", async (e, params) => {
        return await asyncDeleteNote(params)
    })

    const asyncQueryNote = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryNote(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryNote", async (e, params) => {
        return await asyncQueryNote(params)
    })

    const asyncSearchNoteContent = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SearchNoteContent(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SearchNoteContent", async (e, params) => {
        return await asyncSearchNoteContent(params)
    })

    const streamNoteMap = new Map()

    ipcMain.handle("cancel-ImportNote", handlerHelper.cancelHandler(streamNoteMap))
    ipcMain.handle("ImportNote", (e, params, token) => {
        let stream = getClient().ImportNote(params)
        handlerHelper.registerHandler(win, stream, streamNoteMap, token)
    })

    ipcMain.handle("cancel-ExportNote", handlerHelper.cancelHandler(streamNoteMap))
    ipcMain.handle("ExportNote", (e, params, token) => {
        let stream = getClient().ExportNote(params)
        handlerHelper.registerHandler(win, stream, streamNoteMap, token)
    })
}
