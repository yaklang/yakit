const { ipcMain } = require("electron");
const FS = require("fs")

module.exports = (win, getClient) => {
    const asyncFetchFileInfoByPath = (path) => {
        return new Promise((resolve, reject) => {
            try {
                const stats = FS.statSync(path)
                resolve(stats)
            } catch (error) {
                reject(error)
            }
        })
    }
    // 获取通过文件路径获取文件信息
    ipcMain.handle("fetch-file-info-by-path", async (e, path) => {
        return await asyncFetchFileInfoByPath(path)
    })
}
