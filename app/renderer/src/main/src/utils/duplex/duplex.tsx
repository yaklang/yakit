import React from "react"
import {info} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import emiter from "../eventBus/eventBus"
import {Uint8ArrayToString} from "../str"

const {ipcRenderer} = window.require("electron")
let id = randomString(40)

/**@name 推送是否开启 */
export let serverPushStatus = false

export const startupDuplexConn = () => {
    info("Server Push Enabled Already")
    ipcRenderer.on(`${id}-data`, (e, data) => {
        try {
            const obj = JSON.parse(Uint8ArrayToString(data.Data))
            switch (obj.type) {
                // 当前引擎支持推送数据库更新(如若不支持则依然使用轮询请求)
                case "global":
                    serverPushStatus = true
                    break
                // 通知QueryHTTPFlows轮询更新
                case "httpflow":
                    emiter.emit("onRefreshQueryHTTPFlows")
                    break
                // 通知QueryYakScript轮询更新
                case "yakscript":
                    emiter.emit("onRefreshQueryYakScript")
                    break
                // 通知QueryNewRisk轮询更新
                case "risk":
                    emiter.emit("onRefreshQueryNewRisk")
                    break
            }
        } catch (error) {}
    })
    ipcRenderer.on(`${id}-error`, (e, error) => {
        console.log(error)
    })
    ipcRenderer.invoke("DuplexConnection", {}, id).then(() => {
        info("Server Push Enabled")
    })
}

export const closeDuplexConn = () => {
    ipcRenderer.invoke("cancel-DuplexConnection", id)
    ipcRenderer.removeAllListeners(`${id}-data`)
    ipcRenderer.removeAllListeners(`${id}-error`)
}
