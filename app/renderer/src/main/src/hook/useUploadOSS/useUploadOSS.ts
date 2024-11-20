import {yakitNotify} from "@/utils/notification"
import {useEffect} from "react"

const {ipcRenderer} = window.require("electron")

interface useUploadOSSHooks {
    taskToken?: string
    setUrl: (s: string) => void
    onUploadData: (progress: number) => void
    onUploadEnd?: () => void
    onUploadSuccess?: () => void
    onUploadError?: (error: string) => void
}

export default function useUploadOSSHooks(props: useUploadOSSHooks) {
    const {taskToken, setUrl, onUploadData, onUploadSuccess, onUploadEnd, onUploadError} = props

    useEffect(() => {
        let errorReason = ""
        ipcRenderer.on(`oss-split-upload-${taskToken}-data`, async (e, resData) => {
            const {progress, res} = resData
            const p = Math.trunc(progress)
            onUploadData(p)
            if (res?.code === 200 && typeof res?.data === "string") {
                const url = res?.data || ""
                setUrl(url)
            }
        })
        ipcRenderer.on(`oss-split-upload-${taskToken}-error`, async (e, error) => {
            errorReason = error
            onUploadError && onUploadError(`${error}`)
            yakitNotify("error", `项目上传失败:${error}`)
        })
        ipcRenderer.on(`oss-split-upload-${taskToken}-end`, async (e, error) => {
            if (!errorReason) {
                onUploadSuccess && onUploadSuccess()
            }
            onUploadEnd && onUploadEnd()
        })
        return () => {
            ipcRenderer.removeAllListeners(`oss-split-upload-${taskToken}-data`)
            ipcRenderer.removeAllListeners(`oss-split-upload-${taskToken}-error`)
            ipcRenderer.removeAllListeners(`oss-split-upload-${taskToken}-end`)
        }
    }, [])
    const onStart = (filePath: string) => {
        ipcRenderer.invoke("oss-split-upload", {
            url: "upload/bigfile",
            path: filePath,
            token: taskToken
        })
    }
    const onCancel = () => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("cancel-oss-split-upload", taskToken)
                .then(resolve)
                .catch((e) => {
                    yakitNotify("error", `取消上传失败: ${e}`)
                    reject(e)
                })
        })
    }
    return {onStart, onCancel} as const
}
