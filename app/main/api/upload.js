const {service, httpApi} = require("../httpServer")
const {ipcMain} = require("electron")
const fs = require("fs")
const customPath = require("path")
const FormData = require("form-data")
const {Readable} = require("stream")
const {hashChunk} = require("../toolsFunc")

module.exports = (win, getClient) => {
    ipcMain.handle("upload-group-data", async (event, params) => {
        const {path} = params
        // 创建数据流
        try {
            const readerStream = fs.createReadStream(path) // 可以像使用同步接口一样使用它。
            const formData = new FormData()
            formData.append("file", readerStream)
            const headers = {
                "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`
            }
            const res = httpApi("post", "update/plugins/group", formData, headers, false)
            return res
        } catch (error) {
            throw error
        }
    })

    ipcMain.handle("get-template-file", async (event, args) => {
        const filePath = customPath.join(__dirname, "../../assets/导入模板.xlsx")
        const fileData = fs.readFileSync(filePath)
        return fileData.toString("base64")
    })

    const postProject = ({url, chunkStream, chunkIndex, totalChunks, fileName, hash, fileHash, type, token}) => {
        return new Promise((resolve, reject) => {
            const percent = (chunkIndex + 1) / totalChunks
            const formData = new FormData()
            formData.append("file", chunkStream)
            formData.append("index", chunkIndex)
            formData.append("totalChunks", totalChunks)
            formData.append("hash", fileHash)
            formData.append("fileName", fileName)
            formData.append("type", type)
            // console.log("参数---", fileName, fileHash)
            httpApi(
                "post",
                url,
                formData,
                {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
                false,
                percent === 1 && totalChunks > 3 ? 60 * 1000 * 10 : 60 * 1000,
                {
                    retryCount: 3
                }
            )
                .then(async (res) => {
                    const progress = Math.floor(percent * 100)
                    win.webContents.send(`callback-split-upload-${token}`, {
                        res,
                        progress
                    })
                    if (res.code !== 200) {
                        let data = `未知错误`
                        if (res?.data?.reason) {
                            data = `code ${res.code}: ${res.data.reason.toString()}`
                        } else if (res?.data) {
                            data = `code ${res.code}: ${res.data.toString()}`
                        } else if (res) {
                            data = `code ${res.code}: ${res.toString()}`
                        }
                        reject(data)
                        return
                    }
                    resolve()
                })
                .catch((err) => {
                    reject(`重传三次失败：${err}`)
                })
        })
    }

    const postProjectFail = ({fileName, hash, fileIndex, type}) => {
        service({
            url: "import/project/fail",
            method: "post",
            data: {
                fileName,
                hash,
                fileIndex,
                type
            }
        }).then((res) => {
            // console.log("rrrr---", res)
        })
    }

    // 上传状态
    let TaskStatus = true
    // 分片上传
    ipcMain.handle("split-upload", (event, params) => {
        return new Promise(async (resolve, reject) => {
            // console.log("params---",params);
            // path为文件路径 token为切片进度回调 url为接口
            const {url, path, token, type = ""} = params
            if (!type) {
                reject("type必传")
                return
            }
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
            const chunkSize = 60 * 1024 * 1024 // 每个分片的大小，这里设置为60MB
            // 计算分片总数
            const totalChunks = Math.ceil(size / chunkSize)
            // 计算整个文件Hash
            const fileHash = await hashChunk({path})
            const fileHashTime = `${fileHash}-${Date.now()}`
            TaskStatus = true
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                if (TaskStatus) {
                    try {
                        const hash = await hashChunk({path, size, chunkSize, chunkIndex})
                        let add = chunkIndex === 0 ? 0 : 1
                        const start = chunkIndex * chunkSize + add
                        const end = Math.min((chunkIndex + 1) * chunkSize, size)
                        // 创建当前分片的读取流
                        const chunkStream = fs.createReadStream(path, {start, end})
                        await postProject({
                            url,
                            chunkStream,
                            chunkIndex,
                            totalChunks,
                            fileName,
                            hash,
                            fileHash: fileHashTime,
                            type,
                            token
                        })
                    } catch (error) {
                        postProjectFail({
                            fileName,
                            hash: fileHashTime,
                            fileIndex: chunkIndex,
                            type
                        })
                        reject(error)
                        TaskStatus = false
                    }
                }
            }
            resolve(TaskStatus)
        })
    })
    ipcMain.handle("cancle-split-upload", (event, params) => {
        return new Promise(async (resolve, reject) => {
            TaskStatus = false
            resolve()
        })
    })

    // http-上传图片-通过路径上传
    ipcMain.handle("http-upload-img-path", async (event, params) => {
        const {path} = params
        // 创建数据流,可以像使用同步接口一样使用它
        const readerStream = fs.createReadStream(path) // 。

        const formData = new FormData()
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (key !== "path") {
                    formData.append(key, value || undefined)
                }
            })
        }
        formData.append("file_name", readerStream)
        const res = httpApi(
            "post",
            "upload/img",
            formData,
            {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
            false,
            undefined,
            {cancelInterrupt: true}
        )
        return res
    })
    // http-上传图片-通过base64上传
    ipcMain.handle("http-upload-img-base64", async (event, params) => {
        const {base64, imgInfo, type} = params

        // 去掉 Base64 字符串前缀
        const data = base64.replace(/^data:image\/\w+;base64,/, "")
        // 将 Base64 转换为二进制 Buffer
        const binaryData = Buffer.from(data, "base64")
        const readable = new Readable()
        readable._read = () => {}
        readable.push(binaryData)
        readable.push(null)

        const formData = new FormData()
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (key !== "base64" && key !== "imgInfo") {
                    formData.append(key, value || undefined)
                }
            })
        }
        formData.append("file_name", readable, {...imgInfo})
        const res = await httpApi(
            "post",
            "upload/img",
            formData,
            {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
            false,
            undefined,
            {cancelInterrupt: true}
        )

        return res
    })

    // http-上传文件-5MB以下
    ipcMain.handle("http-upload-file", async (event, params) => {
        const {path, name} = params
        // 创建数据流
        try {
            const readerStream = fs.createReadStream(path)

            const formData = new FormData()
            formData.append("file", readerStream)
            formData.append("fileName", name)
            const headers = {
                "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`
            }
            const res = httpApi("post", "upload/file", formData, headers, false, undefined, {cancelInterrupt: true})
            return res
        } catch (error) {
            throw error
        }
    })
}
