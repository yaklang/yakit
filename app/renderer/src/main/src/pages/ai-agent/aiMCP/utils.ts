import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {
    AddMCPServerRequest,
    DeleteMCPServerRequest,
    GetAllMCPServersRequest,
    GetAllMCPServersResponse,
    MCPServer,
    UpdateMCPServerRequest
} from "../type/aiMCP"
import {GeneralResponse} from "../type/aiModel"

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

export const getMCPServersById: APIFunc<number, MCPServer> = (id, hiddenError) => {
    return new Promise((resolve, reject) => {
        const newQuery: GetAllMCPServersRequest = {
            Keyword: "",
            Pagination: {
                OrderBy: "created_at",
                Order: "desc",
                Page: 1,
                Limit: 1
            },
            IsShowToolList: true,
            ID: id
        }
        grpcGetAllMCPServers(newQuery, hiddenError)
            .then((res) => {
                if (res.MCPServers && res.MCPServers.length > 0) {
                    resolve(res.MCPServers[0])
                } else {
                    reject("not found")
                }
            })
            .catch(reject)
    })
}
export const grpcAddMCPServer: APIFunc<AddMCPServerRequest, GeneralResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
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
        ipcRenderer
            .invoke("UpdateMCPServer", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "grpcUpdateMCPServer 失败:" + err)
                reject(err)
            })
    })
}
