import emiter from "../eventBus/eventBus"
import {failed} from "@/utils/notification"
import { Uint8ArrayToString } from "../str"
const {ipcRenderer} = window.require("electron")


/**@name webSocket是否开启 */
export let webSocketStatus = false

export const startWebSocket = () => {
    ipcRenderer.on("client-socket-message", (e, data:Uint8Array) => {
        try {
           emiter.emit("onRefreshMessageSocket", Uint8ArrayToString(data))
        } catch (error) {}
    })

    ipcRenderer.on("client-socket-open", (e) => {
        // console.log("webSocket启动成功");
        webSocketStatus = true
    })

    ipcRenderer.on("client-socket-close", (e) => {
        webSocketStatus = false
    })

    ipcRenderer.on("client-socket-error", (e, error:any) => {
        // console.log("webSocket错误",error);
    })
}

export const closeWebSocket = () => {
    ipcRenderer.invoke("socket-close")
}

export const sendWebSocket = () => {
    ipcRenderer.invoke("socket-send",{})
}