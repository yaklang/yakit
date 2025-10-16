import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {
    AddMCPServerRequest,
    DeleteMCPServerRequest,
    GetAllMCPServersRequest,
    GetAllMCPServersResponse,
    UpdateMCPServerRequest
} from "../type/aiMCP"
import {GeneralResponse} from "../type/aiChat"

const {ipcRenderer} = window.require("electron")

export const grpcGetAllMCPServers: APIFunc<GetAllMCPServersRequest, GetAllMCPServersResponse> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetAllMCPServers", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcGetAllMCPServers 失败:" + err)
                reject(err)
            })
    })
}

export const grpcAddMCPServer: APIFunc<AddMCPServerRequest, GeneralResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        console.log("AddMCPServer", params)
        ipcRenderer
            .invoke("AddMCPServer", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcAddMCPServer 失败:" + err)
                reject(err)
            })
    })
}

export const grpcDeleteMCPServer: APIFunc<DeleteMCPServerRequest, GeneralResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteMCPServer", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcDeleteMCPServer 失败:" + err)
                reject(err)
            })
    })
}

export const grpcUpdateMCPServer: APIFunc<UpdateMCPServerRequest, GeneralResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        console.log("UpdateMCPServer", params)
        ipcRenderer
            .invoke("UpdateMCPServer", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcUpdateMCPServer 失败:" + err)
                reject(err)
            })
    })
}
