const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // List Entity Repository
    const asyncListEntityRepository = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ListEntityRepository(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ListEntityRepository", async (e, params) => {
        return await asyncListEntityRepository(params)
    })

    // Query Entity
    const asyncQueryEntity = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryEntity(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryEntity", async (e, params) => {
        return await asyncQueryEntity(params)
    })

    // Query Relationship
    const asyncQueryRelationship = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryRelationship(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryRelationship", async (e, params) => {
        return await asyncQueryRelationship(params)
    })

    // Generate ERM Dot
    const asyncGenerateERMDot = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateERMDot(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateERMDot", async (e, params) => {
        return await asyncGenerateERMDot(params)
    })

    // Generate ERM Dot
    const asyncGenerateERM = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySubERM(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QuerySubERM", async (e, params) => {
        return await asyncGenerateERM(params)
    })

    // CreateEntity
    const asyncCreateEntity = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateEntity(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateEntity", async (e, params) => {
        return await asyncCreateEntity(params)
    })

    // UpdateEntity
    const asyncUpdateEntity = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateEntity(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateEntity", async (e, params) => {
        return await asyncUpdateEntity(params)
    })

    // CreateRelationship
    const asyncCreateRelationship = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateRelationship(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateRelationship", async (e, params) => {
        return await asyncCreateRelationship(params)
    })

    // UpdateRelationship
    const asyncUpdateRelationship = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateUpdateRelationship(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateRelationship", async (e, params) => {
        return await asyncUpdateRelationship(params)
    })

    // DeleteRelationship
    const asyncDeleteRelationship = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteRelationship(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteRelationship", async (e, params) => {
        return await asyncDeleteRelationship(params)
    })
}
