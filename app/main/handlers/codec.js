const {ipcMain} = require("electron");
const fs = require("fs")
const path = require("path")

module.exports = (win, getClient) => {
    // asyncCodec wrapper
    const asyncCodec = (params) => {
        return new Promise((resolve, reject) => {
            getClient().Codec(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("Codec", async (e, params) => {
        return await asyncCodec(params)
    })

    // asyncAutoDecode wrapper
    const asyncAutoDecode = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AutoDecode(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AutoDecode", async (e, params) => {
        return await asyncAutoDecode(params)
    })

    // asyncPacketPrettifyHelper wrapper
    const asyncPacketPrettifyHelper = (params) => {
        return new Promise((resolve, reject) => {
            getClient().PacketPrettifyHelper(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PacketPrettifyHelper", async (e, params) => {
        return await asyncPacketPrettifyHelper(params)
    })
    const asyncNewCodec = (params) => {
        return new Promise((resolve, reject) => {
            getClient().NewCodec(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("NewCodec", async (e, params) => {
        return await asyncNewCodec(params)
    })

    const asyncGetAllCodecMethods = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllCodecMethods(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllCodecMethods", async (e, params) => {
        return await asyncGetAllCodecMethods(params)
    })

    const asyncSaveCodecOutputToTxt = (params) => {
        return new Promise(async (resolve, reject) => {
            const {outputDir, data, fileName} = params
            const filePath = path.join(outputDir, fileName);
            fs.writeFile(filePath, data, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve({
                        ok: true,
                        outputDir: filePath
                    })
                }
              });
        })
    }

    ipcMain.handle("SaveCodecOutputToTxt", async (e, params) => {
        return await asyncSaveCodecOutputToTxt(params)
    })

    const asyncimportCodecByPath  = (params) => {
        return new Promise(async (resolve, reject) => {
            fs.readFile(params, 'utf-8', function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            });
        })
    }

    ipcMain.handle("importCodecByPath", async (e, params) => {
        return await asyncimportCodecByPath(params)
    })
}