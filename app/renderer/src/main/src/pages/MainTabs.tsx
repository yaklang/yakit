const {ipcRenderer} = window.require("electron")

// 通过IPC通信-远程打开一个页面
export const addToTab = (type: string, data?: any) => {
    ipcRenderer.invoke("send-to-tab", {type, data})
}
