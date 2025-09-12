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
}
