const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncYsoDump wrapper
    const asyncYsoDump = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YsoDump(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("YsoDump", async (e, params) => {
        return await asyncYsoDump(params)
    })
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

    // asyncGetProjectKey wrapper
    const asyncGetProjectKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetProjectKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data.Value)
            })
        })
    }
    ipcMain.handle("GetProjectKey", async (e, params) => {
        return await asyncGetProjectKey(params)
    })

    // asyncSetProjectKey wrapper
    const asyncSetProjectKey = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetProjectKey(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetProjectKey", async (e, params) => {
        return await asyncSetProjectKey(params)
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

    // asyncGetMachineID wrapper
    const asyncGetMachineID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetMachineID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetMachineID", async (e, params) => {
        return await asyncGetMachineID(params)
    })

    const asyncGetLicense = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetLicense(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetLicense", async (e, params) => {
        return await asyncGetLicense(params)
    })

    const asyncCheckLicense = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CheckLicense(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CheckLicense", async (e, params) => {
        return await asyncCheckLicense(params)
    })

    // asyncRegisterFacadesHTTP wrapper
    const asyncRegisterFacadesHTTP = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RegisterFacadesHTTP(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RegisterFacadesHTTP", async (e, params) => {
        return await asyncRegisterFacadesHTTP(params)
    })

    // asyncResetAndInvalidUserData wrapper
    const asyncResetAndInvalidUserData = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ResetAndInvalidUserData(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ResetAndInvalidUserData", async (e, params) => {
        return await asyncResetAndInvalidUserData(params)
    })

    /*
    * File Ops
    * */
    // asyncIsPrivilegedForNetRaw wrapper
    const asyncIsPrivilegedForNetRaw = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsPrivilegedForNetRaw(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsPrivilegedForNetRaw", async (e, params) => {
        return await asyncIsPrivilegedForNetRaw(params)
    })

    // asyncPromotePermissionForUserPcap wrapper
    const asyncPromotePermissionForUserPcap = (params) => {
        return new Promise((resolve, reject) => {
            getClient().PromotePermissionForUserPcap(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PromotePermissionForUserPcap", async (e, params) => {
        return await asyncPromotePermissionForUserPcap(params)
    })

    // asyncMigrateLegacyDatabase wrapper
    const asyncMigrateLegacyDatabase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().MigrateLegacyDatabase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("MigrateLegacyDatabase", async (e, params) => {
        return await asyncMigrateLegacyDatabase(params)
    })

    // asyncIsCVEDatabaseReady wrapper
    const asyncIsCVEDatabaseReady = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsCVEDatabaseReady(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsCVEDatabaseReady", async (e, params) => {
        return await asyncIsCVEDatabaseReady(params)
    })

    const handlerHelper = require("./handleStreamWithContext");

    const streamUpdateCVEDatabaseMap = new Map();
    ipcMain.handle("cancel-UpdateCVEDatabase", handlerHelper.cancelHandler(streamUpdateCVEDatabaseMap));
    ipcMain.handle("UpdateCVEDatabase", (e, params, token) => {
        let stream = getClient().UpdateCVEDatabase(params);
        handlerHelper.registerHandler(win, stream, streamUpdateCVEDatabaseMap, token)
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
    // asyncSaveTextToTemporalFile wrapper
    const asyncSaveTextToTemporalFile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveTextToTemporalFile(params, (err, data) => {
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
    ipcMain.handle("SaveTextToTemporalFile", async (e, params) => {
        return await asyncSaveTextToTemporalFile(params)
    })

    // asyncGetRegisteredVulinboxAgent wrapper
    const asyncGetRegisteredVulinboxAgent = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetRegisteredVulinboxAgent(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetRegisteredVulinboxAgent", async (e, params) => {
        return await asyncGetRegisteredVulinboxAgent(params)
    })

    // asyncDisconnectVulinboxAgent wrapper
    const asyncDisconnectVulinboxAgent = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DisconnectVulinboxAgent(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DisconnectVulinboxAgent", async (e, params) => {
        return await asyncDisconnectVulinboxAgent(params)
    })

    // asyncIsVulinboxReady wrapper
    const asyncIsVulinboxReady = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsVulinboxReady(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsVulinboxReady", async (e, params) => {
        return await asyncIsVulinboxReady(params)
    })

    const streamInstallVulinboxMap = new Map();
    ipcMain.handle("cancel-InstallVulinbox", handlerHelper.cancelHandler(streamInstallVulinboxMap));
    ipcMain.handle("InstallVulinbox", (e, params, token) => {
        let stream = getClient().InstallVulinbox(params);
        handlerHelper.registerHandler(win, stream, streamInstallVulinboxMap, token)
    })

    const streamStartVulinboxMap = new Map();
    ipcMain.handle("cancel-StartVulinbox", handlerHelper.cancelHandler(streamStartVulinboxMap));
    ipcMain.handle("StartVulinbox", (e, params, token) => {
        let stream = getClient().StartVulinbox(params);
        handlerHelper.registerHandler(win, stream, streamStartVulinboxMap, token)
    })

    const streamDiagnoseNetworkMap = new Map();
    ipcMain.handle("cancel-DiagnoseNetwork", handlerHelper.cancelHandler(streamDiagnoseNetworkMap));
    ipcMain.handle("DiagnoseNetwork", (e, params, token) => {
        let stream = getClient().DiagnoseNetwork(params);
        handlerHelper.registerHandler(win, stream, streamDiagnoseNetworkMap, token)
    })

    const streamDiagnoseNetworkDNSMap = new Map();
    ipcMain.handle("cancel-DiagnoseNetworkDNS", handlerHelper.cancelHandler(streamDiagnoseNetworkDNSMap));
    ipcMain.handle("DiagnoseNetworkDNS", (e, params, token) => {
        let stream = getClient().DiagnoseNetworkDNS(params);
        handlerHelper.registerHandler(win, stream, streamDiagnoseNetworkDNSMap, token)
    })

    // asyncRequestYakURL wrapper
    const asyncRequestYakURL = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RequestYakURL(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RequestYakURL", async (e, params) => {
        return await asyncRequestYakURL(params)
    })


    const streamDuplexConnectionMap = new Map();
    ipcMain.handle("cancel-DuplexConnection", handlerHelper.cancelHandler(streamDuplexConnectionMap));
    ipcMain.handle("DuplexConnection", (e, params, token) => {
        let stream = streamDuplexConnectionMap.get(token)
        if (stream) {
            stream.write(params)
            return
        }
        stream = getClient().DuplexConnection(params);
        handlerHelper.registerHandler(win, stream, streamDuplexConnectionMap, token)
    })
}
