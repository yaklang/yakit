import {APIFunc} from "@/apiUtils/type"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {HTTPRequestParameters} from "@/types/http-api"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

/**
 * @name 插件同步/提交至云端
 */
export const httpUploadPluginToOnline: APIFunc<API.PluginsEditRequest, API.PostPluginsResponse> = (
    info,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        // console.log("method:post|api:plugins", JSON.stringify(info))
        NetWorkApi<API.PluginsEditRequest, API.PostPluginsResponse>({
            method: "post",
            url: "plugins",
            data: info
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "插件上传失败:" + err)
                reject(err)
            })
    })
}

/**
 * @name 插件复制至云端
 */
export const httpCopyPluginToOnline: APIFunc<API.CopyPluginsRequest, API.PluginsResponse> = (info, hiddenError) => {
    return new Promise((resolve, reject) => {
        // console.log("method:post|api:copy/plugins", JSON.stringify(info))
        NetWorkApi<API.CopyPluginsRequest, API.PluginsResponse>({
            method: "post",
            url: "copy/plugins",
            data: info
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "插件复制至云端失败:" + err)
                reject(err)
            })
    })
}

/**
 * @name 插件审核页-获取插件详情
 */
export const httpFetchAuditPluginDetail: APIFunc<string, API.PluginsAuditDetailResponse> = (uuid, hiddenError) => {
    return new Promise((resolve, reject) => {
        // console.log("method:get|api:plugins/detail/audit\n", JSON.stringify({uuid: uuid}))
        NetWorkApi<{uuid: string}, API.PluginsAuditDetailResponse>({
            method: "get",
            url: "plugins/detail/audit",
            data: {uuid: uuid}
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取审核插件详情失败:" + err)
                reject(err)
            })
    })
}

/**
 * @name 插件审核页-审核插件操作(通过|不通过)
 */
export const httpAuditPluginOperate: APIFunc<API.PluginAuditRequest, API.ActionSucceeded> = (request, hiddenError) => {
    return new Promise((resolve, reject) => {
        // console.log("method:post|api:plugins/detail/audit\n", JSON.stringify(request))
        NetWorkApi<API.PluginAuditRequest, API.ActionSucceeded>({
            method: "post",
            url: "plugins/detail/audit",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "审核插件操作失败:" + err)
                reject(err)
            })
    })
}

interface FetchPluginLogsRequest {
    data: API.LogsRequest
    params?: HTTPRequestParameters
}
/**
 * @name 插件日志页-获取日志列表
 */
export const httpFetchPluginLogs: APIFunc<FetchPluginLogsRequest, API.PluginsLogsResponse> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        const {data, params: page = {}} = request

        let token: string = ""
        try {
            const userInfo = await ipcRenderer.invoke("get-login-user-info", {})
            if (userInfo.isLogin) {
                token = userInfo.token
            }
        } catch (error) {}

        const params: HTTPRequestParameters = {
            page: page.page || 1,
            limit: page.limit || 20,
            order_by: page.order_by || "created_at",
            order: page.order || "desc"
        }

        // console.log("method:get|api:plugins/logs\n", JSON.stringify(params), "\n", JSON.stringify(data))
        NetWorkApi<API.LogsRequest, API.PluginsLogsResponse>({
            method: "get",
            url: "plugins/logs",
            params: {...params} as any,
            data: {...data, token: token || undefined}
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取日志列表失败:" + err)
                reject(err)
            })
    })
}

/**
 * @name 插件日志页-获取日志列表各个类型的Total
 */
export const httpFetchPluginLogsAllTotal: APIFunc<string, API.PluginsLogsTabResponse> = (uuid, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        NetWorkApi<{uuid: string}, API.PluginsLogsTabResponse>({
            method: "get",
            url: "plugins/logs/tab",
            params: {uuid: uuid}
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取日志各项总数失败:" + err)
                reject(err)
            })
    })
}

interface FetchMergePluginDetailRequest {
    uuid: string
    up_log_id: number
}
/**
 * @name 插件日志页-获取合并插件详情
 */
export const httpFetchMergePluginDetail: APIFunc<FetchMergePluginDetailRequest, API.PluginsAuditDetailResponse> = (
    request,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        // console.log("method:get|api:plugins/merge/update/detail\n", JSON.stringify(request))
        NetWorkApi<FetchMergePluginDetailRequest, API.PluginsAuditDetailResponse>({
            method: "get",
            url: "plugins/merge/update/detail",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取日志插件详情失败:" + err)
                reject(err)
            })
    })
}

/**
 * @name 插件日志页-日志修改插件操作(合并|不合并)
 */
export const httpMergePluginOperate: APIFunc<API.PluginMergeRequest, API.PluginsLogsDetail> = (
    request,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        // console.log("method:post|api:plugins/merge/update/detail\n", JSON.stringify(request))
        NetWorkApi<API.PluginMergeRequest, API.PluginsLogsDetail>({
            method: "post",
            url: "plugins/merge/update/detail",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "操作失败:" + err)
                reject(err)
            })
    })
}

/**
 * @name 插件日志页-发布评论|回复
 */
export const httpPublishComment: APIFunc<API.CommentLogRequest, API.ActionSucceeded> = (request, hiddenError) => {
    return new Promise((resolve, reject) => {
        // console.log("method:post|api:comment/logs\n", JSON.stringify(request))
        NetWorkApi<API.CommentLogRequest, API.ActionSucceeded>({
            method: "post",
            url: "comment/logs",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "发布评论失败:" + err)
                reject(err)
            })
    })
}

/**
 * @name 插件日志页-删除评论|回复
 */
export const httpDeleteComment: APIFunc<number, API.ActionSucceeded> = (request, hiddenError) => {
    return new Promise((resolve, reject) => {
        // console.log("method:delete|api:comment/logs\n", JSON.stringify(request))
        NetWorkApi<{logId: number}, API.ActionSucceeded>({
            method: "delete",
            url: "comment/logs",
            params: {logId: request}
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "删除评论失败:" + err)
                reject(err)
            })
    })
}
