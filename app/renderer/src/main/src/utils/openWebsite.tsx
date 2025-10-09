import React from "react"
import {success, yakitFailed, yakitNotify} from "./notification"
import {OpenPacketNewWindowItem} from "@/components/OpenPacketNewWindow/OpenPacketNewWindow"
import {childWindowHash} from "@/pages/layout/mainOperatorContent/MainOperatorContent"
import {
    changeClickEngineConsoleFlag,
    clickEngineConsoleFlag,
    engineConsoleWindowHash
} from "@/components/layout/hooks/useEngineConsole/useEngineConsole"
import i18n from "@/i18n/i18n"

const {ipcRenderer} = window.require("electron")

export const openExternalWebsite = (u: string) => {
    ipcRenderer.invoke("shell-open-external", u)
}

export const openPacketNewWindow = (data: OpenPacketNewWindowItem) => {
    if (childWindowHash) {
        minWinSendToChildWin({type: "openPacketNewWindow", data})
    } else {
        yakitNotify("info", i18n.language === "zh" ? "新窗口打开中..." : "Opening new window...")
        ipcRenderer.send("open-new-child-window", {
            type: "openPacketNewWindow",
            data: data
        })
    }
}
export const minWinSendToChildWin = (params) => {
    ipcRenderer.send("onTop-childWin")
    ipcRenderer.send("minWin-send-to-childWin", {
        type: params.type,
        hash: childWindowHash,
        data: params.data
    })
}

export const openConsoleNewWindow = () => {
    if (clickEngineConsoleFlag) return
    if (!engineConsoleWindowHash) {
        changeClickEngineConsoleFlag(true)
        ipcRenderer.invoke("open-console-new-window")
    } else {
        ipcRenderer.send("onTop-console-new-window")
    }
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
                success("下载完成")
                ipcRenderer.invoke("open-specified-file", res.filePath)
            })
    })
}

export const saveABSFileAnotherOpen = async (params: {
    name: string
    data?: Uint8Array | string
    successMsg: string
    errorMsg: string
    isOpenSpecifiedFile?: boolean
}) => {
    const {name, data, successMsg = "下载完成", errorMsg = "下载失败", isOpenSpecifiedFile = false} = params
    const isArr = Array.isArray(data)
    const showSaveDialogRes = await ipcRenderer.invoke("show-save-dialog", name)
    if (showSaveDialogRes.canceled) return
    return ipcRenderer
        .invoke("write-file", {
            route: showSaveDialogRes.filePath,
            data: isArr ? new Buffer(data || []).toString() : data || ""
        })
        .then(() => {
            success(successMsg)
            isOpenSpecifiedFile && ipcRenderer.invoke("open-specified-file", showSaveDialogRes.filePath)
            return showSaveDialogRes.filePath
        })
        .catch((e) => {
            errorMsg && yakitFailed(`${errorMsg}：${e}`)
            return Promise.reject(e)
        })
}

export interface ExternalUrlProp {
    url: string
    title?: React.ReactNode
}

export const ExternalUrl: React.FC<ExternalUrlProp> = (props) => {
    return (
        <a
            onClick={(e) => {
                openExternalWebsite(props.url)
            }}
        >
            {props.title || props.url}
        </a>
    )
}
