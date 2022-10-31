const {ipcMain, shell, clipboard} = require("electron")
const URL = require("url")

module.exports = (win, getClient) => {
    /**
     * @name 判断传入字符串是否为一个正常的URL
     * @param {String} value
     * @returns {Boolean}
     */
    const judgeUrl = (value) => {
        return URL.parse(value, true).protocol === "http:" || URL.parse(value, true).protocol === "https:"
    }
    /**
     * @name 打开外部链接
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
}
