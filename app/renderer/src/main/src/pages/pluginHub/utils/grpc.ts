import {YakScript} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {APIFunc} from "./apiType"

const {ipcRenderer} = window.require("electron")

interface DownloadOnlinePluginByUUID {
    uuid: string
    token?: string
}
/** @name 通过UUID下载插件到本地并返回本地信息 */
export const grpcDownloadOnlinePlugin: APIFunc<DownloadOnlinePluginByUUID, YakScript> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginByUUID", {UUID: params.uuid, Token: params.token || undefined})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "下载插件失败:" + e)
                reject(e)
            })
    })
}
