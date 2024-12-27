import {yakitNotify} from "@/utils/notification"
import {useEffect} from "react"
import {UploadImgType, UploadFileType} from "./constants"

const {ipcRenderer} = window.require("electron")

interface useUploadOSSHooks {
    taskToken?: string
    setUrl: (s: string) => void
    onUploadData: (progress: number) => void
    onUploadEnd?: () => void
    onUploadSuccess?: () => void
    onUploadError?: (error: string) => void
}

export type UploadImgTypeProps = `${UploadImgType}`
export type UploadFileTypeProps = `${UploadFileType}`

export interface UploadOSSStartProps {
    filePath: string
    /**type为notepad,该值必传 */
    filedHash: string
    type: UploadFileTypeProps
}

// 大文件上传,目前文件上传和图片上传分开的
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
    const onStart = (value: UploadOSSStartProps) => {
        const {filePath, filedHash, type} = value
        let enable = true
        switch (type) {
            case UploadFileType.Notepad:
                if (!filedHash) {
                    enable = false
                    yakitNotify("error", "useUploadOSSHooks:type为notepad,filedHash必传")
                }
                break
            default:
                break
        }
        if (enable) {
            const params = {
                url: "upload/bigfile",
                path: filePath,
                filedHash,
                type,
                token: taskToken
            }
            ipcRenderer.invoke("oss-split-upload", params)
        }
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
