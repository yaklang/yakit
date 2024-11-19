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
import {
    OutlineDocumentduplicateIcon,
    OutlineDownloadIcon,
    OutlineFolderIcon,
    OutlineUploadIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import numeral from "numeral"
import classNames from "classnames"
import {TooltipIcon} from "../Tooltip/Tooltip"
import {useMemoizedFn} from "ahooks"
import {callCopyToClipboard} from "@/utils/basic"
import {SolidXcircleIcon} from "@/assets/icon/solid"
import {DownloadingState} from "@/yakitGVDefine"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import React from "react"
import {SolidCloudDownloadIcon} from "@/assets/newIcon"
import {openABSFileLocated} from "@/utils/openWebsite"
import {safeFormatDownloadProcessState} from "@/components/layout/utils"

const {ipcRenderer} = window.require("electron")

interface CustomFileItem {
    name: string
    size: number
    type: string
    url: string
    path: string
}
interface DownFileInfoProps {
    url: string
    path: string
    fileName: string
}
const getFileName = (filePath) => {
    const match = filePath.match(/[^\\/]+$/) // 匹配最后的文件名
    return match ? match[0] : ""
}
const getTypeAndNameByPath = (path) => {
    const index = path.lastIndexOf(".")
    const fileType = path.substring(index, path.length)
    const fileName = path.split("\\").pop()
    return {fileType, fileName}
}
const urlTest = "https://yakit-online.oss-cn-hongkong.aliyuncs.com/notepade/418b8580-1731654345422-app.zip"
export const CustomFile = () => {
    const {node, contentRef, selected, setAttrs, view} = useNodeViewContext()
    const {attrs} = node
    const [fileInfo, setFileInfo] = useState<CustomFileItem>()
    const [percent, setPercent] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const [downLoading, setDownLoading] = useState<boolean>(false)
    const [downPercent, setDownPercent] = useState<string>()
    const [errorReason, setErrorReason] = useState<string>("")
    const [downFileInfo, setDownFileInfo] = useState<DownFileInfoProps>()
    const [visibleDownFiles, setVisibleDownFiles] = useState<boolean>(false)

    const uploadTokenRef = useRef(randomString(40))

    useEffect(() => {
        const {fileId, path: initPath} = attrs
        console.log("CustomFile-attrs", attrs)
        const path = initPath.replace(/\\/g, "\\")

        if (fileId !== "0") {
            //TODO - 通过fileId(文件链接获取文件信息)
            ipcRenderer
                .invoke("get-http-file-link-info", urlTest)
                .then((res) => {
                    const {fileType} = getTypeAndNameByPath(urlTest)
                    const item = {
                        name: res.fileName,
                        size: res.size,
                        type: fileType,
                        url: fileId,
                        path
                    }
                    console.log("get-http-file-link-info", item, res)
                    setFileInfo(item)
                })
                .catch((e) => {
                    yakitNotify("error", `获取文件信息错误${e}`)
                })
        } else if (path) {
            ipcRenderer
                .invoke("fetch-file-info-by-path", path)
                .then((fileInfo) => {
                    const {fileName, fileType} = getTypeAndNameByPath(path)
                    const item = {
                        name: fileName,
                        size: fileInfo.size,
                        type: fileType,
                        url: "",
                        path
                    }
                    console.log("fileInfo", fileInfo, item)
                    setFileInfo(item)
                    onUpload(path)
                })
                .catch((err) => {
                    failed(`获取文件信息失败:${err}`)
                })
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
                // setAttrs({path: "", fileId: res?.data})
                setAttrs({fileId: res?.data})
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
        console.log("oos-split-upload", {url: "upload/bigfile", path: filePath, token: uploadTokenRef.current})
        ipcRenderer.invoke("oos-split-upload", {url: "upload/bigfile", path: filePath, token: uploadTokenRef.current})
    }
    const onReloadUpload = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        if (fileInfo) onUpload(fileInfo.path)
    })
    const onCancel = useMemoizedFn(() => {
        console.log('cancel-oos-split-upload',uploadTokenRef.current)
        ipcRenderer.invoke("cancel-oos-split-upload", uploadTokenRef.current).then(() => {
            onRemoveFile()
        })
    })
    const renderType = () => {
        switch (fileInfo?.type) {
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
        const url = urlTest
        const fileName = getFileName(url)
        ipcRenderer.invoke("show-save-dialog", fileName).then((res) => {
            const {filePath, name} = res
            console.log("res", res, fileName)
            if (filePath) {
                const v = {
                    url: url,
                    path: filePath,
                    fileName: name
                }
                setDownFileInfo(v)
                if (fileInfo) setFileInfo({...fileInfo, path: filePath, name})
                setVisibleDownFiles(true)
            }
        })
    }
    const onCopyLink = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        console.log("onCopyLink", fileInfo)
        if (fileInfo?.url) {
            callCopyToClipboard(fileInfo.url).catch(() => {
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
    const onOpenFile = useMemoizedFn(() => {
        if (!fileInfo) return
        console.log("fileInfo?.path", fileInfo?.path)
        ipcRenderer
            .invoke("is-file-exists", fileInfo?.path)
            .then((flag: boolean) => {
                if (flag) {
                    openABSFileLocated(fileInfo?.path)
                } else {
                    setFileInfo({...fileInfo, path: ""})
                    yakitNotify("error", `目标文件已不存在`)
                }
            })
            .catch(() => {})
    })
    const onCancelDownload = useMemoizedFn(() => {
        if (fileInfo) setFileInfo({...fileInfo, path: ""})
        setVisibleDownFiles(false)
    })
    return (
        <>
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
                {fileInfo ? (
                    <div className={styles["file-custom-content"]}>
                        <div className={styles["file-type"]}>{renderType()}</div>
                        <div className={styles["file-info"]}>
                            <div className={styles["info-name"]}>{fileInfo.name}</div>
                            <div className={styles["info-size"]}>{numeral(fileInfo.size).format("0b")}</div>
                        </div>
                        <div className={styles["file-extra"]}>
                            {errorReason ? (
                                <div className={styles["error-action"]}>
                                    <Tooltip title={`${errorReason}`}>
                                        <div className={styles["x-circle-btn"]}>
                                            <SolidXcircleIcon
                                                className={styles["x-circle-icon"]}
                                                onClick={onRemoveFile}
                                            />
                                        </div>
                                    </Tooltip>
                                    <Tooltip title='上传失败，点击重新上传'>
                                        <YakitButton
                                            type='text2'
                                            icon={<OutlineUploadIcon />}
                                            onClick={onReloadUpload}
                                        />
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
                                            {fileInfo.path ? (
                                                <TooltipIcon
                                                    title='查看文件'
                                                    icon={<OutlineFolderIcon />}
                                                    onClick={onOpenFile}
                                                />
                                            ) : (
                                                <TooltipIcon
                                                    title='下载文件'
                                                    icon={<OutlineDownloadIcon />}
                                                    onClick={onDown}
                                                />
                                            )}
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
                    "文件加载中..."
                )}
            </div>
            {downFileInfo && (
                <DownFilesModal
                    url={downFileInfo.url}
                    fileName={downFileInfo.fileName}
                    path={downFileInfo.path}
                    visible={visibleDownFiles}
                    setVisible={setVisibleDownFiles}
                    onCancelDownload={onCancelDownload}
                />
            )}
        </>
    )
}

interface DownFilesModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
    url: string
    fileName: string
    path: string
    onCancelDownload: () => void
}
const DownFilesModal: React.FC<DownFilesModalProps> = React.memo((props) => {
    const {visible, setVisible, fileName, path, url, onCancelDownload} = props

    const [percent, setPercent] = useState<number>(0)

    useEffect(() => {
        ipcRenderer.on(`download-url-to-path-progress`, (e, data: {state: DownloadingState; openPath: string}) => {
            const {state} = data
            const newState = safeFormatDownloadProcessState(state)
            const newPercent = Math.trunc(newState.percent * 100)
            console.log("download-url-to-path-progress", data, newState, newPercent)
            setPercent(newPercent)
            if (newState.percent >= 1) {
                setVisible(false)
                setPercent(0)
            }
        })

        ipcRenderer.on(`download-url-to-path-progress-error`, (e, error) => {
            yakitNotify("error", `下载失败:${error}`)
        })

        ipcRenderer.on(`download-url-to-path-progress-finished`, (e) => {
            setVisible(false)
            setPercent(0)
        })

        return () => {
            ipcRenderer.removeAllListeners(`download-url-to-path-progress`)
            ipcRenderer.removeAllListeners(`download-url-to-path-progress-error`)
            ipcRenderer.removeAllListeners(`download-url-to-path-progress-finished`)
        }
    }, [])
    useEffect(() => {
        setPercent(0)
        if (!visible) return
        const value = {
            url,
            path,
            fileName
        }
        console.log("download-url-to-path", value)
        ipcRenderer.invoke("download-url-to-path", value)
    }, [visible])
    const onCancel = useMemoizedFn(() => {
        console.log("cancel-download-url-to-path", path)
        ipcRenderer
            .invoke("cancel-download-url-to-path", {path})
            .then(() => {
                onCancelDownload()
            })
            .catch((e) => {
                yakitNotify("error", `取消下载失败: ${e}`)
            })
    })
    return (
        <YakitHint
            visible={visible}
            title={<span className='content-ellipsis'>{`${fileName}下载中...`}</span>}
            heardIcon={<SolidCloudDownloadIcon style={{color: "var(--yakit-warning-5)"}} />}
            onCancel={onCancel}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
        >
            <div className={styles["download-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={percent}
                    format={(percent) => `已下载 ${percent}%`}
                />
            </div>
        </YakitHint>
    )
})
