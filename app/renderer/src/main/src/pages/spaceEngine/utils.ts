import {GlobalNetworkConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {SpaceEngineStartParams, SpaceEngineStatus} from "@/models/SpaceEngine"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface GetSpaceEngineStatusProps {
    Type: string
}
/**
 * @description 获取空间引擎状态
 */
export const apiGetSpaceEngineStatus: (params: GetSpaceEngineStatusProps) => Promise<SpaceEngineStatus> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSpaceEngineStatus", {...params})
            .then((value: SpaceEngineStatus) => {
                switch (value.Status) {
                    case "error":
                    case "invalid_type":
                        yakitNotify("error", "获取空间引擎错误:" + value.Info)
                        reject(value.Info)
                        break
                    default:
                        resolve(value)
                        break
                }
            })
            .catch((e: any) => {
                yakitNotify("error", "获取空间引擎错误:" + e)
                reject(e)
            })
    })
}
/**获取全局配置 */
export const apiGetGlobalNetworkConfig: () => Promise<GlobalNetworkConfig> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetGlobalNetworkConfig")
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "获取全局配置错误:" + e)
                reject(e)
            })
    })
}

/**设置全局配置 */
export const apiSetGlobalNetworkConfig: (params: GlobalNetworkConfig) => Promise<GlobalNetworkConfig> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SetGlobalNetworkConfig", params)
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "设置全局配置错误:" + e)
                reject(e)
            })
    })
}

/**
 * @description 空间引擎 执行接口
 */
export const apiFetchPortAssetFromSpaceEngine: (params: SpaceEngineStartParams, token: string) => Promise<null> = (
    params,
    token
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("FetchPortAssetFromSpaceEngine", {...params}, token)
            .then(() => {
                yakitNotify("info", "启动任务成功")
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "空间引擎执行错误:" + e)
                reject(e)
            })
    })
}

/**
 * @description 取消 FetchPortAssetFromSpaceEngine
 */
export const apiCancelFetchPortAssetFromSpaceEngine: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-FetchPortAssetFromSpaceEngine`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "取消空间引擎执行出错:" + e)
                reject(e)
            })
    })
}
