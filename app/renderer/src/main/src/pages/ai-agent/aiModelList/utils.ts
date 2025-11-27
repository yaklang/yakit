import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {
    AddLocalModelRequest,
    ClearAllModelsRequest,
    DeleteLocalModelRequest,
    DownloadLocalModelRequest,
    GetAllStartedLocalModelsResponse,
    InstallLlamaServerRequest,
    IsLlamaServerReadyResponse,
    IsLocalModelReadyRequest,
    IsLocalModelReadyResponse,
    GeneralResponse,
    StartLocalModelRequest,
    UpdateLocalModelRequest,
    StartedLocalModelInfo,
    LocalModelConfig,
    GetAIModelListResponse,
    StopLocalModelRequest
} from "../type/aiModel"
import omit from "lodash/omit"
import {apiGetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {AILocalModelTypeEnum} from "../defaultConstant"

const {ipcRenderer} = window.require("electron")

export const grpcGetSupportedLocalModels: APINoRequestFunc<LocalModelConfig[]> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSupportedLocalModels")
            .then((res) => {
                const models = res.Models || []
                resolve(models)
            })
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcGetSupportedLocalModels 失败:" + err)
                reject(err)
            })
    })
}

export const grpcIsLlamaServerReady: APINoRequestFunc<IsLlamaServerReadyResponse> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("IsLlamaServerReady")
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcIsLlamaServerReady 失败:" + err)
                reject(err)
            })
    })
}

export const grpcInstallLlamaServer: APIFunc<InstallLlamaServerRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const token = params.token
        const value = omit(params, "token")
        ipcRenderer
            .invoke("InstallLlamaServer", value, token)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcInstallLlamaServer 失败:" + err)
                reject(err)
            })
    })
}
export const grpcDownloadLocalModel: APIFunc<DownloadLocalModelRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const token = params.token
        const value = omit(params, "token")
        ipcRenderer
            .invoke("DownloadLocalModel", value, token)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcDownloadLocalModel 失败:" + err)
                reject(err)
            })
    })
}
export const grpcCancelInstallLlamaServer: APIFunc<string, null> = (token, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("cancel-InstallLlamaServer", token)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcCancelInstallLlamaServer 失败:" + err)
                reject(err)
            })
    })
}

export const grpcCancelDownloadLocalModel: APIFunc<string, null> = (token, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("cancel-DownloadLocalModel", token)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcCancelDownloadLocalModel 失败:" + err)
                reject(err)
            })
    })
}

export const grpcIsLocalModelReady: APIFunc<IsLocalModelReadyRequest, IsLocalModelReadyResponse> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("IsLocalModelReady", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcIsLocalModelReady 失败:" + err)
                reject(err)
            })
    })
}

export const grpcStartLocalModel: APIFunc<StartLocalModelRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const token = params.token
        const value = omit(params, "token")
        ipcRenderer
            .invoke("StartLocalModel", value, token)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcStartLocalModel 失败:" + err)
                reject(err)
            })
    })
}

export const grpcCancelStartLocalModel: APIFunc<string, null> = (token, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("cancel-StartLocalModel", token)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcCancelStartLocalModel 失败:" + err)
                reject(err)
            })
    })
}

export const grpcStopLocalModel: APIFunc<StopLocalModelRequest, GeneralResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("StopLocalModel", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcStopLocalModel 失败:" + err)
                reject(err)
            })
    })
}

/**获取线上和本地已启动的AI模型 */
export const getAIModelList: APINoRequestFunc<GetAIModelListResponse> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        try {
            let onlineModels: ThirdPartyApplicationConfig[] = []
            let localModels: StartedLocalModelInfo[] = []
            const config = await apiGetGlobalNetworkConfig()
            if (!!config) {
                onlineModels = config.AppConfigs.filter((ele) => config.AiApiPriority.includes(ele.Type)) || []
            }
            const localModelsRes = await grpcGetAllStartedLocalModels()
            if (!!localModelsRes) {
                localModels = localModelsRes.Models.filter((ele) => ele.ModelType === AILocalModelTypeEnum.AIChat) || []
            }
            resolve({onlineModels, localModels})
        } catch (error) {
            if (!hiddenError) yakitNotify("error", "getAIModelList 失败:" + error)
            reject(error)
        }
    })
}

/**新增本地AI Model */
export const grpcAddLocalModel: APIFunc<AddLocalModelRequest, GeneralResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("AddLocalModel", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcAddLocalModel 失败:" + err)
                reject(err)
            })
    })
}

/**删除本地AI Model */
export const grpcDeleteLocalModel: APIFunc<DeleteLocalModelRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteLocalModel", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcDeleteLocalModel 失败:" + err)
                reject(err)
            })
    })
}
/**更新本地AI Model */
export const grpcUpdateLocalModel: APIFunc<UpdateLocalModelRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("UpdateLocalModel", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcUpdateLocalModel 失败:" + err)
                reject(err)
            })
    })
}
/**获取所有启动的chat模型列表 */
export const grpcGetAllStartedLocalModels: APINoRequestFunc<GetAllStartedLocalModelsResponse> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetAllStartedLocalModels")
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcGetAllStartedLocalModels 失败:" + err)
                reject(err)
            })
    })
}

/**ai 线上列表排序 */
export const reorderApplicationConfig = (list: ThirdPartyApplicationConfig[], startIndex: number, endIndex: number) => {
    const result = [...list]
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}

/**清空本地ai model */
export const grpcClearAllModels: APIFunc<ClearAllModelsRequest, GeneralResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("ClearAllModels", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcClearAllModels 失败:" + err)
                reject(err)
            })
    })
}
