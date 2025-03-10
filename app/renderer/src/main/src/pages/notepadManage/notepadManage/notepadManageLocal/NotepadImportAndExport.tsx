import React, {useEffect, useMemo, useState} from "react"
import {NotepadExportProps, NotepadImportProps} from "./NotepadManageLocalType"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {Progress} from "antd"
import {ImportSvgIcon} from "@/assets/newIcon"
import {NoteFilter, showSaveDialog} from "../utils"

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
    const taskToken = useMemo(() => randomString(40), [])

    useEffect(() => {
        if (!taskToken) {
            return
        }
        let success = true
        ipcRenderer.on(`${taskToken}-data`, (_, data: ImportNoteResponse) => {
            const p = Math.floor(data.Percent * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            success = false
            yakitNotify("error", "导入失败:" + e)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            if (success) {
                onImportSuccessAfter()
            }
            onClose()
            setPercent(0)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    useEffect(() => {
        showSaveDialog().then((res) => {
            const {filePath} = res
            const importParams: ImportNoteRequest = {
                TargetPath: filePath
            }
            ipcRenderer
                .invoke("ImportNote", importParams, taskToken)
                .then(() => {})
                .catch((e) => {
                    yakitNotify("error", `导入失败:${e}`)
                })
        })
    }, [])
    const stopImport = () => {
        ipcRenderer.invoke("cancel-ImportNote", taskToken).catch((e) => {
            yakitNotify("error", `停止导入:${e}`)
        })
    }
    return (
        <YakitHint
            visible={true}
            title='笔记本导入中'
            heardIcon={<ImportSvgIcon style={{color: "var(--yakit-warning-5)"}} />}
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
export const NotepadExport: React.FC<NotepadExportProps> = React.memo((props) => {
    const {filter, onClose} = props
    const [percent, setPercent] = useState<number>(0)
    const taskToken = useMemo(() => randomString(40), [])

    useEffect(() => {
        if (!taskToken) {
            return
        }
        let success = true
        ipcRenderer.on(`${taskToken}-data`, (_, data: ImportNoteResponse) => {
            const p = Math.floor(data.Percent * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            success = false
            yakitNotify("error", "导入失败:" + e)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            onClose()
            setPercent(0)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    useEffect(() => {
        showSaveDialog().then((res) => {
            const {filePath} = res
            const exportParams: ExportNoteRequest = {
                TargetPath: filePath,
                Filter:filter
            }
            ipcRenderer
                .invoke("ExportNote", exportParams, taskToken)
                .then(() => {})
                .catch((e) => {
                    yakitNotify("error", `导出失败:${e}`)
                })
        })
    }, [])
    const stopExport = () => {
        ipcRenderer.invoke("cancel-ExportNote", taskToken).catch((e) => {
            yakitNotify("error", `停止导出:${e}`)
        })
    }
    return (
        <YakitHint
            visible={true}
            title='笔记本导入中'
            heardIcon={<ImportSvgIcon style={{color: "var(--yakit-warning-5)"}} />}
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
