import {APINoRequestFunc} from "@/apiUtils/type"
import {
    GlobalNetworkConfig,
    HandleAIConfigProps,
    ThirdPartyApplicationConfig
} from "@/components/configNetwork/ConfigNetworkPage"
import {GetThirdPartyAppConfigTemplateResponse} from "@/components/configNetwork/NewThirdPartyApplicationConfig"
import {SpaceEngineStartParams, SpaceEngineStatus} from "@/models/SpaceEngine"
import {PcapMetadata} from "@/models/Traffic"
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
export const apiGetSpaceEngineAccountStatus: (params: ThirdPartyApplicationConfig) => Promise<SpaceEngineStatus> = (
    params
) => {
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

/**更新全局配置 */
export const apiUpdateGlobalNetworkConfig: (params: Partial<GlobalNetworkConfig>) => Promise<GlobalNetworkConfig> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetGlobalNetworkConfig")
            .then((config:GlobalNetworkConfig)=>{
                const newConfig = {...config,...params}
                ipcRenderer
                    .invoke("SetGlobalNetworkConfig", newConfig)
                    .then(resolve)
                    .catch((e: any) => {
                        yakitNotify("error", "设置全局配置错误:" + e)
                        reject(e)
                })
            })
            .catch((e: any) => {
                yakitNotify("error", "获取全局配置错误:" + e)
                reject(e)
            })
    })
}

/** 获取第三方应用配置模板 */
export const apiGetThirdPartyAppConfigTemplate: APINoRequestFunc<GetThirdPartyAppConfigTemplateResponse> = (
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetThirdPartyAppConfigTemplate")
            .then(resolve)
            .catch((e) => {
                if (hiddenError) yakitNotify("error", "获取第三方应用配置模板错误:" + e)
                reject(e)
            })
    })
}

/**
 *@description 传入第三方配置和ai排序，得到最新的数据
 * @param {HandleAIConfigProps} config
 * @param {HandleAIConfigProps} data
 * @returns {HandleAIConfigProps|null} 全局配置
 */
export const handleAIConfig = (
    config: HandleAIConfigProps,
    data: ThirdPartyApplicationConfig
): HandleAIConfigProps | null => {
    if (!config || !data) return null
    const existedResult: ThirdPartyApplicationConfig[] = config?.AppConfigs || []
    let newAiApiPriority: string[] = config?.AiApiPriority || []
    const index = (config?.AppConfigs || []).findIndex((i) => i.Type === data.Type)
    if (index === -1) {
        existedResult.push(data)
        const existedAIPriority = existedResult.map((i) => i.Type)
        const setAIPriority: string[] = []
        const noSetAIPriority: string[] = []
        config?.AiApiPriority.forEach((ele) => {
            if (existedAIPriority.includes(ele)) {
                setAIPriority.push(ele)
            } else {
                noSetAIPriority.push(ele)
            }
        })
        newAiApiPriority = [...setAIPriority, ...noSetAIPriority]
    } else {
        existedResult[index] = {
            ...existedResult[index],
            ...data
        }
    }
    const params: HandleAIConfigProps = {
        AppConfigs: existedResult,
        AiApiPriority: newAiApiPriority
    }
    return params
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
        console.log("准备发送到后端的参数:", {...params})
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
