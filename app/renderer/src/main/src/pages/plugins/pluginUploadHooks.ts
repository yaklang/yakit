import {yakitNotify} from "@/utils/notification"
import {useEffect, useRef} from "react"

const {ipcRenderer} = window.require("electron")

interface PluginUploadHooks {
    /**是否单个上传 */
    isSingle?: boolean
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
    PluginSupplement?: string
}
export interface SaveYakScriptToOnlineResponse {
    Progress: number
    Message: string
    MessageType: string
}
export default function usePluginUploadHooks(props: PluginUploadHooks) {
    const {isSingle, taskToken, onUploadData, onUploadSuccess, onUploadEnd, onUploadError} = props
    const messageListRef = useRef<SaveYakScriptToOnlineResponse[]>([])
    const pluginNameListRef = useRef<string[]>([])
    useEffect(() => {
        if (!taskToken) {
            return
        }
        let isSuccess = true
        ipcRenderer.on(`${taskToken}-data`, (_, data: SaveYakScriptToOnlineResponse) => {
            isSuccess = true
            if (data.Progress === 1 && data.MessageType === "finalError") {
                isSuccess = false
            }
            messageListRef.current = [...messageListRef.current, data]
            onUploadData(data)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            if (isSuccess) {
                onUploadSuccess()
                yakitNotify("success", "上传成功")
            } else {
                // 单个上传的时候，需要提示
                if (isSingle && pluginNameListRef.current.length === 1) {
                    const message = messageListRef.current
                        .filter((ele) => ele.MessageType === "error")
                        .map((ele) => ele.Message)
                    yakitNotify("error", "上传失败:" + message)
                    onUploadError()
                }
            }
            onUploadEnd()
            messageListRef.current = []
            pluginNameListRef.current = []
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            isSuccess = false
            messageListRef.current = []
            pluginNameListRef.current = []
            onUploadError()
            yakitNotify("error", "上传异常:" + e)
        })
        return () => {
            messageListRef.current = []
            pluginNameListRef.current = []
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
        pluginNameListRef.current = params.ScriptNames
        ipcRenderer.invoke("SaveYakScriptToOnline", params, taskToken)
    }
    const onCancel = () => {
        ipcRenderer.invoke("cancel-SaveYakScriptToOnline", taskToken)
    }
    return {onStart, onCancel} as const
}
