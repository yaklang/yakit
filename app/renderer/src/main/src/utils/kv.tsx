const {ipcRenderer} = window.require("electron")

export const setLocalValue = (k: string, value: any) => {
    ipcRenderer.invoke("set-local-cache", k, value).then(() => {})
}

export const getLocalValue = (k: string) => {
    return ipcRenderer.invoke("fetch-local-cache", k)
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

// 根据不同项目区分从引擎内获取存储
export const getRemoteProjectValue = (k: string) => {
    return ipcRenderer.invoke("GetProjectKey", {Key: k})
}

export const setRemoteProjectValue = (k: string, v: string) => {
    return ipcRenderer.invoke("SetProjectKey", {Key: k, Value: v})
}
