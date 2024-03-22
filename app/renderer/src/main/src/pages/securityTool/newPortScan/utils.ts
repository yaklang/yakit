import {yakitNotify} from "@/utils/notification"
import {PortScanExecuteExtraFormValue} from "./newPortScanType"
import {LastRecordProps} from "@/pages/simpleDetect/SimpleDetect"
import {StartBruteParams} from "@/pages/brute/BrutePage"

const {ipcRenderer} = window.require("electron")

/**
 * @description 端口扫描执行方法 社区版
 */
export const apiPortScan: (params: PortScanExecuteExtraFormValue, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        let executeParams: PortScanExecuteExtraFormValue = {
            ...params
        }
        ipcRenderer
            .invoke("PortScan", executeParams, token)
            .then(() => {
                yakitNotify("info", "启动任务成功")
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "端口扫描执行出错:" + e)
                reject(e)
            })
    })
}

/**
 * @description 取消 PortScan
 */
export const apiCancelPortScan: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-PortScan`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "取消端口扫描执行出错:" + e)
                reject(e)
            })
    })
}
export interface RecordPortScanRequest {
    LastRecord?: LastRecordProps
    StartBruteParams?: StartBruteParams
    PortScanRequest: PortScanExecuteExtraFormValue
}
/**
 * @description 端口扫描执行方法  企业版
 */
export const apiSimpleDetect: (params: RecordPortScanRequest, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        let executeParams = {
            ...params
        }
        ipcRenderer
            .invoke("SimpleDetect", executeParams, token)
            .then(() => {
                yakitNotify("info", "启动任务成功")
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "端口扫描执行出错:" + e)
                reject(e)
            })
    })
}

/**
 * @description 取消 SimpleDetect
 */
export const apiCancelSimpleDetect: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-SimpleDetect`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "取消端口扫描执行出错:" + e)
                reject(e)
            })
    })
}

export interface ExecParamItem {
    Key: string
    Value: string
}
export interface ExecRequest {
    Params: ExecParamItem[]
    Script: string
    ScriptId?: string
    YakScriptId?: string
    RunnerParamRaw?: string
    NoDividedEngine?: boolean
}
/**
 * @description 生成报告  企业版
 */
export const apiExecYakCode: (params: ExecRequest, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        let executeParams: ExecRequest = {
            ...params
        }
        ipcRenderer
            .invoke("ExecYakCode", executeParams, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "端口扫描执行出错:" + e)
                reject(e)
            })
    })
}

/**
 * @description 取消 ExecYakCode
 */
export const apiCancelExecYakCode: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-ExecYakCode`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "取消生成报告出错:" + e)
                reject(e)
            })
    })
}
