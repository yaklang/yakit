import {formatTimeYMD} from "./timeUtil"

const {ipcRenderer} = window.require("electron")

/** 打开引擎日志文件所在文件夹 */
export const grpcOpenEngineLogFolder = () => {
    ipcRenderer.invoke("open-engine-log")
}

/** 打开渲染端错误收集日志文件所在文件夹 */
export const grpcOpenRenderLogFolder = () => {
    ipcRenderer.invoke("open-render-log")
}

/** 打开主动输出信息的日志文件所在文件夹 */
export const grpcOpenPrintLogFolder = () => {
    ipcRenderer.invoke("open-print-log")
}

/** 主动输出信息到信息日志的方法（后续此方法可被合并至 debugToPrintLogs） */
export const debugToPrintLog = (msg: any) => {
    try {
        ipcRenderer.invoke("debug-print-log", `${msg || ""}`)
    } catch (error) {}
}

export interface DebugLogDetail {
    page?: string
    fun?: string
    title?: string
    status?: "ERRO" | "INFO" | "WARN"
    content: unknown
}

// 将catch (e)中的错误转换为字符串并兼容正常输出
const errorToString = (e): string => {
    if (e?.message) return `${e.message}`
    if (typeof e === "string") return e
    if (e === null) return '[ERRO] null'
    if (e === undefined) return '[ERRO] undefined'
    try {
        return JSON.stringify(e)
    } catch {
        return String(e)
    }
}

/** 主动输出信息到信息日志更加详情的方法 默认为ERRO输出 */
export const debugToPrintLogs = (msg: DebugLogDetail) => {
    try {
        const {page, fun, title="", status="ERRO", content} = msg
        // 日志格式：{页面}[方法]时间 标题: 内容
        let source = ""
        if (page) {
            source += `${page} / `
        }
        if (fun) {
            source += `${fun}`
        }
        const logLine = `[${status}] ${formatTimeYMD(Date.now())} ${source} ${title}=> ${errorToString(content)}`
        ipcRenderer.invoke("debug-print-log", logLine)
    } catch (error) {}
}
