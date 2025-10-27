import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {DbOperateMessage} from "../layout/mainOperatorContent/utils"
import {
    AITool,
    AIToolGenerateMetadataRequest,
    AIToolGenerateMetadataResponse,
    SaveAIToolRequest,
    SaveAIToolV2Response,
    UpdateAIToolRequest
} from "../ai-agent/type/aiTool"
const {ipcRenderer} = window.require("electron")

export const isAITool = (value: AITool | DbOperateMessage): value is AITool => {
    return "ID" in value
}

export const grpcSaveAITool: APIFunc<SaveAIToolRequest, AITool> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SaveAIToolV2", params)
            .then((res: SaveAIToolV2Response) => {
                if (res.IsSuccess) {
                    resolve(res.AITool)
                } else {
                    if (!hiddenError) yakitNotify("error", "grpcSaveAITool 失败: " + res.Message)
                    reject(res.Message)
                }
            })
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcSaveAITool 失败:" + err)
                reject(err)
            })
    })
}

export const grpcUpdateAITool: APIFunc<UpdateAIToolRequest, DbOperateMessage> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("UpdateAITool", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcUpdateAITool 失败:" + err)
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
