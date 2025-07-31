const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
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
}
