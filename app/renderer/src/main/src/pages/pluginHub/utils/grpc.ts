import {APIFunc} from "@/apiUtils/type"
import {KVPair} from "@/models/kv"
import {YakScript} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"

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
