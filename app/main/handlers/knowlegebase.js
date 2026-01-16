const {ipcMain} = require("electron")
const fs = require("fs")
const path = require("path")
const {YakitProjectPath} = require("../filePath")
const os = require("os")
const {getAvailableOSSDomain} = require("./utils/network")
const {requestWithProgress} = require("./utils/requestWithProgress")
const crypto = require("crypto")
const https = require("https")

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

    async function asyncDownloadLatestOnlineRag(ragItem) {
        const {file, hash, hashfile, hashtype = "sha256"} = ragItem

        return new Promise(async (resolve, reject) => {
            try {
                if (!fs.existsSync(yakOnlineRagLatestDir)) {
                    fs.mkdirSync(yakOnlineRagLatestDir, {recursive: true})
                }

                const downloadUrl = await getOnlineRagDownloadUrl(file)
                const dest = path.join(yakOnlineRagLatestDir, path.basename(file))

                try {
                    fs.unlinkSync(dest)
                } catch {}

                requestWithProgress(
                    downloadUrl,
                    dest,
                    {},
                    async (state) => {
                        win?.webContents.send("download-online-rag-progress", state)
                    },
                    async () => {
                        let expectedHash = hash

                        if (!expectedHash && hashfile) {
                            expectedHash = await downloadHashFile(hashfile)
                        }

                        if (expectedHash) {
                            const actualHash = await calcFileHash(dest, hashtype)
                            if (actualHash !== expectedHash) {
                                try {
                                    fs.unlinkSync(dest)
                                } catch {}
                                throw new Error(`hash mismatch: expected=${expectedHash}, actual=${actualHash}`)
                            }
                        }

                        // 覆盖写入逻辑：同一知识库（file 相同）或同一 hash，均只保留一条
                        const prev = readPreviousOnlineRag()
                        // 统一覆盖规则：
                        // 1. 同一知识库（file 相同） → 覆盖
                        // 2. 同一 hash → 覆盖
                        const filtered = prev.filter((it) => {
                            if (it.file === file) return false
                            if (it.hash === expectedHash) return false
                            return true
                        })

                        filtered.push({
                            name: ragItem.name,
                            name_zh: ragItem.name_zh,
                            version: ragItem.version,
                            file,
                            hash: expectedHash,
                            hashtype,
                            file_address: dest
                        })

                        writePreviousOnlineRag(filtered)

                        resolve(dest)
                    },
                    reject
                )
            } catch (err) {
                reject(err)
            }
        })
    }

    ipcMain.handle("download-latest-online-rag", async (_e, ragItem) => {
        return await asyncDownloadLatestOnlineRag(ragItem)
    })

    ipcMain.handle("read-previous-online-rag", async () => {
        return readPreviousOnlineRag()
    })

    ipcMain.handle("remove-previous-online-rag", async (_e, {hash}) => {
        try {
            const prev = readPreviousOnlineRag()
            const filtered = prev.filter((item) => item.hash !== hash)
            writePreviousOnlineRag(filtered)
            return true
        } catch (err) {
            throw err
        }
    })

    ipcMain.handle("remove-previous-online-rag-by-name", async (_e, {name}) => {
        try {
            if (!name) return false

            const prev = readPreviousOnlineRag()

            const filtered = prev.filter((item) => item.name !== name)

            writePreviousOnlineRag(filtered)

            return true
        } catch (err) {
            throw err
        }
    })
}

// 失败清理相关 IPC handler
// 删除本地文件
ipcMain.handle("delete-local-file", async (e, filePath) => {
    try {
        if (!filePath || typeof filePath !== "string") {
            throw new Error("Invalid file path")
        }
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
        return true
    } catch (err) {
        throw err
    }
})

// 统一路径定义
const yakOnlineRagLatestDir = path.join(YakitProjectPath, "projects", "libs", "rag_files")
const previousOnlineRagFile = path.join(yakOnlineRagLatestDir, "previous-online-rag.json")

const getOnlineRagDownloadUrl = async (filePath) => {
    const domain = await getAvailableOSSDomain()
    return `https://${domain}${filePath}`
}

const calcFileHash = (filePath, hashType = "sha256") => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(hashType)
        const stream = fs.createReadStream(filePath)

        stream.on("data", (data) => hash.update(data))
        stream.on("end", () => resolve(hash.digest("hex")))
        stream.on("error", reject)
    })
}

const downloadHashFile = async (hashFilePath) => {
    const domain = await getAvailableOSSDomain()
    const url = `https://${domain}${hashFilePath}`

    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                let data = ""
                res.on("data", (chunk) => (data += chunk))
                res.on("end", () => {
                    const hash = data.trim().split(/\s+/)[0]
                    resolve(hash)
                })
            })
            .on("error", reject)
    })
}

const readPreviousOnlineRag = () => {
    try {
        if (!fs.existsSync(previousOnlineRagFile)) return []
        const content = fs.readFileSync(previousOnlineRagFile, "utf8")
        return JSON.parse(content)
    } catch {
        return []
    }
}

const writePreviousOnlineRag = (list) => {
    if (!fs.existsSync(yakOnlineRagLatestDir)) {
        fs.mkdirSync(yakOnlineRagLatestDir, {recursive: true})
    }
    fs.writeFileSync(previousOnlineRagFile, JSON.stringify(list, null, 2), "utf8")
}
