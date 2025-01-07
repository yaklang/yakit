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

export interface DownloadUrlToLocal {
    /**下载的链接 */
    onlineUrl: string
    /**保存到本地的地址 */
    localPath: string
    /**是否需要编码,默认编码 */
    isEncodeURI?: boolean
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
        ipcRenderer.on(`download-url-to-path-progress-finished`, (e) => {
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
    const onStart = (uploadParams: DownloadUrlToLocal) => {
        const params = {
            url: uploadParams.onlineUrl,
            path: uploadParams.localPath,
            isEncodeURI: uploadParams.isEncodeURI === false ? false : true
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
