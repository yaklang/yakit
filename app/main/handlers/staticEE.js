const {ipcMain} = require("electron")
const fs = require("fs")
const customPath = require("path")
const {loadExtraFilePath} = require("../filePath")
module.exports = {
    register: (win, getClient) => {
        const sorcePath = {
            loginImg: "staticEE/yakit.jpg",
            miniProject: "staticEE/yakitFontEE.jpg",
            project: "staticEE/yakitEE.jpg"
        }

        const asyncGetStaticImgEEByType = (data) => {
            return new Promise((resolve, reject) => {
                try {
                    const {type} = data
                    let path = loadExtraFilePath(customPath.join("bins", sorcePath[type]))
                    const img = fs.readFileSync(path)
                    const base64 = `data:image/jpeg;base64,${img.toString("base64")}`
                    resolve(base64)
                } catch (error) {
                    reject(error)
                }
            })
        }

        // 通过类型 读取静态资源
        ipcMain.handle("GetStaticImgEEByType", async (e, data) => {
            return await asyncGetStaticImgEEByType(data)
        })
    }
}
