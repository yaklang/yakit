import React from "react";
import { success } from "./notification";

const {ipcRenderer} = window.require("electron");

export const openExternalWebsite = (u: string) => {
    ipcRenderer.invoke("shell-open-external", u)
}

export const openABSFile = (u: string) => {
    ipcRenderer.invoke("shell-open-abs-file", u)
}

export const openABSFileLocated = (u: string) => {
    ipcRenderer.invoke("open-specified-file", u)
}

export const saveABSFileToOpen = (name: string, data?: Uint8Array | string) => {
    const isArr = Array.isArray(data)
    ipcRenderer.invoke("show-save-dialog", name).then((res) => {
        if (res.canceled) return
        ipcRenderer
            .invoke("write-file", {
                route: res.filePath,
                data: isArr ? new Buffer((data || []) as Uint8Array).toString() : data || ""
            })
            .then(() => {
                success('下载完成')
                ipcRenderer.invoke("open-specified-file", res.filePath)
            })
    })
}

export interface ExternalUrlProp {
    url: string
    title?: React.ReactNode
}

export const ExternalUrl: React.FC<ExternalUrlProp> = (props) => {
    return <a onClick={e => {
        openExternalWebsite(props.url)
    }}>
        {props.title || props.url}
    </a>
};