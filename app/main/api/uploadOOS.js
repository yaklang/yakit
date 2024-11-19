/**
 * TODO: OOS上传,后期需要整合
 * LINK - ./upload.js#split-upload
 */
const { service, } = require("../httpServer")
const { ipcMain } = require("electron")
const fs = require("fs")
const customPath = require("path")
const FormData = require("form-data")
const { hashChunk } = require("../toolsFunc")
const axios = require("axios")
const PATH = require("path")

module.exports = (win, getClient) => {
    const streamOOSplitSUpload = new Map()
    // 上传次数缓存
    let oosPostPackageHistory = {}
    // 分片上传 oos版本
    ipcMain.handle("oos-split-upload", (event, params) => {
        return new Promise(async (resolve, reject) => {
            try {
                // path为文件路径 token为切片进度回调 url为接口
                const { url, path, token } = params
                // 获取文件名
                const fileName = customPath.basename(path)
                // 文件大小（以字节为单位）
                const size = fs.statSync(path).size
                // 5GB 的字节数
                const fiveGBInBytes = 5 * 1024 * 1024 * 1024
                if (size > fiveGBInBytes) {
                    reject("上传大小不可大于5GB")
                    return
                }
                // 每块分片大小
                const chunkSize = 10 * 1024 * 1024 // 每个分片的大小，这里设置为 10 MB
                // 计算分片总数
                const totalChunks = Math.ceil(size / chunkSize)
                // 计算整个文件Hash
                const fileHash = await hashChunk({ path })
                const fileHashTime = `${fileHash}-${Date.now()}`
                // 创建一个新的CancelToken
                const cancelTokenSource = axios.CancelToken.source()
                streamOOSplitSUpload.set(token, cancelTokenSource)
                for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                    try {
                        const hash = await hashChunk({ path, size, chunkSize, chunkIndex })
                        let add = chunkIndex === 0 ? 0 : 1
                        const start = chunkIndex * chunkSize + add
                        const end = Math.min((chunkIndex + 1) * chunkSize, size)
                        // 创建当前分片的读取流
                        const chunkStream = fs.createReadStream(path, { start, end })
                        await oosUploadBigFile({
                            url,
                            chunkStream,
                            chunkIndex,
                            totalChunks,
                            fileName,
                            hash,
                            fileHash: fileHashTime,
                            token,
                            cancelToken: cancelTokenSource.token
                        })
                    } catch (error) {
                        win.webContents.send(`oos-split-upload-${token}-error`, error)
                        reject(error)
                    }
                }
                win.webContents.send(`oos-split-upload-${token}-end`)
                oosPostPackageHistory = {}
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    })
    // 取消分片上传 oos版本
    ipcMain.handle("cancel-oos-split-upload", (event, token) => {
        return new Promise(async (resolve, reject) => {
            try {
                const stream = streamOOSplitSUpload.get(token)
                stream && stream.cancel()
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    })
    // 上传到oos
    const oosUploadBigFile = ({ url, chunkStream, chunkIndex, totalChunks, fileName, hash, fileHash, token, cancelToken }) => {
        return new Promise((resolve, reject) => {
            oosPostPackageHistory[hash] ? (oosPostPackageHistory[hash] += 1) : (oosPostPackageHistory[hash] = 1)
            const percent = (chunkIndex + 1) / totalChunks
            const formData = new FormData()
            formData.append("file", chunkStream)
            formData.append("index", chunkIndex)
            formData.append("totalChunks", totalChunks)
            formData.append("hash", fileHash)

            service({
                url,
                method: 'post',
                headers: { "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}` },
                data: formData,
                timeout: percent === 1 && totalChunks > 3 ? 60 * 1000 * 10 : 60 * 1000,
                cancelToken
            })
                .then(async (res) => {
                    if (res.code === 200) {
                        const progress = Math.floor(percent * 100)
                        win.webContents.send(`oos-split-upload-${token}-data`, {
                            res,
                            progress
                        })
                    }
                    if (res.code !== 200 && oosPostPackageHistory[hash] <= 3) {
                        // 传输失败 重传3次
                        await oosUploadBigFile({ url, chunkStream, chunkIndex, totalChunks, fileName, hash, fileHash, token })
                    } else if (oosPostPackageHistory[hash] > 3) {
                        reject(res.data.reason)
                    }
                    resolve()
                })
                .catch(reject)
        })
    }

    // 获取链接里面得信息
    ipcMain.handle("get-http-file-link-info", (event, params) => {
        return new Promise(async (resolve, reject) => {
            try {
                // 发送 HEAD 请求
                const response = await axios.head(params);
                const value = {
                    fileName: PATH.basename(params),
                    size: response.headers['content-length'],
                    type: response.headers['content-type'],
                }
                resolve(value)
            } catch (error) {
                reject(error)
            }
        })
    })

}