/**
 * TODO: OSS上传,后期需要整合
 * LINK - ./upload.js#split-upload
 */
const {service} = require("../httpServer")
const {ipcMain} = require("electron")
const fs = require("fs")
const customPath = require("path")
const FormData = require("form-data")
const {hashChunk} = require("../toolsFunc")
const axios = require("axios")
const PATH = require("path")

module.exports = (win, getClient) => {
    const streamOSSplitSUpload = new Map()
    // 上传次数缓存
    let ossPostPackageHistory = {}
    // 分片上传 oss版本
    ipcMain.handle("oss-split-upload", (event, params) => {
        return new Promise(async (resolve, reject) => {
            try {
                // path为文件路径 token为切片进度回调 url为接口
                const {url, path, token, filedHash = "", type} = params
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
                const chunkSize = 20 * 1024 * 1024 // 每个分片的大小，这里设置为 20 MB
                // 计算分片总数
                const totalChunks = Math.ceil(size / chunkSize)
                // 计算整个文件Hash
                const fileHash = await hashChunk({path})
                const fileHashTime = `${fileHash}-${Date.now()}`
                // 创建一个新的CancelToken
                const cancelTokenSource = axios.CancelToken.source()
                streamOSSplitSUpload.set(token, cancelTokenSource)
                for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                    try {
                        const hash = await hashChunk({path, size, chunkSize, chunkIndex})
                        let add = chunkIndex === 0 ? 0 : 1
                        const start = chunkIndex * chunkSize + add
                        const end = Math.min((chunkIndex + 1) * chunkSize, size)
                        // 创建当前分片的读取流
                        const chunkStream = fs.createReadStream(path, {start, end})
                        await ossUploadBigFile({
                            url,
                            chunkStream,
                            chunkIndex,
                            totalChunks,
                            fileName,
                            hash,
                            fileHashTime: fileHashTime,
                            filedHash,
                            type,
                            token,
                            cancelToken: cancelTokenSource.token
                        })
                    } catch (error) {
                        win.webContents.send(`oss-split-upload-${token}-error`, error)
                        reject(error)
                        break
                    }
                }
                win.webContents.send(`oss-split-upload-${token}-end`)
                ossPostPackageHistory = {}
                cancelTokenSource && cancelTokenSource.cancel()
                streamOSSplitSUpload.delete(token)
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    })
    // 取消分片上传 oss版本
    ipcMain.handle("cancel-oss-split-upload", (event, token) => {
        return new Promise(async (resolve, reject) => {
            try {
                const stream = streamOSSplitSUpload.get(token)
                stream && stream.cancel()
                streamOSSplitSUpload.delete(token)
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    })
    // 上传到oss
    const ossUploadBigFile = ({
        url,
        chunkStream,
        chunkIndex,
        totalChunks,
        fileName,
        hash,
        fileHashTime,
        filedHash,
        type,
        token,
        cancelToken
    }) => {
        return new Promise((resolve, reject) => {
            ossPostPackageHistory[hash] ? (ossPostPackageHistory[hash] += 1) : (ossPostPackageHistory[hash] = 1)
            const percent = (chunkIndex + 1) / totalChunks
            const formData = new FormData()
            formData.append("file", chunkStream)
            formData.append("index", chunkIndex)
            formData.append("totalChunks", totalChunks)
            formData.append("hash", fileHashTime)
            formData.append("filedHash", filedHash)
            formData.append("type", type)

            service({
                url,
                method: "post",
                headers: {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
                data: formData,
                timeout: percent === 1 && totalChunks > 3 ? 60 * 1000 * 10 : 60 * 1000,
                cancelToken
            })
                .then(async (res) => {
                    if (res.code === 200) {
                        const progress = Math.floor(percent * 100)
                        win.webContents.send(`oss-split-upload-${token}-data`, {
                            res,
                            progress
                        })
                    }
                    if (res.code !== 200 && ossPostPackageHistory[hash] <= 3) {
                        try {
                            // 传输失败 重传3次
                            await ossUploadBigFile({
                                url,
                                chunkStream,
                                chunkIndex,
                                totalChunks,
                                fileName,
                                hash,
                                fileHashTime,
                                filedHash,
                                type,
                                token,
                                cancelToken
                            })
                        } catch (error) {
                            reject(error)
                        }
                    } else if (ossPostPackageHistory[hash] > 3) {
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
                const response = await axios.head(params)
                const value = {
                    fileName: PATH.basename(params),
                    size: response.headers["content-length"],
                    type: response.headers["content-type"]
                }
                resolve(value)
            } catch (error) {
                reject(error)
            }
        })
    })
}
