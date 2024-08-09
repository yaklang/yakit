import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {APIFunc} from "./apiType"
import {yakitNotify} from "@/utils/notification"

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
