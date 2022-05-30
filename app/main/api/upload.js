const {httpApi} = require("../httpServer")
const {ipcMain} = require("electron")
const fs = require("fs")
const FormData = require("form-data")

module.exports = (win, getClient) => {
    ipcMain.handle("upload-img", async (event, params) => {
        const {path, type, name} = params
        // 创建数据流
        const readerStream = fs.createReadStream(path)
        const formData = new FormData()
        formData.append("file_name", readerStream)
        formData.append("type", type)
        console.log('formData.getBoundary()',formData.getBoundary());
        return httpApi(
            "post",
            "upload/img",
            formData,
            {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
            false
        )
    })
}
