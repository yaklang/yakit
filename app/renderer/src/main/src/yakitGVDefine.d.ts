/** 操作系统类型 */
export type YakitSystem = "Linux" | "Darwin" | "Windows_NT"

/** 当前启动yaklang引擎模式 */
export type YaklangEngineMode = "local" | "admin" | "remote"

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

/** @name 登录用户信息(暂不使用) */
interface UserInfoProps {
    isLogin: boolean
    platform: string | null
    githubName: string | null
    githubHeadImg: string | null
    wechatName: string | null
    wechatHeadImg: string | null
    qqName: string | null
    qqHeadImg: string | null
    companyName: string | null
    companyHeadImg: string | null
    role: string | null
    user_id: number | null
    token: string
    showStatusSearch?: boolean
}

/** @name 当前yakit使用状态 */
export type YakitStatusType = "link" | "update" | "error" | "install" | "ready" | "database" | "break" | "control-remote" | ""

/** @name funcDomain组件-全局setting功能的点击回调事件类型 */
export type YakitSettingCallbackType =
    | "console"
    | "adminMode"
    | "break"
    | "changeProject"
    | "encryptionProject"
    | "plaintextProject"
