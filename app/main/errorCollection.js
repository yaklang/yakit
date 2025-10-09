const {ipcMain} = require("electron")
const {
    openEngineLogFolder,
    openRenderLogFolder,
    renderLogOutputFile,
    openPrintLogFolder,
    printLogOutputFile
} = require("./logFile")
const {setLocalCache} = require("./localCache")

module.exports = (win, getClient) => {
    /** 渲染端崩溃白屏触发标记位(方便下次进入软件后的提示) */
    ipcMain.handle("render-crash-flag", (e) => {
        setLocalCache("render-crash-screen", true)
    })

    /** 打开引擎日志文件所在文件夹 */
    ipcMain.handle("open-engine-log", (e, error) => {
        openEngineLogFolder()
        return
    })
    /** 打开渲染端日志文件所在文件夹 */
    ipcMain.handle("open-render-log", (e) => {
        openRenderLogFolder()
        return
    })
    /** 打开输出信息日志文件所在文件夹 */
    ipcMain.handle("open-print-log", (e, error) => {
        openPrintLogFolder()
        return
    })

    /** 渲染端错误信息收集 */
    ipcMain.handle("render-error-log", (e, error) => {
        const content = error || ""
        if (content) renderLogOutputFile(content)
    })
    /** 调试输出信息收集 */
    ipcMain.handle("debug-print-log", (e, error) => {
        const content = `${error || ""}`
        if (content) printLogOutputFile(content)
    })
}
