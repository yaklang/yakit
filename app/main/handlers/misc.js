const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncApplyClassToFacades wrapper
    const asyncApplyClassToFacades = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ApplyClassToFacades(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ApplyClassToFacades", async (e, params) => {
        return await asyncApplyClassToFacades(params)
    })
    // asyncBytesToBase64 wrapper
    const asyncBytesToBase64 = (params) => {
        return new Promise((resolve, reject) => {
            getClient().BytesToBase64(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("BytesToBase64", async (e, params) => {
        return await asyncBytesToBase64(params)
    })

    // asyncGetAllYsoGadgetOptions wrapper
    const asyncGetAllYsoGadgetOptions = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllYsoGadgetOptions(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllYsoGadgetOptions", async (e, params) => {
        return await asyncGetAllYsoGadgetOptions(params)
    })
    // asyncGetAllYsoClassOptions wrapper
    const asyncGetAllYsoClassOptions = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllYsoClassOptions(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllYsoClassOptions", async (e, params) => {
        return await asyncGetAllYsoClassOptions(params)
    })
    // asyncGetAllYsoClassGeneraterOptions wrapper
    const asyncGetAllYsoClassGeneraterOptions = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllYsoClassGeneraterOptions(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllYsoClassGeneraterOptions", async (e, params) => {
        return await asyncGetAllYsoClassGeneraterOptions(params)
    })
    // asyncGenerateYsoCode wrapper
    const asyncGenerateYsoCode = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateYsoCode(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateYsoCode", async (e, params) => {
        return await asyncGenerateYsoCode(params)
    })
    // asyncGenerateYsoBytes wrapper
    const asyncGenerateYsoBytes = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateYsoBytes(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateYsoBytes", async (e, params) => {
        return await asyncGenerateYsoBytes(params)
    })

    // asyncGetAvailableBruteTypes wrapper
    const asyncGetAvailableBruteTypes = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAvailableBruteTypes(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAvailableBruteTypes", async (e, params) => {
        return await asyncGetAvailableBruteTypes(params)
    })

    // asyncGetSystemProxy wrapper
    const asyncGetSystemProxy = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSystemProxy(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSystemProxy", async (e, params) => {
        return await asyncGetSystemProxy(params)
    })

    // asyncSetSystemProxy wrapper
    const asyncSetSystemProxy = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetSystemProxy(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetSystemProxy", async (e, params) => {
        return await asyncSetSystemProxy(params)
    })

    // asyncGetKey wrapper
    const asyncGetKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data.Value)
            })
        })
    }
    ipcMain.handle("GetKey", async (e, params) => {
        return await asyncGetKey(params)
    })

    // asyncSetKey wrapper
    const asyncSetKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetKey", async (e, params) => {
        return await asyncSetKey(params)
    })

    // asyncGetEngineDefaultProxy wrapper
    const asyncGetEngineDefaultProxy = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetEngineDefaultProxy(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetEngineDefaultProxy", async (e, params) => {
        return await asyncGetEngineDefaultProxy(params)
    })

    // asyncSetEngineDefaultProxy wrapper
    const asyncSetEngineDefaultProxy = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetEngineDefaultProxy(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetEngineDefaultProxy", async (e, params) => {
        return await asyncSetEngineDefaultProxy(params)
    })

    // asyncGetAllProcessEnvKey wrapper
    const asyncGetAllProcessEnvKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllProcessEnvKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllProcessEnvKey", async (e, params) => {
        return await asyncGetAllProcessEnvKey(params)
    })

    // asyncSetProcessEnvKey wrapper
    const asyncSetProcessEnvKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetProcessEnvKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetProcessEnvKey", async (e, params) => {
        return await asyncSetProcessEnvKey(params)
    })

    // asyncDelKey wrapper
    const asyncDelKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DelKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DelKey", async (e, params) => {
        return await asyncDelKey(params)
    })
}
