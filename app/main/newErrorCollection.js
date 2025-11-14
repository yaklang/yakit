const {ipcMain} = require("electron")
const {
    openEngineLogFolder,
    openRenderLogFolder,
    renderLogOutputFile,
    openPrintLogFolder,
    printLogOutputFile
} = require("./logFile")
const {setLocalCache} = require("./localCache")

module.exports = {
    registerNewIPC: (win, getClient, ipcEventPre) => {
        /** 渲染端崩溃白屏触发标记位(方便下次进入软件后的提示) */
        ipcMain.handle(ipcEventPre + "render-crash-flag", (e) => {
            setLocalCache("render-crash-screen", true)
        })

        /** 渲染端错误信息收集 */
        ipcMain.handle(ipcEventPre + "render-error-log", (e, error) => {
            const content = error || ""
            if (content) renderLogOutputFile(content)
        })

        /** 调试输出信息收集 */
        ipcMain.handle(ipcEventPre + "debug-print-log", (e, error) => {
            const content = `${error || ""}`
            if (content) printLogOutputFile(content)
        })

        /** 打开引擎日志文件所在文件夹 */
        ipcMain.handle(ipcEventPre + "open-engine-log", (e, error) => {
            openEngineLogFolder()
            return
        })

        /** 打开渲染端日志文件所在文件夹 */
        ipcMain.handle(ipcEventPre + "open-render-log", (e) => {
            openRenderLogFolder()
            return
        })
        /** 打开输出信息日志文件所在文件夹 */
        ipcMain.handle(ipcEventPre + "open-print-log", (e, error) => {
            openPrintLogFolder()
            return
        })
    }
}
