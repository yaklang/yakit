const {ipcRenderer} = window.require("electron")

/** 操作系统 */
export type System = "Linux" | "Darwin" | "Windows_NT"
/** CPU架构 */
export type Architecture =
    | "arm"
    | "arm64"
    | "ia32"
    | "mips"
    | "mipsel"
    | "ppc"
    | "ppc64"
    | "riscv64"
    | "s390"
    | "s390x"
    | "x64"

interface SystemInfoProps {
    /** 操作系统 */
    system?: System
    /** 系统架构 */
    architecture?: Architecture
    /** 是否为开发环境 */
    isDev?: boolean
    /** 本地模式 / 远程模式 / 随机密码本地模式 */
    mode?: "local" | "remote" | "secret-local" | undefined
}

export const SystemInfo: SystemInfoProps = {
    system: undefined,
    architecture: undefined,
    isDev: undefined,
    mode: undefined
}

export const handleFetchSystemInfo = async () => {
    try {
        SystemInfo.system = await ipcRenderer.invoke("fetch-system-name")
    } catch (error) {}
    try {
        SystemInfo.architecture = await ipcRenderer.invoke("fetch-cpu-arch")
    } catch (error) {}
    try {
        SystemInfo.isDev = !!(await ipcRenderer.invoke("is-dev"))
    } catch (error) {}
}

export const handleFetchSystem = async (callback?: (value: System | undefined) => any) => {
    try {
        SystemInfo.system = await ipcRenderer.invoke("fetch-system-name")
    } catch (error) {}
    if (callback) callback(SystemInfo.system)
}

export const handleFetchArchitecture = async (callback?: (value: Architecture | undefined) => any) => {
    try {
        SystemInfo.architecture = await ipcRenderer.invoke("fetch-cpu-arch")
    } catch (error) {}
    if (callback) callback(SystemInfo.architecture)
}

export const handleFetchIsDev = async (callback?: (value: boolean | undefined) => any) => {
    try {
        SystemInfo.isDev = !!(await ipcRenderer.invoke("is-dev"))
    } catch (error) {}
    if (callback) callback(SystemInfo.isDev)
}
