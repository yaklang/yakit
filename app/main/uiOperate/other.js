const {ipcMain, shell, clipboard} = require("electron")
const URL = require("url")
const Path = require("path")
const Fs = require("fs")

module.exports = (win) => {
    /**
     * @name 判断传入字符串是否为一个正常的URL
     * @param {String} value
     * @returns {Boolean}
     */
    const judgeUrl = (value) => {
        return URL.parse(value, true).protocol === "http:" || URL.parse(value, true).protocol === "https:"
    }
    /**
     * 打开外部链接
     * @description 需要渲染进程传入的url自带http或https协议头字符串
     */
    ipcMain.handle("open-url", (e, url) => {
        const flag = judgeUrl(url)
        if (flag) shell.openExternal(url)
    })

    // 将渲染进程传入内容复制进系统剪切板内
    ipcMain.handle("set-copy-clipboard", (e, text) => {
        clipboard.writeText(text)
    })
    /** 将剪贴板中的内容传递进渲染进程 */
    ipcMain.handle("get-copy-clipboard", (e, text) => {
        return clipboard.readText()
    })

    // 将绝对路径里的文件名(不带文件后缀)提取出来
    ipcMain.handle("fetch-path-file-name", (e, path) => {
        const extension = Path.extname(path)
        return Path.basename(path, extension)
    })

    /** 判断目标路径文件是否存在 */
    ipcMain.handle("is-file-exists", (e, path) => {
        return Fs.existsSync(path)
    })
}
