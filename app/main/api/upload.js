const {httpApi} = require("../httpServer")
const {ipcMain} = require("electron")
const fs = require("fs")
const FormData = require("form-data")
const {Readable} = require("stream")

module.exports = (win, getClient) => {
    ipcMain.handle("upload-img", async (event, params) => {
        const {path, type} = params
        // 创建数据流
        // console.log('time1',new Date().getHours(),new Date().getMinutes(),new Date().getSeconds());
        const readerStream = fs.createReadStream(path) // 可以像使用同步接口一样使用它。
        console.log('3333',JSON.stringify(readerStream))
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

    ipcMain.handle("yak-install-package", async (event, params) => {
        const {path, size} = params
        // 每块分片大小
        const chunkSize = 30 * 1024 * 1024 // 每个分片的大小，这里设置为30MB
        // 计算分片总数
        const totalChunk = Math.ceil(size / chunkSize)

        for (let chunkIndex = 0; chunkIndex < totalChunk; chunkIndex++) {
            const start = chunkIndex * chunkSize
            const end = Math.min(start + chunkSize, size)
            // 创建当前分片的读取流
            const chunkStream = fs.createReadStream(path,{start,end})
            const formData = new FormData()
            formData.append("file", chunkStream)
            formData.append("index", chunkIndex + 1)
            formData.append("totalChunks", totalChunk)
            // formData.append("hash", totalChunk)
            await httpApi(
                "post",
                "upload/install/package",
                formData,
                {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
                false,
                30 * 60 * 1000
            )
                .then((res) => {
                    win.webContents.send("call-back-upload-yakit-ee", res)
                    console.log("yak-install-package", res, chunkIndex + 1)
                })
                .catch((err) => {
                    console.log("文件上传失败", err)
                })
        }
        console.log("File upload completed.")
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
