import {GroupCount, QueryYakScriptGroupResponse} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface ListeningPortProps {
    host: string
    port: number
}
/**端口监听 */
export const apiListeningPort: (params: ListeningPortProps) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("listening-port", params.host, params.port)
            .then(resolve)
            .catch((e) => {
                reject(e)
                yakitNotify("error", "开启端口监听失败：" + e)
            })
    })
}

/**取消端口监听 */
export const apiCancelListeningPort: (params: string) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("listening-port-cancel", params)
            .then(resolve)
            .catch((e) => {
                reject(e)
                yakitNotify("error", "取消端口监听失败：" + e)
            })
    })
}

export type SystemType = "Linux" | "Windows" | "Mac" | "All"
export type CmdType = "ReverseShell" | "MSFVenom"
export interface GetReverseShellProgramListRequest {
    System: SystemType
    CmdType: CmdType
}

export interface GetReverseShellProgramListResponse {
    ProgramList: string[]
    ShellList: string[]
}

export const apiGetReverseShellProgramList: (
    params: GetReverseShellProgramListRequest
) => Promise<GetReverseShellProgramListResponse> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetReverseShellProgramList", params)
            .then(resolve)
            .catch((e) => {
                reject(e)
                yakitNotify("error", "获取ReverseShellProgram失败:" + e)
            })
    })
}

export interface GenerateReverseShellCommandRequest {
    System: SystemType
    CmdType: CmdType
    ShellType: string
    Encode: string
    Program: string
    IP: string
    port: number
}
export interface GenerateReverseShellCommandResponse {
    Status: {Ok: boolean; Reason: string}
    Result: string
}
export const apiGenerateReverseShellCommand: (
    params: GenerateReverseShellCommandRequest
) => Promise<GenerateReverseShellCommandResponse> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GenerateReverseShellCommand", params)
            .then(resolve)
            .catch((e) => {
                reject(e)
                yakitNotify("error", "GenerateReverseShellCommand失败:" + e)
            })
    })
}
