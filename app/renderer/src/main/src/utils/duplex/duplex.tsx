import React from "react"
import {info} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import emiter from "../eventBus/eventBus"
import {Uint8ArrayToString} from "../str"

const {ipcRenderer} = window.require("electron")
let id = randomString(40)

export interface FileMonitorItemProps {
    // 是否为文件夹
    IsDir: boolean
    // 操作
    Op: "delete" | "create"
    // 路径
    Path: string
}

export interface FileMonitorProps {
    ChangeEvents:FileMonitorItemProps[]
    CreateEvents:FileMonitorItemProps[]
    DeleteEvents:FileMonitorItemProps[]
}

/**@name 推送是否开启 */
export let serverPushStatus = false

export const startupDuplexConn = () => {
    info("Server Push Enabled Already")
    ipcRenderer.on(`${id}-data`, (e, data:DuplexConnectionProps) => {
        try {
            const obj = JSON.parse(Uint8ArrayToString(data.Data))
            
            switch (data.MessageType) {
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
                // 文件树结构监控
                case "file_monitor":
                    const event:FileMonitorProps = obj
                    emiter.emit("onRefreshYakRunnerFileTree",JSON.stringify(event))
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

export interface DuplexConnectionProps {
    Data: Uint8Array
    MessageType: string
    Timestamp: number
}

export const sendDuplexConn = (params:DuplexConnectionProps) => {
    ipcRenderer.invoke("DuplexConnectionWrite", params, id)
}

export const closeDuplexConn = () => {
    ipcRenderer.invoke("cancel-DuplexConnection", id)
    ipcRenderer.removeAllListeners(`${id}-data`)
    ipcRenderer.removeAllListeners(`${id}-error`)
}
