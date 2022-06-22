import React from "react";

const {ipcRenderer} = window.require("electron");

export const saveValue = (k: string, value: any) => {
    ipcRenderer.invoke("set-value", k, value).then(() => {
    });
}

export const getValue = (k: string) => {
    return ipcRenderer.invoke("get-value", k)
}

// 这是从引擎内获取存储
export const getRemoteValue = (k: string) => {
    return ipcRenderer.invoke("GetKey", {Key: k})
}

export const setRemoteValue = (k: string, v: string) => {
    return ipcRenderer.invoke("SetKey", {Key: k, Value: v})
}

export const setRemoteValueTTL = (k: string, v: string, ttl: number) => {
    return ipcRenderer.invoke("SetKey", {Key: k, Value: v, TTL: parseInt(`${ttl}`)})
}