/** 操作系统类型 */
export type YakitSystem = "Linux" | "Darwin" | "Windows_NT"

/** 当前启动yaklang引擎模式 */
export type YaklangEngineMode = "local" | "remote"

/** 下载进度条-时间数据 */
interface DownloadingTime {
    /** 耗时 */
    elapsed: number
    /** 剩余时间 */
    remaining: number
}

/** 下载进度条-包体大小数据 */
interface DownloadingSize {
    total: number
    transferred: number
}

/** 下载 yaklang 和 yakit 进度条数据流 */
export interface DownloadingState {
    time: DownloadingTime
    /** 下载速度 */
    speed: number
    /** 下载进度百分比 */
    percent: number
    size: DownloadingSize
}

/** @name 当前yakit使用状态 */
export type YakitStatusType =
    | "install" // 未安装引擎
    | "checkError" // 引擎权限错误
    | "break" // 主动断开引擎
    | "error" // 引擎连接超时
    | "link" // 引擎连接成功
    | "ready" // 开始尝试连接引擎
    | "control-remote" // 远程控制中(不是远程连接)
    | "control-remote-timeout" // 远程控制连接超时
    | ""
/** @name 引擎其他操作 */
export type EngineOtherOperation = 
    | "changePort"
    | ""

/** @name funcDomain组件-全局setting功能的点击回调事件类型 */
export type YakitSettingCallbackType = "console" | "break" | "changeProject" | "encryptionProject" | "plaintextProject"

/** @name engineWatchDog-处理过程的回调事件 */
export type EngineWatchDogCallbackType = "remote-connect-failed" | "control-remote-connect-failed"
