import {ipcEventPre} from "./ipcEventPre"

const {ipcRenderer} = window.require("electron")

/** 打开引擎日志文件所在文件夹 */
export const grpcOpenEngineLogFolder = () => {
    ipcRenderer.invoke(ipcEventPre + "open-engine-log")
}

/** 打开渲染端错误收集日志文件所在文件夹 */
export const grpcOpenRenderLogFolder = () => {
    ipcRenderer.invoke(ipcEventPre + "open-render-log")
}

/** 打开主动输出信息的日志文件所在文件夹 */
export const grpcOpenPrintLogFolder = () => {
    ipcRenderer.invoke(ipcEventPre + "open-print-log")
}

/** 主动输出信息到信息日志的方法 */
export const debugToPrintLog = (msg: any) => {
    try {
        ipcRenderer.invoke(ipcEventPre + "debug-print-log", `${msg || ""}`)
    } catch (error) {}
}
