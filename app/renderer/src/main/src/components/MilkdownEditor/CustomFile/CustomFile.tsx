import {useNodeViewContext} from "@prosemirror-adapter/react"
import styles from "./CustomFile.module.scss"
import {useEffect, useRef, useState} from "react"
import {randomString} from "@/utils/randomUtil"
import {failed, yakitNotify} from "@/utils/notification"
import {
    IconNotepadFileTypeWord,
    IconNotepadFileTypeCompress,
    IconNotepadFileTypePPT,
    IconNotepadFileTypePdf,
    IconNotepadFileTypeUnknown,
    IconNotepadFileTypeExcel
} from "../icon/icon"
import {Progress, Tooltip} from "antd"
import {OutlineDocumentduplicateIcon, OutlineDownloadIcon, OutlineUploadIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import numeral from "numeral"
import classNames from "classnames"
import {TooltipIcon} from "../Tooltip/Tooltip"
import {useMemoizedFn} from "ahooks"
import {callCopyToClipboard} from "@/utils/basic"
import {saveAs} from "file-saver"
import {SolidXcircleIcon} from "@/assets/icon/solid"

const {ipcRenderer} = window.require("electron")

interface CustomFileItem {
    id: string
    name: string
    size: number
    type: string
    url: string
    path: string
}
export const CustomFile = () => {
    const {node, contentRef, selected, setAttrs, view} = useNodeViewContext()
    const {attrs} = node
    const [file, setFile] = useState<CustomFileItem>()
    const [percent, setPercent] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const [errorReason, setErrorReason] = useState<string>("")

    const uploadTokenRef = useRef(randomString(40))

    useEffect(() => {
        const {fileId, path: initPath} = attrs
        console.log("CustomFile-attrs", attrs)
        const path = initPath.replace(/\\/g, "\\")

        if (path) {
            ipcRenderer
                .invoke("fetch-file-info-by-path", path)
                .then((fileInfo) => {
                    const index = path.lastIndexOf(".")
                    const fileType = path.substring(index, path.length)
                    const fileName = path.split("\\").pop()
                    const item = {
                        id: fileInfo.uid,
                        name: fileName,
                        size: fileInfo.size,
                        type: fileType,
                        url: path,
                        path
                    }
                    console.log("fileInfo", fileInfo, item)
                    setFile(item)
                    onUpload(path)
                })
                .catch((err) => {
                    failed(`获取文件信息失败:${err}`)
                })
        } else {
        }
    }, [attrs])
    useEffect(() => {
        ipcRenderer.on(`oos-split-upload-${uploadTokenRef.current}-data`, async (e, resData) => {
            console.log("split-upload", resData)
            const {progress, res} = resData
            const p = Math.trunc(progress)
            if (p >= 100) setLoading(false)
            setPercent(p)
            if (res?.code === 200 && typeof res?.data === "string") {
                setAttrs({path: "", fileId: res?.data})
            }
            if (res?.code === 209) {
                setErrorReason(res?.data?.reason || "")
            }
        })
        ipcRenderer.on(`oos-split-upload-${uploadTokenRef.current}-error`, async (e, error) => {
            console.log("split-upload-error", error)
            setErrorReason(`项目上传失败:${error}`)
            failed(`项目上传失败:${error}`)
        })
        ipcRenderer.on(`oos-split-upload-${uploadTokenRef.current}-end`, async (e, error) => {
            console.log("split-upload-end")
            setLoading(false)
            setPercent(0)
        })
        return () => {
            ipcRenderer.removeAllListeners(`oos-split-upload-${uploadTokenRef.current}-data`)
            ipcRenderer.removeAllListeners(`oos-split-upload-${uploadTokenRef.current}-error`)
            ipcRenderer.removeAllListeners(`oos-split-upload-${uploadTokenRef.current}-end`)
        }
    }, [])
    const onUpload = (filePath) => {
        if (!filePath) return
        setLoading(true)
        setErrorReason("")
        setPercent(0)
        console.log("filePath", filePath)
        ipcRenderer.invoke("oos-split-upload", {url: "upload/bigfile", path: filePath, token: uploadTokenRef.current})
    }
    const onReloadUpload = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        if (file) onUpload(file.path)
    })
    const onCancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-oos-split-upload", uploadTokenRef.current).then(() => {
            onRemoveFile()
        })
    })
    const renderType = () => {
        switch (file?.type) {
            case ".doc":
                return <IconNotepadFileTypeWord />
            case ".zip":
            case ".7z":
            case ".tar":
                return <IconNotepadFileTypeCompress />
            case ".ppt":
                return <IconNotepadFileTypePPT />
            case ".csv":
                return <IconNotepadFileTypeExcel />
            case ".pdf":
                return <IconNotepadFileTypePdf />
            default:
                return <IconNotepadFileTypeUnknown />
        }
    }
    const onDown = (e) => {
        e.stopPropagation()
        e.preventDefault()
        // const url = "https://yaklang.oss-cn-beijing.aliyuncs.com/yak/1.3.7-1108/Yakit-1.3.7-1108-windows-amd64.exe"
        // const v = {
        //     url: url,
        //     path: "F://笔记本下载测试文件夹//1114",
        //     fileName: "Yakit-1.3.7-1108-windows-amd64.exe"
        // }
        // ipcRenderer.invoke("download-url-to-path", v)
        // ipcRenderer.invoke("show-save-dialog", "F://笔记本下载测试文件夹//1114").then((res) => {
        //     console.log("res", res)
        //     const url =
        //         "https://yakit-online.oss-cn-hongkong.aliyuncs.com/notepade/e2e060f8-1731900981590-Downloads.zip"
        //     const v = {
        //         url: url,
        //         path: "F://笔记本下载测试文件夹//1114",
        //         fileName: "Yakit-1.3.7-1108-windows-amd64.exe"
        //     }
        //     ipcRenderer.invoke("download-url-to-path", v)
        // })
    }
    const onCopyLink = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        if (file?.url) {
            callCopyToClipboard(file.url).catch(() => {
                yakitNotify("error", "复制失败")
            })
        } else {
            yakitNotify("error", "复制失败")
        }
    })
    const onRemoveFile = useMemoizedFn(() => {
        const {state, dispatch} = view
        const {from, to} = state.selection

        // 如果选区是有效的
        if (from !== to) {
            // 创建一个事务来删除选中的范围
            const tr = state.tr.delete(from, to)

            // 提交事务
            if (dispatch) {
                dispatch(tr)
            }
        } else {
            // 如果没有选中任何内容（光标仅在一个位置），删除当前节点
            const selectedNode = state.doc.nodeAt(from)

            if (selectedNode) {
                // 使用 replaceRange 来删除选中的节点
                const tr = state.tr.delete(from - selectedNode.nodeSize, from)

                // 提交事务
                if (dispatch) {
                    dispatch(tr)
                }
            }
        }
    })
    return (
        <div
            className={classNames(styles["file-custom"], {
                [styles["file-custom-selected"]]: selected
            })}
            ref={contentRef}
            onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
            }}
        >
            {file ? (
                <div className={styles["file-custom-content"]}>
                    <div className={styles["file-type"]}>{renderType()}</div>
                    <div className={styles["file-info"]}>
                        <div className={styles["info-name"]}>{file.name}</div>
                        <div className={styles["info-size"]}>{numeral(file.size).format("0b")}</div>
                    </div>
                    <div className={styles["file-extra"]}>
                        {errorReason ? (
                            <div className={styles["error-action"]}>
                                <Tooltip title={`${errorReason}`}>
                                    <div className={styles["x-circle-btn"]}>
                                        <SolidXcircleIcon className={styles["x-circle-icon"]} onClick={onRemoveFile} />
                                    </div>
                                </Tooltip>
                                <Tooltip title='上传失败，点击重新上传'>
                                    <YakitButton type='text2' icon={<OutlineUploadIcon />} onClick={onReloadUpload} />
                                </Tooltip>
                            </div>
                        ) : (
                            <>
                                {loading ? (
                                    <div className={styles["loading"]}>
                                        <div className={styles["percent-loading"]}>
                                            <span>{percent}%</span>
                                            <Progress
                                                strokeColor='#F28B44'
                                                trailColor='#F0F2F5'
                                                type='circle'
                                                percent={percent}
                                                width={20}
                                                format={() => null}
                                                strokeWidth={12}
                                            />
                                        </div>
                                        <YakitButton
                                            className={styles["x-btn"]}
                                            type='text2'
                                            icon={<OutlineXIcon />}
                                            onClick={onCancel}
                                        />
                                    </div>
                                ) : (
                                    <div className={styles["success-action"]}>
                                        <TooltipIcon title='下载文件' icon={<OutlineDownloadIcon />} onClick={onDown} />
                                        <TooltipIcon
                                            title={`复制链接`}
                                            icon={<OutlineDocumentduplicateIcon />}
                                            onClick={onCopyLink}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ) : (
                "已损坏文件"
            )}
            {/* <div className={styles["tooltip-action"]}>
                <TooltipIcon title='下载文件' icon={<OutlineDownloadIcon />} onClick={onDown} />
                <TooltipIcon title={`复制链接`} icon={<OutlineDocumentduplicateIcon />} onClick={onCopyLink} />
            </div> */}
        </div>
    )
}
