import {HybridScanPluginConfig} from "@/models/HybridScan"
import {PortScanParams} from "@/pages/portscan/PortScanPage"
import {yakitNotify} from "@/utils/notification"
import {PortScanExecuteExtraFormValue} from "./newPortScanType"

const {ipcRenderer} = window.require("electron")

/**
 * @description 端口扫描执行方法
 */
export const apiPortScan: (params: PortScanExecuteExtraFormValue, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        let executeParams: PortScanExecuteExtraFormValue = {
            ...params
        }
        console.log("PortScan", executeParams)
        // ipcRenderer
        //     .invoke("PortScan", executeParams, token)
        //     .then(() => {
        //         yakitNotify("info", "启动任务成功")
        //         resolve(null)
        //     })
        //     .catch((e: any) => {
        //         yakitNotify("error", "端口扫描执行出错:" + e)
        //         reject(e)
        //     })
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
                yakitNotify("error", "取消本地插件执行出错:" + e)
                reject(e)
            })
    })
}
