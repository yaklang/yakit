const {ipcMain} = require("electron")
const fs = require("fs")
const path = require("path")
const {renderLog} = require("./filePath")
const {getNowTime} = require("./toolsFunc")

/** 引擎错误日志 */
const logPath = path.join(renderLog, `render-log-${getNowTime()}.txt`)
let writeStream = fs.createWriteStream(logPath, {flags: "a"})

module.exports = (win, getClient) => {
    /** 渲染端错误信息收集 */
    ipcMain.handle("render-error-log", (e, error) => {
        const content = error || ""
        if (content) {
            writeStream.write(content, (err) => {
                if (err) {
                    console.error("render-error-log-write-error:", err)
                }
            })
        }
    })
}
