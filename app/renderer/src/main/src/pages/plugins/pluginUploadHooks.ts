import {yakitNotify} from "@/utils/notification"
import {useEffect} from "react"

const {ipcRenderer} = window.require("electron")

interface PluginUploadHooks {
    taskToken: string
    onUploadData: (data: SaveYakScriptToOnlineResponse) => void
    onUploadEnd: () => void
    onUploadSuccess: () => void
    onUploadError: () => void
}
export interface SaveYakScriptToOnlineRequest {
    ScriptNames: string[]
    IsPrivate: boolean
    All?: boolean
}
export interface SaveYakScriptToOnlineResponse {
    Progress: number
    Message: string
    MessageType: string
}
export default function usePluginUploadHooks(props: PluginUploadHooks) {
    const {taskToken, onUploadData, onUploadSuccess, onUploadEnd, onUploadError} = props
    useEffect(() => {
        if (!taskToken) {
            return
        }
        let isSuccess = true
        ipcRenderer.on(`${taskToken}-data`, (_, data: SaveYakScriptToOnlineResponse) => {
            isSuccess = true
            onUploadData(data)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            if (isSuccess) {
                onUploadSuccess()
                yakitNotify("success", "上传成功")
            }
            onUploadEnd()
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            isSuccess = false
            onUploadError()
            yakitNotify("error", "上传异常:" + e)
        })
        return () => {
            ipcRenderer.invoke("cancel-SaveYakScriptToOnline", taskToken)
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [])
    const onStart = (uploadParams) => {
        const params: SaveYakScriptToOnlineRequest = {
            ...uploadParams
        }
        ipcRenderer.invoke("SaveYakScriptToOnline", params, taskToken)
    }
    const onCancel = () => {
        ipcRenderer.invoke("cancel-SaveYakScriptToOnline", taskToken)
    }
    return {onStart, onCancel} as const
}
