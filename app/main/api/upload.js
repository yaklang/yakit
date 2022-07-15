const {httpApi} = require("../httpServer")
const {ipcMain} = require("electron")
const fs = require("fs")
const FormData = require("form-data")

module.exports = (win, getClient) => {
    ipcMain.handle("upload-img", async (event, params) => {
        const {path, type} = params
        // 创建数据流
        // console.log('time1',new Date().getHours(),new Date().getMinutes(),new Date().getSeconds());
        const readerStream = fs.createReadStream(path)// 可以像使用同步接口一样使用它。
        const formData = new FormData()
        formData.append("file_name", readerStream)
        formData.append("type", type)
        const res=httpApi(
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
}
