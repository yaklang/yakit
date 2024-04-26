const {ipcMain} = require("electron")
const fs = require("fs")
const path = require("path")
const {renderLog, printLog} = require("./filePath")
const {getNowTime} = require("./toolsFunc")

/** 引擎错误日志 */
const renderLogPath = path.join(renderLog, `render-log-${getNowTime()}.txt`)
let renderWriteStream = fs.createWriteStream(renderLogPath, {flags: "a"})

/** 引擎错误日志 */
const printLogPath = path.join(printLog, `print-log-${getNowTime()}.txt`)
let printWriteStream = fs.createWriteStream(printLogPath, {flags: "a"})

module.exports = (win, getClient) => {
    /** 渲染端错误信息收集 */
    ipcMain.handle("render-error-log", (e, error) => {
        const content = error || ""
        if (content) {
            renderWriteStream.write(`${content}\n`, (err) => {
                if (err) {
                    console.error("render-error-log-write-error:", err)
                }
            })
        }
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
