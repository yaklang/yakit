import React from "react";
import {info} from "@/utils/notification";
import {randomString} from "@/utils/randomUtil";
import emiter from "../eventBus/eventBus";
import { Uint8ArrayToString } from "../str";

const {ipcRenderer} = window.require("electron");

let id = randomString(40);
export const startupDuplexConn = () => {
    info("Server Push Enabled Already")
    ipcRenderer.on(`${id}-data`, (e, data) => {
        console.log("通知history table表刷新---");
        try {
            const obj = JSON.parse(Uint8ArrayToString(data.Data))
            console.log("更新type",obj.type);
            // 通知history table表刷新
            if(obj.type === "httpflow"){
                emiter.emit("onRefreshQueryHTTPFlows")
            }
            if(obj.type === "yakscript"){
                emiter.emit("onRefreshQueryYakScript")
            }
            if(obj.type === "risk"){
                emiter.emit("onRefreshQueryNewRisk")
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