import React, {useEffect, useMemo, useRef, useState} from "react"
import {NotepadExportProps, NotepadImportProps} from "./NotepadManageLocalType"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {Progress} from "antd"
import {NoteFilter, onOpenLocalFileByPath} from "../utils"
import {OutlineExportIcon, OutlineImportIcon} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import moment from "moment"
import { handleOpenFileSystemDialog, OpenDialogOptions, OpenDialogReturnValue } from "@/utils/fileSystemDialog"

import styles from "./NotepadImportAndExport.module.scss"
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
    const {onClose, onImportSuccessAfter, getContainer} = props

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
        const data: OpenDialogOptions = {
            title: "请选择文件",
            properties: ["openFile"]
        }
        handleOpenFileSystemDialog(data).then((data) => {
            if (data.filePaths.length > 0) {
                const filePath = data.filePaths[0].replace(/\\/g, "\\")
                const importParams: ImportNoteRequest = {
                    TargetPath: filePath
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
            heardIcon={<OutlineImportIcon style={{color: "var(--Colors-Use-Warning-Primary)"}} />}
            onCancel={() => {
                stopImport()
            }}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
            getContainer={getContainer}
            wrapClassName={styles["notepadImportModal"]}
        >
            <Progress
                strokeColor='var(--Colors-Use-Main-Primary)'
                trailColor='var(--Colors-Use-Neutral-Bg-Hover)'
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
    const {filter, onClose, getContainer} = props
    const [percent, setPercent] = useState<number>(0)
    const taskToken = useMemo(() => randomString(40), [])
    const [visible, setVisible] = useState<boolean>(false)

    const successRef = useRef<boolean>(true)
    const targetPathRef = useRef<string>("")

    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: ExportNoteResponse) => {
            const p = Math.floor(data.Percent * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            successRef.current = false
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
        const data: OpenDialogOptions = {
            title: "请选择文件夹",
            properties: ["openDirectory"]
        }
        handleOpenFileSystemDialog(data).then((data) => {
            const {filePaths} = data
            if (filePaths.length > 0) {
                const selectedPath = filePaths[0]
                const fileName = `笔记本-${moment().valueOf()}.zip`
                // 回退方案：根据平台使用适当的路径分隔符
                const separator = process.platform === "win32" ? "\\" : "/"
                targetPathRef.current = selectedPath + separator + fileName

                const exportParams: ExportNoteRequest = {
                    TargetPath: targetPathRef.current,
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
                successRef.current = false
                onEnd()
            }
        })
    }, [])
    const onEnd = useMemoizedFn(() => {
        if (successRef.current) {
            onOpenLocalFileByPath(targetPathRef.current)
        }
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
            heardIcon={<OutlineExportIcon style={{color: "var(--Colors-Use-Warning-Primary)"}} />}
            onCancel={() => {
                stopExport()
            }}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
            getContainer={getContainer}
            wrapClassName={styles["notepadExportModal"]}
        >
            <Progress
                strokeColor='var(--Colors-Use-Main-Primary)'
                trailColor='var(--Colors-Use-Neutral-Bg)'
                percent={percent}
                format={(percent) => `已导出 ${percent}%`}
            />
        </YakitHint>
    )
})
