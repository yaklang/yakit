const {ipcMain} = require("electron")
// const axios = require("axios")
const fs = require("fs")
const path = require("path")
const {yakitInstallDir} = require("../filePath")
const {requestWithProgress} = require("../handlers/utils/requestWithProgress")

/**
 * @name 下载文件队列
 * @description 用于存储下载文件的队列
 */
// const downloadUrlToFileMap = new Map()

module.exports = (win, getClient) => {
    /**
     * @param {Object} params
     * @param {string} params.url 下载地址
     * @param {string} params.path 存放路径
     * @param {string} params.token 下载token
     * @param {string} params.fileName 下载文件名
     */
    ipcMain.handle("download-url-to-path", (e, params) => {
        const {url, path: destPath, token, fileName} = params

        let dest = destPath ? path.join(destPath, fileName) : ""
        if (!dest) {
            dest = path.join(yakitInstallDir, fileName)
            if (!fs.existsSync(yakitInstallDir)) fs.mkdirSync(yakitInstallDir, {recursive: true})
        }
        try {
            fs.unlinkSync(dest)
        } catch (e) {}

        return requestWithProgress(url, dest, undefined, (state) => {
            if (!!state) {
                win.webContents.send("download-url-to-path-progress", {state, openPath: dest})
            }
        })
    })
}
