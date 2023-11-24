const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // const handlerHelper = require("./handleStreamWithContext")

    // const streamPayloadMap = new Map()
    // ipcMain.handle("cancel-SavePayload", handlerHelper.cancelHandler(streamPayloadMap))
    // ipcMain.handle("SavePayloadStream", (e, params, token) => {
    //     let stream = getClient().SavePayloadStream(params)
    //     handlerHelper.registerHandler(win, stream, streamPayloadMap, token)
    // })

    // const streamPayloadFileMap = new Map()
    // ipcMain.handle("cancel-SavePayloadFile", handlerHelper.cancelHandler(streamPayloadFileMap))
    // ipcMain.handle("SavePayloadToFileStream", (e, params, token) => {
    //     let stream = getClient().SavePayloadToFileStream(params)
    //     handlerHelper.registerHandler(win, stream, streamPayloadFileMap, token)
    // })

    const asyncQueryPayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryPayload", async (e, params) => {
        return await asyncQueryPayload(params)
    })

    const asyncGetAllPayloadFromFile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllPayloadFromFile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllPayloadFromFile", async (e, params) => {
        return await asyncGetAllPayloadFromFile(params)
    })

    const asyncUpdateAllPayloadGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateAllPayloadGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateAllPayloadGroup", async (e, params) => {
        return await asyncUpdateAllPayloadGroup(params)
    })

    const asyncRenamePayloadGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RenamePayloadGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RenamePayloadGroup", async (e, params) => {
        return await asyncRenamePayloadGroup(params)
    })

    const asyncDeletePayloadByFolder = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePayloadByFolder(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePayloadByFolder", async (e, params) => {
        return await asyncDeletePayloadByFolder(params)
    })

    const asyncDeletePayloadByGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePayloadByGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePayloadByGroup", async (e, params) => {
        return await asyncDeletePayloadByGroup(params)
    })

    // message DeletePayloadByIdRequest {
    //     int64 Id = 1; // 用于删除一个
    //     repeated int64 Ids = 2; // 删除多个
    //   }
    // asyncDeletePayload wrapper
    const asyncDeletePayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePayload", async (e, params) => {
        return await asyncDeletePayload(params)
    })

    const handlerHelper = require("./handleStreamWithContext")

    const streamSavePayloadStreamMap = new Map()
    ipcMain.handle("cancel-SavePayloadStream", handlerHelper.cancelHandler(streamSavePayloadStreamMap))
    ipcMain.handle("SavePayloadStream", (e, params, token) => {
        let stream = getClient().SavePayloadStream(params)
        handlerHelper.registerHandler(win, stream, streamSavePayloadStreamMap, token)
    })

    const streamSavePayloadToFileStreamMap = new Map()
    ipcMain.handle("cancel-SavePayloadToFileStream", handlerHelper.cancelHandler(streamSavePayloadStreamMap))
    ipcMain.handle("SavePayloadStreamToFile", (e, params, token) => {
        let stream = getClient().SavePayloadToFileStream(params)
        handlerHelper.registerHandler(win, stream, streamSavePayloadStreamMap, token)
    })

    // message UpdatePayloadFolderRequest{
    //     string Folder = 1;
    //     string OldFolder = 2;
    //   }
    // 将名字为OldFolder的文件夹改名为Folder
    const asyncUpdatePayloadFolder = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdatePayloadFolder(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdatePayloadFolder", async (e, params) => {
        return await asyncUpdatePayloadFolder(params)
    })

    // message PayloadGroup {
    //     string Group = 1; group名字
    //     bool IsFile = 2;  是否是文件
    //     string Folder = 3;所在文件夹，没有文件夹的时候为"
    //   }

    // message UpdatePayloadGroupRequest{
    //     string GroupName = 1;
    //     PayloadGroup Data = 2;
    //   }
    // 填写完整的数据，后段将会直接储存
    const asyncUpdatePayloadGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdatePayloadGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdatePayloadGroup", async (e, params) => {
        return await asyncUpdatePayloadGroup(params)
    })

    // message UpdatePayloadRequest {
    //     string Id = 1; // modify payload id
    //     Payload Data = 2; // modify to this payload
    //   }
    // data填写完整的数据，后端会直接吧data保存进去
    const asyncUpdatePayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdatePayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdatePayload", async (e, params) => {
        return await asyncUpdatePayload(params)
    })

    // message CopyPayloadRequest {
    //     string id = 1;  // payload id
    //     PayloadGroup group = 2; // target group
    //   }
    // copy this payload to target group
    const asyncCopyPayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CopyPayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CopyPayload", async (e, params) => {
        return await asyncCopyPayload(params)
    })

    // message GetAllPayloadGroupResponse {
    //     repeated PayloadFolder Folder = 1; // 文件夹 只有一级  里头是PayloadGroup[]
    //     repeated PayloadGroup Groups = 2;  // 没有文件夹的所有的包，认为他们的文件夹为""
    //   }
    // asyncGetAllPayloadGroup wrapper
    const asyncGetAllPayloadGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllPayloadGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllPayloadGroup", async (e, params) => {
        return await asyncGetAllPayloadGroup(params)
    })

    // message GetAllPayloadRequest {
    //     string Group = 1;
    //     string Folder = 2;
    //   }
    const asyncGetAllPayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllPayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllPayload", async (e, params) => {
        return await asyncGetAllPayload(params)
    })
}
