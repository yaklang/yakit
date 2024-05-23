import {yakitNotify} from "@/utils/notification"
import {PortScanExecuteExtraFormValue} from "./NewPortScanType"
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

export interface LastRecordProps {
    ExtraInfo: string
    YakScriptOnlineGroup: string
    Percent: number
    LastRecordPtr: number
}
export interface RecordPortScanRequest {
    LastRecord?: LastRecordProps
    StartBruteParams?: StartBruteParams
    PortScanRequest: PortScanExecuteExtraFormValue
    RuntimeId?: string
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
export interface CreatReportRequest {
    ReportName: string
    RuntimeId: string
}
/**
 * @description 生成报告  企业版
 */
export const apiSimpleDetectCreatReport: (params: CreatReportRequest, token: string) => Promise<null> = (
    params,
    token
) => {
    return new Promise((resolve, reject) => {
        let executeParams: CreatReportRequest = {
            ...params
        }
        ipcRenderer
            .invoke("SimpleDetectCreatReport", executeParams, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "生成报告执行出错:" + e)
                reject(e)
            })
    })
}

/**
 * @description 取消 SimpleDetectCreatReport
 */
export const apiCancelSimpleDetectCreatReport: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-SimpleDetectCreatReport`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "取消生成报告出错:" + e)
                reject(e)
            })
    })
}
