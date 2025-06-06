const path = require("path")
const fs = require("fs")
const {engineLog, renderLog} = require("./filePath")
const {shell} = require("electron")

/** 生成时间字符 (YYYYMMDDHHMMSS) */
const getFormattedDateTime = () => {
    const date = new Date()

    // 提取各时间单位（注意月份要 +1）
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0") // 补零到两位
    const day = date.getDate().toString().padStart(2, "0")
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")

    // 拼接成 YYYYMMDDHHMMSS
    return `${year}${month}${day}${hours}${minutes}${seconds}`
}

// #region 引擎日志
/** 引擎日志文件句柄 */
let engineLogFile = null

/** 打开引擎日志文件，并获取文件句柄 */
const fetchEngineLogFile = () => {
    const engineLogPath = path.join(engineLog, `engine-log-${getFormattedDateTime()}.txt`)
    fs.open(engineLogPath, "a", (err, fd) => {
        if (err) {
            console.error("打开引擎日志错误: ", err)
            return
        } else {
            engineLogFile = fd
            fs.write(engineLogFile, `---------- 开始记录引擎相关日志 ----------\n`, (err) => {})
        }
    })
}

/** 关闭引擎日志文件 */
const closeEngineLogFile = () => {
    if (engineLogFile) {
        fs.close(engineLogFile, (err) => {
            if (err) {
                console.error("关闭引擎日志错误: ", err)
            }
        })
        engineLogFile = null
    }
}

/** 引擎日志-往文件里输出信息 */
const engineLogOutputFile = (message) => {
    if (engineLogFile) {
        fs.write(engineLogFile, `${message}\n`, (err) => {
            if (err) {
                console.error("写入引擎日志错误: ", err)
            }
        })
    }
}

/**
 * 引擎日志-往UI里输出信息
 * @param {Boolean} isTitle 是否带标题([IFNO] ...)
 */
const engineLogOutputUI = (win, message, isTitle) => {
    const channle = !!isTitle ? "live-engine-log" : "live-engine-stdio"
    try {
        if (win) {
            win.webContents.send(channle, `${message}\n`)
        }
    } catch (error) {
        console.log("engineLogOutputUI", error)
    }
}

/**
 * 引擎日志-往UI和文件里输出信息
 * @param {Boolean} isTitle 是否带标题([IFNO] ...)
 */
const engineLogOutputFileAndUI = (win, message, isTitle) => {
    engineLogOutputFile(message)
    engineLogOutputUI(win, message, isTitle)
}

/** 打开渲染端错误信息日志文件所在文件夹 */
const openEngineLogFilePath = () => {
    shell.openPath(engineLog)
    return
}
// #endregion

// #region 渲染端日志
/** 渲染端日志文件句柄 */
let renderLogFile = null

/** 打开渲染端日志文件，并获取文件句柄 */
const fetchRenderLogFile = () => {
    const renderLogPath = path.join(renderLog, `render-log-${getFormattedDateTime()}.txt`)
    fs.open(renderLogPath, "a", (err, fd) => {
        if (err) {
            console.error("打开渲染端日志错误: ", err)
            return
        } else {
            renderLogFile = fd
            fs.write(renderLogFile, `---------- 开始记录渲染端相关日志 ----------\n`, (err) => {})
        }
    })
}

/** 关闭渲染端日志文件 */
const closeRenderLogFile = () => {
    if (renderLogFile) {
        fs.close(renderLogFile, (err) => {
            if (err) {
                console.error("关闭渲染端日志错误: ", err)
            }
        })
        renderLogFile = null
    }
}

/** 渲染端日志-往文件里输出信息 */
const renderLogOutputFile = (message) => {
    if (renderLogFile) {
        fs.write(renderLogFile, `${message}\n`, (err) => {
            if (err) {
                console.error("写入渲染端日志错误: ", err)
            }
        })
    }
}

/** 打开渲染端错误信息日志文件所在文件夹 */
const openRenderLogFilePath = () => {
    shell.openPath(renderLog)
    return
}
// #endregion

module.exports = {
    getFormattedDateTime,
    engineLogFile,
    fetchEngineLogFile,
    closeEngineLogFile,
    engineLogOutputFile,
    engineLogOutputUI,
    engineLogOutputFileAndUI,
    openEngineLogFilePath,

    renderLogFile,
    fetchRenderLogFile,
    closeRenderLogFile,
    renderLogOutputFile,
    openRenderLogFilePath
}
