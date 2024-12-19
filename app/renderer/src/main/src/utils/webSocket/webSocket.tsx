import emiter from "../eventBus/eventBus"
import {failed} from "@/utils/notification"
import { Uint8ArrayToString } from "../str"
import { API } from "@/services/swagger/resposeType"
const {ipcRenderer} = window.require("electron")


/**@name webSocket是否开启 */
export let webSocketStatus = false

export const startWebSocket = () => {
    ipcRenderer.on("client-socket-message", (e, data:Uint8Array) => {
        try {
            const obj = JSON.parse(Uint8ArrayToString(data))
            switch (obj.messageType) {
                case "messageLog":
                    emiter.emit("onRefreshMessageSocket", JSON.stringify(obj.params))
                    break;
            } 

        } catch (error) {}
    })

    ipcRenderer.on("client-socket-open", (e) => {
        webSocketStatus = true
        // 连接成功时 通知需要消息中心信息
        sendWebSocket({
            messageType: "messageLog",
            params: {}
        })
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
    ipcRenderer.removeAllListeners("client-socket-message")
    ipcRenderer.removeAllListeners("client-socket-open")
    ipcRenderer.removeAllListeners("client-socket-close")
    ipcRenderer.removeAllListeners("client-socket-error")
}

export const sendWebSocket = (data:API.WsRequest) => {
    ipcRenderer.invoke("socket-send",data)
}