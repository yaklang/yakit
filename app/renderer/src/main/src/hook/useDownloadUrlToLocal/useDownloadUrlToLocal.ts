import {safeFormatDownloadProcessState} from "@/components/layout/utils"
import {yakitNotify} from "@/utils/notification"
import {DownloadingState} from "@/yakitGVDefine"
import {useEffect, useRef} from "react"

const {ipcRenderer} = window.require("electron")

interface DownloadUrlToLocalHooks {
    /**为同时多个下载准备 */
    taskToken?: string
    /**保存到本地的地址 */
    path: string
    onUploadData: (state: DownloadingState) => void
    onUploadEnd?: () => void
    onUploadSuccess?: () => void
    onUploadError?: () => void
}

interface DownloadUrlToLocal {
    /**下载的链接 */
    url: string
    /**保存到本地的地址 */
    path: string
}

export default function useDownloadUrlToLocalHooks(props: DownloadUrlToLocalHooks) {
    const {path, taskToken, onUploadData, onUploadSuccess, onUploadEnd, onUploadError} = props

    useEffect(() => {
        let isSuccess = true
        ipcRenderer.on(`download-url-to-path-progress`, (e, data: {state: DownloadingState; openPath: string}) => {
            const {state} = data
            const newState = safeFormatDownloadProcessState(state)
            isSuccess = true
            onUploadData(newState)
        })

        ipcRenderer.on(`download-url-to-path-progress-error`, (e, error) => {
            isSuccess = false
            onUploadError && onUploadError()
            yakitNotify("error", `下载失败:${error}`)
        })

        ipcRenderer.on(`download-url-to-path-progress-finished-`, (e) => {
            if (isSuccess) {
                onUploadSuccess && onUploadSuccess()
            }
            onUploadEnd && onUploadEnd()
        })

        return () => {
            ipcRenderer.removeAllListeners(`download-url-to-path-progress`)
            ipcRenderer.removeAllListeners(`download-url-to-path-progress-error`)
            ipcRenderer.removeAllListeners(`download-url-to-path-progress-finished`)
        }
    }, [])
    const onStart = (uploadParams) => {
        console.log("download-url-to-path", uploadParams)
        const params: DownloadUrlToLocal = {
            ...uploadParams
        }
        ipcRenderer.invoke("download-url-to-path", params)
    }
    const onCancel = () => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("cancel-download-url-to-path", {path})
                .then(resolve)
                .catch((e) => {
                    yakitNotify("error", `取消下载失败: ${e}`)
                    reject(e)
                })
        })
    }
    return {onStart, onCancel} as const
}
