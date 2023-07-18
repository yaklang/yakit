const {httpApi} = require("../httpServer")
const {ipcMain} = require("electron")
const fs = require("fs")
const FormData = require("form-data")
const crypto = require("crypto")

module.exports = (win, getClient) => {
    ipcMain.handle("upload-img", async (event, params) => {
        const {path, type} = params
        // 创建数据流
        // console.log('time1',new Date().getHours(),new Date().getMinutes(),new Date().getSeconds());
        const readerStream = fs.createReadStream(path) // 可以像使用同步接口一样使用它。
        const formData = new FormData()
        formData.append("file_name", readerStream)
        formData.append("type", type)
        const res = httpApi(
            "post",
            "upload/img",
            formData,
            {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
            false
        )
        // res.then(()=>{
        //     console.log('time3',new Date().getHours(),new Date().getMinutes(),new Date().getSeconds());
        // })
        return res
    })

    ipcMain.handle("upload-project", async (event, params) => {
        const {path} = params
        // 创建数据流
        const readerStream = fs.createReadStream(path) // 可以像使用同步接口一样使用它。
        const formData = new FormData()
        formData.append("projectFile", readerStream)
        const res = httpApi(
            "post",
            "import/project",
            formData,
            {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
            false
        )
        return res
    })

    // 计算Hash
    const hashChunk = (path, size, chunkSize, chunkIndex) => {
        return new Promise((resolve, reject) => {
            const start = chunkIndex * chunkSize
            const end = Math.min(start + chunkSize, size)
            // 创建当前分片的读取流
            const chunkStream = fs.createReadStream(path, {start, end})
            // 计算Hash
            const hash = crypto.createHash("sha256")
            chunkStream.on("data", (chunk) => {
                hash.update(chunk)
            })
            chunkStream.on("end", () => {
                // 单独一片的Hash
                const fileChunkHash = hash.digest("hex")
                resolve(fileChunkHash)
            })

            chunkStream.on("error", (err) => {
                reject(err)
            })
        })
    }

    // 上传次数缓存
    let postPackageHistory = {}
    const postPackage = (chunkStream, chunkIndex, totalChunks, hash) => {
        return new Promise((resolve, reject) => {
            postPackageHistory[hash] ? (postPackageHistory[hash] += 1) : (postPackageHistory[hash] = 1)
            const percent = (chunkIndex + 1) / totalChunks
            const formData = new FormData()
            formData.append("file", chunkStream)
            formData.append("index", chunkIndex)
            formData.append("totalChunks", totalChunks)
            formData.append("hash", hash)
            httpApi(
                "post",
                "upload/install/package",
                formData,
                {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
                false,
                percent === 1 ? 60 * 1000 : 30 * 1000
            )
                .then(async (res) => {
                    const progress = Math.floor(percent * 100)
                    win.webContents.send("call-back-upload-yakit-ee", {res, progress: progress === 100 ? 99 : progress})
                    if (res.code !== 200 && postPackageHistory[hash] <= 3) {
                        console.log("重传", postPackageHistory[hash])
                        // 传输失败 重传3次
                        await postPackage(chunkStream, chunkIndex, totalChunks, hash)
                    } else if (postPackageHistory[hash] > 3) {
                        reject("重传三次失败")
                    }
                    resolve()
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    ipcMain.handle("yak-install-package", (event, params) => {
        return new Promise(async (resolve, reject) => {
            const {path, size} = params
            // 每块分片大小
            const chunkSize = 30 * 1024 * 1024 // 每个分片的大小，这里设置为30MB
            // 计算分片总数
            const totalChunks = Math.ceil(size / chunkSize)
            let TaskStatus = true
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                if (TaskStatus) {
                    try {
                        const hash = await hashChunk(path, size, chunkSize, chunkIndex)
                        let add = chunkIndex === 0 ? 0 : 1
                        const start = chunkIndex * chunkSize + add
                        const end = Math.min((chunkIndex + 1) * chunkSize, size)
                        // 创建当前分片的读取流
                        const chunkStream = fs.createReadStream(path, {start, end})
                        await postPackage(chunkStream, chunkIndex, totalChunks, hash)
                    } catch (error) {
                        reject(error)
                        TaskStatus = false
                    }
                }
            }
            postPackageHistory = {}
            resolve()
        })
    })

    ipcMain.handle("get-folder-under-files", async (event, params) => {
        const {folderPath} = params
        if (!folderPath) return 0
        fs.readdir(folderPath, (err, files) => {
            if (err) throw err
            event.sender.send(`send-folder-under-files`, files)
        })
    })
}
