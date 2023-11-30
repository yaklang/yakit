const {ipcMain} = require("electron")
const fs = require("fs")
const path = require("path")
module.exports = (win, getClient) => {
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
    // 获取table列表
    ipcMain.handle("QueryPayload", async (e, params) => {
        return await asyncQueryPayload(params)
    })

    const asyncQueryPayloadFromFile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPayloadFromFile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    // 获取编辑器内容
    ipcMain.handle("QueryPayloadFromFile", async (e, params) => {
        return await asyncQueryPayloadFromFile(params)
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
    // 更新顺序数组
    ipcMain.handle("UpdateAllPayloadGroup", async (e, params) => {
        return await asyncUpdateAllPayloadGroup(params)
    })

    const asyncRenamePayloadFolder = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RenamePayloadFolder(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 重命名Folder
    ipcMain.handle("RenamePayloadFolder", async (e, params) => {
        return await asyncRenamePayloadFolder(params)
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
    // 重命名Payload
    ipcMain.handle("RenamePayloadGroup", async (e, params) => {
        return await asyncRenamePayloadGroup(params)
    })

    const asyncCreatePayloadFolder = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreatePayloadFolder(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 新建文件夹
    ipcMain.handle("CreatePayloadFolder", async (e, params) => {
        return await asyncCreatePayloadFolder(params)
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
    // 删除文件夹
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
    // 删除Payload
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

    // 数据库存储
    const streamPayloadMap = new Map()
    ipcMain.handle("cancel-SavePayload", handlerHelper.cancelHandler(streamPayloadMap))
    ipcMain.handle("SavePayloadStream", (e, params, token) => {
        let stream = getClient().SavePayloadStream(params)
        handlerHelper.registerHandler(win, stream, streamPayloadMap, token)
    })

    // 文件存储
    const streamPayloadFileMap = new Map()
    ipcMain.handle("cancel-SavePayloadFile", handlerHelper.cancelHandler(streamPayloadFileMap))
    ipcMain.handle("SavePayloadToFileStream", (e, params, token) => {
        let stream = getClient().SavePayloadToFileStream(params)
        handlerHelper.registerHandler(win, stream, streamPayloadFileMap, token)
    })

    // 用于导出
    const streamPayloadFromFileMap = new Map()
    ipcMain.handle("cancel-GetAllPayloadFromFile", handlerHelper.cancelHandler(streamPayloadFromFileMap))
    ipcMain.handle("GetAllPayloadFromFile", async (e, params, token) => {
        let stream = getClient().GetAllPayloadFromFile(params)
        handlerHelper.registerHandler(win, stream, streamPayloadFromFileMap, token)
    })

    // 用于去重
    const streamRemoveDuplicateMap = new Map()
    ipcMain.handle("cancel-RemoveDuplicatePayloads", handlerHelper.cancelHandler(streamRemoveDuplicateMap))
    ipcMain.handle("RemoveDuplicatePayloads", async (e, params, token) => {
        let stream = getClient().RemoveDuplicatePayloads(params)
        handlerHelper.registerHandler(win, stream, streamRemoveDuplicateMap, token)
    })

    // 转换为数据库保存
    const streamGroupToDatabaseMap = new Map()
    ipcMain.handle("cancel-CoverPayloadGroupToDatabase", handlerHelper.cancelHandler(streamGroupToDatabaseMap))
    ipcMain.handle("CoverPayloadGroupToDatabase", async (e, params, token) => {
        let stream = getClient().CoverPayloadGroupToDatabase(params)
        handlerHelper.registerHandler(win, stream, streamGroupToDatabaseMap, token)
    })

    // 导出txt
    ipcMain.handle("ExportTxtFromPlayloadFile", async (e, params) => {
        const {name, savePath, content} = params
        // 替换为你想要存储文件的文件夹和文件名
        const filePath = path.join(savePath, `${name}.txt`)
        console.log("filePath---", filePath)
        // 创建文件并向其中追加内容
        fs.appendFile(filePath, `${content}\r\n`, (err) => {
            if (err) {
                console.error("Error creating file:", err)
                return
            }
        })
    })

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
    // 备份到其他字典/修改table项
    ipcMain.handle("UpdatePayload", async (e, params) => {
        return await asyncUpdatePayload(params)
    })

    const asyncBackUpOrCopyPayloads = (params) => {
        return new Promise((resolve, reject) => {
            getClient().BackUpOrCopyPayloads(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 移动/复制到其他字典
    ipcMain.handle("BackUpOrCopyPayloads", async (e, params) => {
        return await asyncBackUpOrCopyPayloads(params)
    })

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
    // 获取Payload列表
    ipcMain.handle("GetAllPayloadGroup", async (e, params) => {
        return await asyncGetAllPayloadGroup(params)
    })

    const asyncUpdatePayloadToFile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdatePayloadToFile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 更新文件内容
    ipcMain.handle("UpdatePayloadToFile", async (e, params) => {
        return await asyncUpdatePayloadToFile(params)
    })

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
    // 用于导出
    ipcMain.handle("GetAllPayload", async (e, params) => {
        return await asyncGetAllPayload(params)
    })
}
