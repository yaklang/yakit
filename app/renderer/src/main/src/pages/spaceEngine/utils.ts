import {GlobalNetworkConfig, ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {SpaceEngineStartParams, SpaceEngineStatus} from "@/models/SpaceEngine"
import { PcapMetadata } from "@/models/Traffic"
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
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "获取空间引擎错误:" + e)
                reject(e)
            })
    })
}
/**
 * @description 校验引擎状态，根据前端传的值
 */
export const apiGetSpaceEngineAccountStatus: (
    params: ThirdPartyApplicationConfig
) => Promise<SpaceEngineStatus> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSpaceEngineAccountStatusV2", {...params})
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "校验引擎失败:" + e)
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

/** GetPcapMetadata */
export const apiGetPcapMetadata: () => Promise<PcapMetadata> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetPcapMetadata", {})
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "GetPcapMetadata数据获取错误:" + e)
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
