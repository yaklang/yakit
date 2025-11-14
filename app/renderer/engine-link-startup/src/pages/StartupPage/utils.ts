import {Architecture, DownloadingState, System, SystemInfoProps, YaklangEngineMode} from "./types"
import {ipcEventPre} from "@/utils/ipcEventPre"
const {ipcRenderer} = window.require("electron")

/**
 * 根据引擎运行模式（YaklangEngineMode）返回对应的中文描述。
 *
 * @param {YaklangEngineMode} m - 引擎模式，可为 "local" 或 "remote"。
 * @returns {string} 返回模式的中文名称：
 * - `"local"` → `"本地模式"`
 * - `"remote"` → `"远程模式"`
 * - 其他值 → `"未知模式"`
 */
export const EngineModeVerbose = (m: YaklangEngineMode): string => {
    switch (m) {
        case "local":
            return "本地模式"
        case "remote":
            return "远程模式"
        default:
            return "未知模式"
    }
}

export const SystemInfo: SystemInfoProps = {
    system: undefined,
    architecture: undefined,
    isDev: undefined,
    mode: undefined
}

export const handleFetchSystemInfo = async () => {
    try {
        SystemInfo.system = await ipcRenderer.invoke(`${ipcEventPre}fetch-system-name`)
    } catch (error) {}
    try {
        SystemInfo.architecture = await ipcRenderer.invoke(`${ipcEventPre}fetch-cpu-arch`)
    } catch (error) {}
    try {
        SystemInfo.isDev = !!(await ipcRenderer.invoke(`${ipcEventPre}is-dev`))
    } catch (error) {}
}

export const handleFetchSystem = async (callback?: (value: System | undefined) => any) => {
    try {
        SystemInfo.system = await ipcRenderer.invoke(`${ipcEventPre}fetch-system-name`)
    } catch (error) {}
    if (callback) callback(SystemInfo.system)
}

export const handleFetchArchitecture = async (callback?: (value: Architecture | undefined) => any) => {
    try {
        SystemInfo.architecture = await ipcRenderer.invoke(`${ipcEventPre}fetch-cpu-arch`)
    } catch (error) {}
    if (callback) callback(SystemInfo.architecture)
}

export const handleFetchIsDev = async (callback?: (value: boolean | undefined) => any) => {
    try {
        SystemInfo.isDev = !!(await ipcRenderer.invoke(`${ipcEventPre}is-dev`))
    } catch (error) {}
    if (callback) callback(SystemInfo.isDev)
}

/** @name 处理进度条数据(防止异常数据) */
export const safeFormatDownloadProcessState = (state: DownloadingState) => {
    try {
        // 使用可选链操作符来安全地访问深层次属性，如果不存在，则默认为0
        const total = state.size?.total || 0
        const transferred = state.size?.transferred || 0
        const elapsed = state.time?.elapsed || 0
        const remaining = state.time?.remaining || 0

        return {
            percent: state.percent || 0,
            size: {total, transferred},
            speed: state.speed || 0,
            time: {elapsed, remaining}
        }
    } catch (e) {
        return {
            percent: 0,
            size: {total: 0, transferred: 0},
            speed: 0,
            time: {elapsed: 0, remaining: 0}
        }
    }
}

export const outputToWelcomeConsole = (msg: any) => {
    ipcRenderer
        .invoke(ipcEventPre + "output-log-to-welcome-console", `${msg}`)
        .then(() => {})
        .catch((e) => {
            console.info(e)
        })
}
