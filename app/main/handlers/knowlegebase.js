const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext")
    // asyncBuildVectorIndexForKnowledgeBase wrapper
    const asyncBuildVectorIndexForKnowledgeBase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().BuildVectorIndexForKnowledgeBase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("BuildVectorIndexForKnowledgeBase", async (e, params) => {
        return await asyncBuildVectorIndexForKnowledgeBase(params)
    })

    // asyncBuildVectorIndexForKnowledgeBaseEntry wrapper
    const asyncBuildVectorIndexForKnowledgeBaseEntry = (params) => {
        return new Promise((resolve, reject) => {
            getClient().BuildVectorIndexForKnowledgeBaseEntry(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("BuildVectorIndexForKnowledgeBaseEntry", async (e, params) => {
        return await asyncBuildVectorIndexForKnowledgeBaseEntry(params)
    })

    // asyncGetKnowledgeBaseNameList wrapper
    const asyncGetKnowledgeBaseNameList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetKnowledgeBaseNameList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("GetKnowledgeBaseNameList", async (e, params) => {
        return await asyncGetKnowledgeBaseNameList(params)
    })

    // asyncCreateKnowledgeBase wrapper
    const asyncCreateKnowledgeBase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateKnowledgeBase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("CreateKnowledgeBase", async (e, params) => {
        return await asyncCreateKnowledgeBase(params)
    })

    // asyncCreateKnowledgeBaseV2 wrapper
    const asyncCreateKnowledgeBaseV2 = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateKnowledgeBaseV2(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("CreateKnowledgeBaseV2", async (e, params) => {
        return await asyncCreateKnowledgeBaseV2(params)
    })

    const asyncGetKnowledgeBaseTypeList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetKnowledgeBaseTypeList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("GetKnowledgeBaseTypeList", async (e, params) => {
        return await asyncGetKnowledgeBaseTypeList(params)
    })

    // asyncUpdateKnowledgeBase wrapper
    const asyncUpdateKnowledgeBase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateKnowledgeBase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("UpdateKnowledgeBase", async (e, params) => {
        return await asyncUpdateKnowledgeBase(params)
    })

    // asyncDeleteKnowledgeBase wrapper
    const asyncDeleteKnowledgeBase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteKnowledgeBase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("DeleteKnowledgeBase", async (e, params) => {
        return await asyncDeleteKnowledgeBase(params)
    })
    // rpc DeleteKnowledgeBaseEntry(DeleteKnowledgeBaseEntryRequest) returns(GeneralResponse);
    // rpc CreateKnowledgeBaseEntry(CreateKnowledgeBaseEntryRequest) returns(GeneralResponse);
    // rpc UpdateKnowledgeBaseEntry(UpdateKnowledgeBaseEntryRequest) returns(GeneralResponse);
    // rpc SearchKnowledgeBaseEntry(SearchKnowledgeBaseEntryRequest) returns(SearchKnowledgeBaseEntryResponse);

    // asyncDeleteKnowledgeBaseEntry wrapper
    const asyncDeleteKnowledgeBaseEntry = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteKnowledgeBaseEntry(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("DeleteKnowledgeBaseEntry", async (e, params) => {
        return await asyncDeleteKnowledgeBaseEntry(params)
    })

    // asyncCreateKnowledgeBaseEntry wrapper
    const asyncCreateKnowledgeBaseEntry = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateKnowledgeBaseEntry(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("CreateKnowledgeBaseEntry", async (e, params) => {
        return await asyncCreateKnowledgeBaseEntry(params)
    })

    // asyncUpdateKnowledgeBaseEntry wrapper
    const asyncUpdateKnowledgeBaseEntry = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateKnowledgeBaseEntry(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("UpdateKnowledgeBaseEntry", async (e, params) => {
        return await asyncUpdateKnowledgeBaseEntry(params)
    })

    // asyncSearchKnowledgeBaseEntry wrapper
    const asyncSearchKnowledgeBaseEntry = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SearchKnowledgeBaseEntry(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("SearchKnowledgeBaseEntry", async (e, params) => {
        return await asyncSearchKnowledgeBaseEntry(params)
    })

    // asyncGetKnowledgeBase wrapper
    const asyncGetKnowledgeBase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetKnowledgeBase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetKnowledgeBase", async (e, params) => {
        return await asyncGetKnowledgeBase(params)
    })

    // asyncGetAllVectorStoreCollectionsWithFilter wrapper
    const asyncGetAllVectorStoreCollectionsWithFilter = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllVectorStoreCollectionsWithFilter(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllVectorStoreCollectionsWithFilter", async (e, params) => {
        return await asyncGetAllVectorStoreCollectionsWithFilter(params)
    })

    // asyncUpdateVectorStoreCollection wrapper
    const asyncUpdateVectorStoreCollection = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateVectorStoreCollection(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateVectorStoreCollection", async (e, params) => {
        return await asyncUpdateVectorStoreCollection(params)
    })

    // asyncListVectorStoreEntries wrapper
    const asyncListVectorStoreEntries = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ListVectorStoreEntries(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ListVectorStoreEntries", async (e, params) => {
        return await asyncListVectorStoreEntries(params)
    })

    // asyncCreateVectorStoreEntry wrapper
    const asyncCreateVectorStoreEntry = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateVectorStoreEntry(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateVectorStoreEntry", async (e, params) => {
        return await asyncCreateVectorStoreEntry(params)
    })

    // asyncGetDocumentByVectorStoreEntryID wrapper
    const asyncGetDocumentByVectorStoreEntryID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetDocumentByVectorStoreEntryID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetDocumentByVectorStoreEntryID", async (e, params) => {
        return await asyncGetDocumentByVectorStoreEntryID(params)
    })

    // 流式接口：QueryKnowledgeBaseByAI
    const streamQueryKnowledgeBaseByAIMap = new Map()
    ipcMain.handle("cancel-QueryKnowledgeBaseByAI", handlerHelper.cancelHandler(streamQueryKnowledgeBaseByAIMap))
    ipcMain.handle("QueryKnowledgeBaseByAI", (e, params, token) => {
        let stream = getClient().QueryKnowledgeBaseByAI(params)
        handlerHelper.registerHandler(win, stream, streamQueryKnowledgeBaseByAIMap, token)
    })

    // 流式接口：ExportKnowledgeBase
    const streamExportKnowledgeBaseMap = new Map()
    ipcMain.handle("cancel-ExportKnowledgeBase", handlerHelper.cancelHandler(streamExportKnowledgeBaseMap))
    ipcMain.handle("ExportKnowledgeBase", (e, params, token) => {
        let stream = getClient().ExportKnowledgeBase(params)
        handlerHelper.registerHandler(win, stream, streamExportKnowledgeBaseMap, token)
    })

    // 流式接口：ImportKnowledgeBase
    const streamImportKnowledgeBaseMap = new Map()
    ipcMain.handle("cancel-ImportKnowledgeBase", handlerHelper.cancelHandler(streamImportKnowledgeBaseMap))
    ipcMain.handle("ImportKnowledgeBase", (e, params, token) => {
        let stream = getClient().ImportKnowledgeBase(params)
        handlerHelper.registerHandler(win, stream, streamImportKnowledgeBaseMap, token)
    })
}
