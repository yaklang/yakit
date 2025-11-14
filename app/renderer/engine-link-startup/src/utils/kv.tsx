import {ipcEventPre} from "./ipcEventPre"

const {ipcRenderer} = window.require("electron")

export const setLocalValue = (k: string, value: any) => {
    ipcRenderer.invoke(`${ipcEventPre}set-local-cache`, k, value).then(() => {})
}

export const getLocalValue = (k: string) => {
    return ipcRenderer.invoke(`${ipcEventPre}fetch-local-cache`, k)
}

// 这是从引擎内获取存储
export const getRemoteValue = (k: string) => {
    return ipcRenderer.invoke(ipcEventPre + "GetKey", {Key: k})
}

export const setRemoteValue = (k: string, v: string) => {
    return ipcRenderer.invoke(ipcEventPre + "SetKey", {Key: k, Value: v})
}

export const setRemoteValueTTL = (k: string, v: string, ttl: number) => {
    return ipcRenderer.invoke(ipcEventPre + "SetKey", {Key: k, Value: v, TTL: parseInt(`${ttl}`)})
}
