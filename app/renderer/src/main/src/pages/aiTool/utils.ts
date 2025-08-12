import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {DbOperateMessage} from "../layout/mainOperatorContent/utils"
import {AIToolGenerateMetadataRequest, AIToolGenerateMetadataResponse, SaveAIToolRequest} from "../ai-agent/type/aiChat"
const {ipcRenderer} = window.require("electron")

export const grpcSaveAITool: APIFunc<SaveAIToolRequest, DbOperateMessage> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SaveAITool", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcSaveAITool 失败:" + err)
                reject(err)
            })
    })
}

export const grpcAIToolGenerateMetadata: APIFunc<AIToolGenerateMetadataRequest, AIToolGenerateMetadataResponse> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("AIToolGenerateMetadata", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcAIToolGenerateMetadata 失败:" + err)
                reject(err)
            })
    })
}

export const grpcAIToolGenerateDescription: APIFunc<AIToolGenerateMetadataRequest, string> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        grpcAIToolGenerateMetadata(params)
            .then((response) => {
                resolve(response.Description || "")
            })
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcAIToolGenerateDescription 失败:" + err)
                reject(err)
            })
    })
}

export const grpcAIToolGenerateKeywords: APIFunc<AIToolGenerateMetadataRequest, string[]> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        grpcAIToolGenerateMetadata(params)
            .then((response) => {
                resolve(response.Keywords || [])
            })
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcAIToolGenerateKeywords 失败:" + err)
                reject(err)
            })
    })
}
