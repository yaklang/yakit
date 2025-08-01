import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {
    DownloadLocalModelRequest,
    GetSupportedLocalModelsResponse,
    InstallLlamaServerRequest,
    IsLlamaServerReadyResponse,
    IsLocalModelReadyRequest,
    IsLocalModelReadyResponse,
    LocalModelConfig,
    StartLocalModelRequest
} from "../type/aiChat"
import omit from "lodash/omit"
import {apiGetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"

const {ipcRenderer} = window.require("electron")

export const grpcGetSupportedLocalModels: APINoRequestFunc<GetSupportedLocalModelsResponse> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSupportedLocalModels")
            .then(resolve)
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
        console.log("grpcStartLocalModel", value)
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

/**获取线上和本地的AI模型 */
export const getAIModelList: APINoRequestFunc<YakitSelectProps["options"]> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        try {
            let onlineModels: ThirdPartyApplicationConfig[] = []
            let localModels: LocalModelConfig[] = []
            const config = await apiGetGlobalNetworkConfig()
            if (!!config) {
                onlineModels = config.AppConfigs || []
            }
            const isReady = await grpcIsLlamaServerReady()
            if (isReady.Ok) {
                const localModelsRes = await grpcGetSupportedLocalModels()
                if (!!localModelsRes) localModels = localModelsRes.Models || []
            } else {
                yakitNotify("error", `${isReady.Reason}`)
            }
            const result: YakitSelectProps["options"] = []
            onlineModels.forEach((model) => {
                result.push({
                    value: model.Type,
                    label: model.Type
                })
            })
            localModels.forEach((model) => {
                result.push({
                    value: model.Name,
                    label: model.Name
                })
            })
            resolve(result)
        } catch (error) {
            if (!hiddenError) yakitNotify("error", "getAIModelList 失败:" + error)
            reject(error)
        }
    })
}
