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
        console.log("method:post|api:plugins", JSON.stringify(info))
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
        console.log("method:post|api:copy/plugins", JSON.stringify(info))
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
