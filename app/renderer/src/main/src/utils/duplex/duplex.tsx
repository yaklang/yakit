import React from "react";
import {info} from "@/utils/notification";
import {randomString} from "@/utils/randomUtil";

const {ipcRenderer} = window.require("electron");

let started = false;
let id = randomString(40);
export const startupDuplexConn = () => {
    if (started) {
        info("Server Push Enabled Already")
        return
    }
    started = true;
    ipcRenderer.on(`${id}-data`, (e, data) => {
        console.log(data)
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