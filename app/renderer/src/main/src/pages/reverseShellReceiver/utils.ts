import {GroupCount, QueryYakScriptGroupResponse} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface ListeningPortProps {
    host: string
    port: number
}
/**端口监听 */
export const apiListeningPort: (params: ListeningPortProps) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("listening-port", params.host, params.port)
            .then(resolve)
            .catch((e) => {
                reject(e)
                yakitNotify("error", "开启端口监听失败：" + e)
            })
    })
}

/**取消端口监听 */
export const apiCancelListeningPort: (params: string) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("listening-port-cancel", params)
            .then(resolve)
            .catch((e) => {
                reject(e)
                yakitNotify("error", "取消端口监听失败：" + e)
            })
    })
}
