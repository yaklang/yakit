const {ipcMain} = require("electron")
const {renderLogOutputFile} = require("../logFile")

// 类型：Map<string, string[]>
const logs = new Map()
// 日志限制
const limit = 10

/**
 * 将日志条目添加到指定 name 的日志列表中，并控制最大长度
 * @param {string} name - 日志名（函数名或模块名）
 * @param {string} log - 已经格式化好的日志字符串
 */
function pushLog(name, log) {
    if (!logs.has(name)) logs.set(name, [])
    const logList = logs.get(name)
    logList.push(log)
    if (logList.length > limit) logList.shift()
}

/**
 * 添加一条简单独立日志
 * @param {Object} param
 * @param {string} param.name - 日志名（函数名或模块名）
 * @param {string} param.title - 日志标题
 * @param {string} param.content - 日志内容
 * @param {string} [param.time] - 时间字符串，默认当前时间
 * @param {boolean} [param.withNewLine=true] - 是否在日志末尾加换行
 * @returns {string} 返回格式化后的日志字符串
 */
function simpleLog({name, title, content, time = new Date().toLocaleString(), withNewLine = true}) {
    const log = `\n[${time}] ${title}: ${content}${withNewLine ? "\n" : ""}`
    pushLog(name, log)
    return log
}

/**
 * 添加函数块日志（支持 start / end / 普通 log 聚合）
 * @param {Object} param
 * @param {string} param.name - 日志名（函数名或模块名）
 * @param {string} param.title - 日志标题
 * @param {string} param.content - 日志内容
 * @param {string} [param.time] - 时间字符串，默认当前时间
 * @param {'start'|'end'} [param.status] - 日志状态：start / end，默认普通日志
 */
function addLog({name, title, content, time = new Date().toLocaleString(), status}) {
    if (!logs.has(name)) logs.set(name, [])
    const logList = logs.get(name)
    const logLine = `[${time}] ${title}: ${content}`
    const lastIndex = logList.length - 1
    if (status === "start" || lastIndex < 0) {
        // 新的日志块
        pushLog(name, logLine)
    } else {
        // 聚合到最后一个日志块
        logList[lastIndex] += `\n${logLine}`
        if (status === "end") {
            logList[lastIndex] += "\n"
        }
    }
}

/**
 * 获取指定日志名的最近日志条目
 * @param {string} name - 日志名
 * @param {number} [count=10] - 获取最近多少条日志
 * @returns {string[]} 日志数组
 */
function getLastLogs(name, count = 10) {
    const logList = logs.get(name) || []
    return logList.slice(-count)
}

/**
 * 清空指定日志名的日志
 * @param {string} name - 日志名
 */
function clearLogs(name) {
    logs.delete(name)
}

function sortLogs(list) {
    return list.slice().sort((a, b) => {
        const timeA = new Date(a.slice(1, 20)).getTime()
        const timeB = new Date(b.slice(1, 20)).getTime()
        return timeA - timeB
    })
}

/**
 * 保存日志到文件
 * @param {string} [name] - 可选，指定日志名；不传则保存全部
 */
function saveLogs(name) {
    if (name) {
        const logList = logs.get(name)
        if (logList && logList.length) {
            const sortedLogs = sortLogs(logList)
            renderLogOutputFile(sortedLogs.join("\n"))
            clearLogs(name)
        }
    } else {
        // 遍历 Map 保存全部
        logs.forEach((logList) => {
            if (logList.length) {
                const sortedLogs = sortLogs(logList)
                renderLogOutputFile(`${sortedLogs.join("\n")}\n`)
            }
        })
        clearLogs()
    }
}

module.exports = {
    logs,
    saveLogs,
    getLastLogs,
    register: () => {
        ipcMain.handle("add-log", (_, params) => {
            addLog(params)
        })
        ipcMain.handle("add-simple-log", (_, params) => {
            simpleLog(params)
        })
    }
}
