import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {KVPair} from "@/models/kv"
import {YakScript} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {
    DeletePluginEnvRequest,
    PluginEnvData,
    QueryPluginEnvRequest
} from "../pluginEnvVariables/PluginEnvVariablesType"

const {ipcRenderer} = window.require("electron")

interface DownloadOnlinePluginByUUID {
    uuid: string
}
/** @name 通过UUID下载插件到本地并返回本地信息 */
export const grpcDownloadOnlinePlugin: APIFunc<DownloadOnlinePluginByUUID, YakScript> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        let token: string = ""
        try {
            const userInfo = await ipcRenderer.invoke("get-login-user-info", {})
            if (userInfo.isLogin) {
                token = userInfo.token
            }
        } catch (error) {}

        ipcRenderer
            .invoke("DownloadOnlinePluginByUUID", {UUID: params.uuid, Token: token || undefined})
            .then((res) => {
                // 刷新插件菜单
                setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                resolve(res)
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "下载插件失败:" + e)
                reject(e)
            })
    })
}

interface FetchLocalPluginDetail {
    Name: string
    UUID?: string
}
/** @name 通过名字(必填)和UUID(选填)查询本地插件详情信息 */
export const grpcFetchLocalPluginDetail: APIFunc<FetchLocalPluginDetail, YakScript> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        const {Name, UUID} = params
        if (!Name) {
            if (!hiddenError) yakitNotify("error", "查询插件名不能为空")
            reject("查询插件名不能为空")
            return
        }

        ipcRenderer
            .invoke("GetYakScriptByName", {UUID: UUID || undefined, Name: Name})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询本地插件详情失败:" + e)
                reject(e)
            })
    })
}

/** @name 通过插件ID查询本地插件详情信息 */
export const grpcFetchLocalPluginDetailByID: APIFunc<string | number, YakScript> = (id, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        if (!id) {
            if (!hiddenError) yakitNotify("error", "查询插件的ID不能为空")
            reject("查询插件的ID不能为空")
            return
        }

        ipcRenderer
            .invoke("GetYakScriptById", {Id: id})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询本地插件详情失败:" + e)
                reject(e)
            })
    })
}

export interface FetchExpressionToResultRequest {
    Expression: string
    Variables?: KVPair[]
    ImportYaklangLibs?: boolean
}
export interface FetchExpressionToResultResponse {
    Result: string
    /** 结果是否可以用 */
    BoolResult: boolean
}
/** @name 通过表达式获取代表的数据结果 */
export const grpcFetchExpressionToResult: APIFunc<FetchExpressionToResultRequest, FetchExpressionToResultResponse> = (
    request,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        const {Expression} = request
        if (!Expression) {
            if (!hiddenError) yakitNotify("error", "查询的表达式不能为空")
            reject("查询的表达式不能为空")
            return
        }

        ipcRenderer
            .invoke("EvaluateExpression", {...request})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询表达式失败:" + e)
                reject(e)
            })
    })
}

/** @name 查询全部插件环境变量 */
export const grpcFetchAllPluginEnvVariables: APINoRequestFunc<PluginEnvData> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("GetAllPluginEnv")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询全部插件环境变量失败:" + e)
                reject(e)
            })
    })
}

/** @name 查询传入插件环境变量对应的值 */
export const grpcFetchPluginEnvVariables: APIFunc<QueryPluginEnvRequest, PluginEnvData> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryPluginEnv", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询插件环境变量失败:" + e)
                reject(e)
            })
    })
}

/** @name 创建插件环境变量 */
export const grpcCreatePluginEnvVariables: APIFunc<PluginEnvData, undefined> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreatePluginEnv", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "创建插件环境变量失败:" + e)
                reject(e)
            })
    })
}

/** @name 设置插件环境变量 */
export const grpcSetPluginEnvVariables: APIFunc<PluginEnvData, undefined> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("SetPluginEnv", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "设置插件环境变量失败:" + e)
                reject(e)
            })
    })
}

/** @name 删除插件环境变量 */
export const grpcDeletePluginEnvVariables: APIFunc<DeletePluginEnvRequest, undefined> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeletePluginEnv", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除插件环境变量失败:" + e)
                reject(e)
            })
    })
}
