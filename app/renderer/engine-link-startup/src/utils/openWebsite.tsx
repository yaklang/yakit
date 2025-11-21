import {ipcEventPre} from "./ipcEventPre"
const {ipcRenderer} = window.require("electron")

export const openABSFileLocated = (u: string) => {
    ipcRenderer.invoke(ipcEventPre + "open-specified-file", u)
}
