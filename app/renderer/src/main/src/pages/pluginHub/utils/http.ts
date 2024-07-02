import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {APIFunc} from "./apiType"
import {yakitNotify} from "@/utils/notification"

/**
 * @name 插件上传到online-整体上传逻辑
 * @param info 上传到online的信息
 * @param isModify 是否为编辑操作
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
