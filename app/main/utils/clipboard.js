const {ipcMain, clipboard} = require("electron")

module.exports = {
    register: (win, getClient) => {
        // 检测剪切板里是否有图片
        ipcMain.handle("check-clipboard-image", (e) => {
            const image = clipboard.readImage()
            return !image.isEmpty()
        })

        // 获取剪切板图片基本信息
        ipcMain.handle("get-clipboard-image", (e) => {
            const image = clipboard.readImage()
            return {size: image.getSize(), blob: image.toDataURL()}
        })

        // 设置剪切板文本信息
        ipcMain.handle("set-clipboard-text", (e, text) => {
            clipboard.writeText(text)
            return
        })
        // 获取剪切板文本信息
        ipcMain.handle("get-clipboard-text", (e) => {
            return clipboard.readText()
        })
    }
}
