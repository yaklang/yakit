import React, {useEffect, useMemo, useRef, useState} from "react"
import {NotepadExportProps, NotepadImportProps} from "./NotepadManageLocalType"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {Progress} from "antd"
import {NoteFilter, OpenDialogRequest, OpenDialogResponse, openDialog, showSaveDialog} from "../utils"
import {OutlineExportIcon, OutlineImportIcon} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

interface ImportNoteRequest {
    TargetPath: string
}
interface ImportNoteResponse {
    Percent: number
    Verbose: string
}

/**
 * @description 笔记本导入
 */
export const NotepadImport: React.FC<NotepadImportProps> = React.memo((props) => {
    const {onClose, onImportSuccessAfter} = props

    const [percent, setPercent] = useState<number>(0)
    const [visible, setVisible] = useState<boolean>(false)

    const successRef = useRef<boolean>(true)

    const taskToken = useMemo(() => randomString(40), [])

    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: ImportNoteResponse) => {
            const p = Math.floor(data.Percent * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            successRef.current = false
            yakitNotify("error", "导入失败:" + e)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            onEnd()
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    useEffect(() => {
        const data: OpenDialogRequest = {
            title: "请选择文件夹",
            properties: ["openDirectory"]
        }
        openDialog(data).then((data: OpenDialogResponse) => {
            if (data.filePaths.length > 0) {
                const importParams: ImportNoteRequest = {
                    TargetPath: data.filePaths[0]
                }
                setVisible(true)
                ipcRenderer
                    .invoke("ImportNote", importParams, taskToken)
                    .then(() => {})
                    .catch((e) => {
                        yakitNotify("error", `导入失败:${e}`)
                    })
            } else {
                successRef.current = false
                onEnd()
            }
        })
    }, [])

    const onEnd = useMemoizedFn(() => {
        if (successRef.current) {
            onImportSuccessAfter()
        }
        onClose()
        setVisible(false)
        setPercent(0)
    })

    const stopImport = () => {
        onEnd()
        ipcRenderer.invoke("cancel-ImportNote", taskToken).catch((e) => {
            yakitNotify("error", `停止导入:${e}`)
        })
    }
    return (
        <YakitHint
            visible={visible}
            title='笔记本导入中'
            heardIcon={<OutlineImportIcon style={{color: "var(--yakit-warning-5)"}} />}
            onCancel={() => {
                stopImport()
            }}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
        >
            <Progress
                strokeColor='#F28B44'
                trailColor='#F0F2F5'
                percent={percent}
                format={(percent) => `已导入 ${percent}%`}
            />
        </YakitHint>
    )
})

interface ExportNoteRequest {
    Filter: NoteFilter
    TargetPath: string
}
interface ExportNoteResponse {
    Percent: number
    Verbose: string
}

export const NotepadExport: React.FC<NotepadExportProps> = React.memo((props) => {
    const {filter, onClose} = props
    const [percent, setPercent] = useState<number>(0)
    const taskToken = useMemo(() => randomString(40), [])
    const [visible, setVisible] = useState<boolean>(false)

    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: ExportNoteResponse) => {
            const p = Math.floor(data.Percent * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            yakitNotify("error", "导出失败:" + e)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            onEnd()
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    useEffect(() => {
        const data: OpenDialogRequest = {
            title: "请选择文件夹",
            properties: ["openDirectory"]
        }
        openDialog(data).then((data: OpenDialogResponse) => {
            const {filePaths} = data
            if (filePaths.length > 0) {
                const exportParams: ExportNoteRequest = {
                    TargetPath: filePaths[0],
                    Filter: filter
                }
                setVisible(true)
                ipcRenderer
                    .invoke("ExportNote", exportParams, taskToken)
                    .then(() => {})
                    .catch((e) => {
                        yakitNotify("error", `导出失败:${e}`)
                    })
            } else {
                onEnd()
            }
        })
    }, [])
    const onEnd = useMemoizedFn(() => {
        onClose()
        setVisible(false)
        setPercent(0)
    })
    const stopExport = () => {
        onEnd()
        ipcRenderer.invoke("cancel-ExportNote", taskToken).catch((e) => {
            yakitNotify("error", `停止导出:${e}`)
        })
    }
    return (
        <YakitHint
            visible={visible}
            title='笔记本导出中'
            heardIcon={<OutlineExportIcon style={{color: "var(--yakit-warning-5)"}} />}
            onCancel={() => {
                stopExport()
            }}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
        >
            <Progress
                strokeColor='#F28B44'
                trailColor='#F0F2F5'
                percent={percent}
                format={(percent) => `已导出 ${percent}%`}
            />
        </YakitHint>
    )
})
