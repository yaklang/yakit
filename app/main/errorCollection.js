const {ipcMain} = require("electron")
const fs = require("fs")
const path = require("path")
const {printLog} = require("./filePath")
const {getNowTime} = require("./toolsFunc")
const {openEngineLogFilePath, openRenderLogFilePath, renderLogOutputFile} = require("./logFile")
const {setLocalCache} = require("./localCache")

/** 无效错误日志-暂时无用 */
const printLogPath = path.join(printLog, `print-log-${getNowTime()}.txt`)
let printWriteStream = fs.createWriteStream(printLogPath, {flags: "a"})

module.exports = (win, getClient) => {
    /** 渲染端崩溃白屏触发标记位(方便下次进入软件后的提示) */
    ipcMain.handle("render-crash-flag", (e) => {
        setLocalCache("render-crash-screen", true)
    })

    /** 打开渲染端错误信息日志文件所在文件夹 */
    ipcMain.handle("open-render-log", (e) => {
        openRenderLogFilePath()
        return
    })

    /** 打开引擎错误信息日志文件所在文件夹 */
    ipcMain.handle("open-engine-log", (e, error) => {
        openEngineLogFilePath()
        return
    })

    /** 渲染端错误信息收集 */
    ipcMain.handle("render-error-log", (e, error) => {
        const content = error || ""
        if (content) renderLogOutputFile(content)
    })

    /** 可疑问题的打印信息收集 */
    ipcMain.handle("print-info-log", (e, info) => {
        if (info) {
            printWriteStream.write(`${info}\n`, (err) => {
                if (err) {
                    console.error("print-error-log-write-error:", err)
                }
            })
        }
    })
}
