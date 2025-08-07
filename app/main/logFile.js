const path = require("path")
const fs = require("fs")
const {engineLog, renderLog, printLog} = require("./filePath")
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

/**
 * @name 判断文件夹里的文件数量，并只保留时间最近的 ${length} 个文件
 * @description 注意，该方法只适合文件夹里全是文件的环境，存在子文件夹则不适用
 * @param {string} folderPath 目标文件夹
 * @param {number} length 保留文件数量
 */
const clearFolder = (folderPath, length) => {
    try {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error(`readdir-${folderPath}-error`, err)
                return
            }

            // 获取文件夹中所有文件的详细信息
            const fileStats = files.map((file) => {
                const filePath = path.join(folderPath, file)
                return {
                    name: file,
                    path: filePath,
                    stats: fs.statSync(filePath)
                }
            })
            // 有信息的文件集合
            const validFiles = fileStats.filter((item) => item.stats.size && item.stats.size > 0)
            // 没信息的文件集合
            const invalidFiles = fileStats.filter((item) => !item.stats.size || item.stats.size <= 0)

            // 按最后修改时间进行排序
            const sortedFiles = validFiles.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())

            // 保留最近的十个文件，删除其他文件
            const filesToDelete = sortedFiles.slice(length).concat([...invalidFiles])
            filesToDelete.forEach((file) => {
                fs.unlink(file.path, (err) => {
                    if (err) {
                        console.error("Error deleting file:", err)
                    }
                })
            })
        })
    } catch (error) {
        console.log("clearFolderLogic-error", error)
    }
}

/** 不同日志对应的文件名和打印输出标识内容 */
const TypeToLogBasicInfo = {
    engine: {fileName: "engine-log", info: "引擎日志"},
    render: {fileName: "render-log", info: "渲染端日志"},
    print: {fileName: "print-log", info: "输出信息日志"}
}

/** 打开文件并获取文件句柄 */
const getLogFileHandle = (folderPath, fileName, info) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(folderPath, `${fileName}-${getFormattedDateTime()}.txt`)
        fs.open(filePath, "a", (err, fd) => {
            if (err) {
                console.error(`打开${info}错误: `, err)
                reject(err)
            } else {
                fs.write(fd, `---------- 开始记录${info} ----------\n`, (err) => {})
                resolve(fd)
            }
        })
    })
}
/** 通过文件句柄写入内容 */
const writeLogFileContent = (fileHandle, content, info) => {
    if (fileHandle) {
        fs.write(fileHandle, `${content}\n`, (err) => {
            if (err) {
                console.error(`写入${info || "日志"}错误: `, err)
            }
        })
    }
}

// #region 引擎日志
/** 引擎日志文件句柄 */
let engineLogHandle = null

/** 打开引擎日志文件，并获取文件句柄 */
const getEngineLogHandle = async () => {
    try {
        const {fileName, info} = TypeToLogBasicInfo.engine || {}
        engineLogHandle = await getLogFileHandle(engineLog, fileName, info)
    } catch (error) {}
}

/** 关闭引擎日志文件 */
const closeEngineLogHandle = () => {
    const {info} = TypeToLogBasicInfo.engine || {}
    writeLogFileContent(engineLogHandle, `---------- 结束日志收集, 关闭中 ----------`, info)
    if (engineLogHandle) {
        fs.close(engineLogHandle, (err) => {
            if (err) {
                console.error(`关闭${info}错误: `, err)
            }
        })
    }
    engineLogHandle = null
}

const engineContent = []
let engineTime = null
/** 引擎日志-往文件里输出信息 */
const engineLogOutputFile = (message) => {
    const {info} = TypeToLogBasicInfo.engine || {}
    engineContent.push(`${message}`)
    if (engineTime) return
    engineTime = setTimeout(() => {
        if (engineContent.length > 0) {
            writeLogFileContent(engineLogHandle, engineContent.join("\n"), info)
            engineContent.length = 0
        }
        engineTime = null
    }, 500)
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

/** 打开引擎日志文件所在文件夹 */
const openEngineLogFolder = () => {
    shell.openPath(engineLog)
    return
}
// #endregion

// #region 渲染端日志
/** 渲染端日志文件句柄 */
let renderLogHandle = null

/** 打开渲染端日志文件，并获取文件句柄 */
const getRenderLogHandle = async () => {
    try {
        const {fileName, info} = TypeToLogBasicInfo.render || {}
        renderLogHandle = await getLogFileHandle(renderLog, fileName, info)
    } catch (error) {}
}

/** 关闭渲染端日志文件 */
const closeRenderLogHandle = () => {
    const {info} = TypeToLogBasicInfo.render || {}
    writeLogFileContent(renderLogHandle, `---------- 结束日志收集, 关闭中 ----------`, info)
    if (renderLogHandle) {
        fs.close(renderLogHandle, (err) => {
            if (err) {
                console.error(`关闭${info}错误: `, err)
            }
        })
    }
    renderLogHandle = null
}

const renderContent = []
let renderTime = null
/** 渲染端日志-往文件里输出信息 */
const renderLogOutputFile = (message) => {
    const {info} = TypeToLogBasicInfo.render || {}
    renderContent.push(`${message}`)
    if (renderTime) return
    renderTime = setTimeout(() => {
        if (renderContent.length > 0) {
            writeLogFileContent(renderLogHandle, renderContent.join("\n"), info)
            renderContent.length = 0
        }
        renderTime = null
    }, 500)
}

/** 打开渲染端日志文件所在文件夹 */
const openRenderLogFolder = () => {
    shell.openPath(renderLog)
    return
}
// #endregion

// #region 主动输出信息日志
/** 信息日志文件句柄 */
let printLogHandle = null

/** 打开输出信息日志文件，并获取文件句柄 */
const getPrintLogHandle = async () => {
    try {
        const {fileName, info} = TypeToLogBasicInfo.print || {}
        printLogHandle = await getLogFileHandle(printLog, fileName, info)
    } catch (error) {}
}

/** 关闭输出信息日志文件 */
const closePrintLogHandle = () => {
    const {info} = TypeToLogBasicInfo.print || {}
    writeLogFileContent(printLogHandle, `---------- 结束日志收集, 关闭中 ----------`, info)
    if (printLogHandle) {
        fs.close(printLogHandle, (err) => {
            if (err) {
                console.error(`关闭${info}错误: `, err)
            }
        })
    }
    printLogHandle = null
}

const printContent = []
let printTime = null
/** 输出信息日志-往文件里输出信息 */
const printLogOutputFile = (message) => {
    const {info} = TypeToLogBasicInfo.print || {}
    printContent.push(`${message}`)
    if (printTime) return
    printTime = setTimeout(() => {
        if (printContent.length > 0) {
            writeLogFileContent(printLogHandle, printContent.join("\n"), info)
            printContent.length = 0
        }
        printTime = null
    }, 500)
}

/** 打开输出信息日志文件所在文件夹 */
const openPrintLogFolder = () => {
    shell.openPath(printLog)
    return
}
// #endregion

/** 获取所有日志文件句柄供本次软件使用 */
const getAllLogHandles = async () => {
    try {
        await Promise.allSettled([getEngineLogHandle(), getRenderLogHandle(), getPrintLogHandle()])
    } catch (error) {}
}
/** 关闭本次软件所有获取到的日志句柄 */
const closeAllLogHandles = () => {
    closeEngineLogHandle()
    closeRenderLogHandle()
    closePrintLogHandle()
}

/** 初始化所有日志文件夹 */
const initAllLogFolders = () => {
    if (fs.existsSync(engineLog)) {
        clearFolder(engineLog, 9)
    } else {
        fs.mkdirSync(engineLog, {recursive: true})
    }
    if (fs.existsSync(renderLog)) {
        clearFolder(renderLog, 9)
    } else {
        fs.mkdirSync(renderLog, {recursive: true})
    }
    if (fs.existsSync(printLog)) {
        clearFolder(printLog, 9)
    } else {
        fs.mkdirSync(printLog, {recursive: true})
    }
}

module.exports = {
    getFormattedDateTime,

    engineLogHandle,
    getEngineLogHandle,
    closeEngineLogHandle,
    engineLogOutputFile,
    engineLogOutputUI,
    engineLogOutputFileAndUI,
    openEngineLogFolder,

    renderLogHandle,
    getRenderLogHandle,
    closeRenderLogHandle,
    renderLogOutputFile,
    openRenderLogFolder,

    printLogHandle,
    getPrintLogHandle,
    closePrintLogHandle,
    printLogOutputFile,
    openPrintLogFolder,

    getAllLogHandles,
    closeAllLogHandles,

    initAllLogFolders
}
