const {ipcMain} = require("electron")
const fs = require("fs")
const customPath = require("path")
module.exports = {
    register: (win, getClient) => {
        const sorcePath = {
            loginImg: "../../../bins/staticEE/yakit.jpg",
            miniProject:"../../../bins/staticEE/yakitFontEE.jpg",
            project:"../../../bins/staticEE/yakitEE.jpg",
        }

        const asyncGetStaticImgEEByType = (data) => {
            return new Promise((resolve, reject) => {
                try {
                    const {type} = data
                    const path = customPath.join(__dirname, sorcePath[type])
                    const img = fs.readFileSync(path)
                    const base64 = `data:image/jpeg;base64,${img.toString('base64')}`
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
