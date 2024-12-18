import {useNodeViewContext} from "@prosemirror-adapter/react"
import styles from "./CustomFile.module.scss"
import {useEffect, useRef, useState, ReactNode} from "react"
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
    OutlineRefreshIcon,
    OutlineUploadIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import numeral from "numeral"
import classNames from "classnames"
import {TooltipIcon} from "../Tooltip/Tooltip"
import {useMemoizedFn} from "ahooks"
import {SolidXcircleIcon} from "@/assets/icon/solid"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import React from "react"
import {SolidCloudDownloadIcon} from "@/assets/newIcon"
import useDownloadUrlToLocalHooks, {DownloadUrlToLocal} from "@/hook/useDownloadUrlToLocal/useDownloadUrlToLocal"
import {onOpenLocalFileByPath, saveDialogAndGetLocalFileInfo} from "@/pages/notepadManage/notepadManage/utils"
import {YakitHintProps} from "@/components/yakitUI/YakitHint/YakitHintType"
import useUploadOSSHooks, {UploadOSSStartProps} from "@/hook/useUploadOSS/useUploadOSS"
import {getHttpFileLinkInfo, getLocalFileLinkInfo} from "./utils"
import {setClipboardText} from "@/utils/clipboard"
import {uploadBigFileType} from "@/hook/useUploadOSS/constants"

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
/**上传文件后,后端拼接hash和文件名的字符:&*&;方便截取文件名 */
export const getTypeAndNameByPath = (path) => {
    let newPath = path
    const firstIndex = newPath.indexOf("&*&")
    if (firstIndex !== -1) {
        newPath = path.substring(firstIndex + 3, path.length)
    }
    const index = newPath.lastIndexOf(".")
    const fileType = newPath.substring(index, newPath.length)
    const fileName = newPath.split("\\").pop()
    return {fileType, fileName}
}
export const CustomFile: React.FC = () => {
    const {node, contentRef, selected, setAttrs, view} = useNodeViewContext()
    const {attrs} = node
    const [fileInfo, setFileInfo] = useState<CustomFileItem>({
        name: "",
        size: 0,
        type: "",
        url: "",
        path: ""
    })
    const [percent, setPercent] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const [errorReason, setErrorReason] = useState<string>("")
    const [downFileInfo, setDownFileInfo] = useState<DownFileInfoProps>()
    const [visibleDownFiles, setVisibleDownFiles] = useState<boolean>(false)
    const [queryFileErrorInfo, setQueryFileErrorInfo] = useState<string>("")
    const [loadingRefresh, setLoadingRefresh] = useState<boolean>(false)

    const uploadTokenRef = useRef(randomString(40))

    useEffect(() => {
        const {fileId, path: initPath} = attrs
        const path = initPath.replace(/\\/g, "\\")
        if (fileId !== "0") {
            getFileInfoByLink()
        } else if (path) {
            getLocalFileLinkInfo(path).then((fileInfo) => {
                const {fileName, fileType} = getTypeAndNameByPath(path)
                const item = {
                    name: fileName,
                    size: fileInfo.size,
                    type: fileType,
                    url: "",
                    path
                }
                setFileInfo(item)
                onUpload(path)
            })
        }
    }, [])
    const {onStart: onStartUpload, onCancel: onUploadCancel} = useUploadOSSHooks({
        taskToken: uploadTokenRef.current,
        onUploadData: (p) => {
            if (p >= 100) setLoading(false)
            setPercent(p)
        },
        onUploadEnd: () => {
            setLoading(false)
            setPercent(0)
        },
        onUploadError: (reason) => {
            setErrorReason(reason || "")
        },
        setUrl: (url) => {
            setAttrs({fileId: url})
            setFileInfo((v) => ({...v, url}))
        }
    })

    const getFileInfoByLink = useMemoizedFn(() => {
        const {fileId, path: initPath} = attrs
        const path = initPath.replace(/\\/g, "\\")
        if (fileId !== "0") {
            setLoadingRefresh(true)
            getHttpFileLinkInfo(fileId, true)
                .then((res) => {
                    const {fileType, fileName} = getTypeAndNameByPath(fileId)
                    const item = {
                        name: fileName,
                        size: res.size,
                        type: fileType,
                        url: fileId,
                        path
                    }
                    setFileInfo(item)
                })
                .catch((e) => {
                    setTimeout(() => {
                        setQueryFileErrorInfo(`${e}`)
                    }, 500)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoadingRefresh(false)
                    }, 200)
                )
        }
    })
    const onUpload = (filePath) => {
        if (!filePath) return
        setLoading(true)
        setErrorReason("")
        setPercent(0)
        const value: UploadOSSStartProps = {
            filePath,
            filedHash: attrs?.notepadHash || "",
            type: uploadBigFileType.notepad
        }
        onStartUpload(value)
    }
    const onReloadUpload = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        if (fileInfo) onUpload(fileInfo.path)
    })
    const onCancel = useMemoizedFn(() => {
        onUploadCancel().then(() => {
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
        const {fileId} = attrs
        saveDialogAndGetLocalFileInfo(fileId).then((v) => {
            setDownFileInfo(v)
            setFileInfo({...fileInfo, path: v.path})
            setVisibleDownFiles(true)
        })
    }
    const onCopyLink = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        if (fileInfo?.url) {
            setClipboardText(fileInfo.url, {
                failedCallback: () => {
                    yakitNotify("error", "复制失败")
                }
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
        onOpenLocalFileByPath(fileInfo?.path).then((flag) => {
            if (!flag) {
                setFileInfo({...fileInfo, path: ""})
            }
        })
    })
    const onCancelDownload = useMemoizedFn(() => {
        setFileInfo({...fileInfo, path: ""})
        setVisibleDownFiles(false)
    })
    const onRefreshFileInfo = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        setQueryFileErrorInfo("")
        getFileInfoByLink()
    })
    const errorNode = useMemoizedFn((error) => {
        return (
            <Tooltip title={`${error}`}>
                <div className={styles["x-circle-btn"]}>
                    <SolidXcircleIcon className={styles["x-circle-icon"]} onClick={onRemoveFile} />
                </div>
            </Tooltip>
        )
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
                {!!(fileInfo.path || fileInfo.url) ? (
                    <CustomFileItem
                        title={renderType()}
                        subTitle={fileInfo.name}
                        describe={numeral(fileInfo.size).format("0b")}
                        extra={
                            errorReason ? (
                                <div className={styles["error-action"]}>
                                    {errorNode(errorReason)}
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
                            )
                        }
                    />
                ) : queryFileErrorInfo ? (
                    <CustomFileItem
                        title={renderType()}
                        subTitle='获取文件信息错误'
                        extra={
                            <>
                                <div className={styles["error-action"]}>
                                    {errorNode(queryFileErrorInfo)}
                                    <Tooltip title='重新获取文件信息'>
                                        <YakitButton
                                            type='text2'
                                            icon={<OutlineRefreshIcon />}
                                            loading={loadingRefresh}
                                            onClick={onRefreshFileInfo}
                                        />
                                    </Tooltip>
                                </div>
                            </>
                        }
                    />
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
    fileName?: string
    path: string
    onCancelDownload: () => void
    yakitHintProps?: Omit<YakitHintProps, "visible" | "onCancel">
}
export const DownFilesModal: React.FC<DownFilesModalProps> = React.memo((props) => {
    const {visible, setVisible, fileName, path, url, onCancelDownload, yakitHintProps} = props

    const [percent, setPercent] = useState<number>(0)

    const taskTokenRef = useRef(randomString(40))

    const onProgressData = useMemoizedFn((newState) => {
        const newPercent = Math.trunc(newState.percent * 100)
        setPercent(newPercent)
        if (newState.percent >= 1) {
            setVisible(false)
            setPercent(0)
        }
    })

    const {onStart, onCancel: onNotepadDownCancel} = useDownloadUrlToLocalHooks({
        path,
        taskToken: taskTokenRef.current,
        onUploadData: onProgressData,
        onUploadEnd: () => {
            setVisible(false)
            setPercent(0)
        }
    })
    useEffect(() => {
        if (visible) {
            const value: DownloadUrlToLocal = {
                onlineUrl: url,
                localPath: path
            }
            onStart(value)
        } else {
            onNotepadDownCancel()
            setPercent(0)
        }
    }, [visible])
    const onCancel = useMemoizedFn(() => {
        onNotepadDownCancel().then(() => {
            onCancelDownload()
        })
    })
    return (
        <YakitHint
            heardIcon={<SolidCloudDownloadIcon style={{color: "var(--yakit-warning-5)"}} />}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
            title={fileName ? <span className='content-ellipsis'>{`${fileName}下载中...`}</span> : "下载中"}
            {...(yakitHintProps || {})}
            onCancel={onCancel}
            visible={visible}
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

interface CustomFileItemProps {
    title: ReactNode
    subTitle: ReactNode
    describe?: ReactNode
    extra: ReactNode
}
const CustomFileItem: React.FC<CustomFileItemProps> = React.memo((props) => {
    const {extra, title, subTitle, describe} = props
    return (
        <div className={styles["file-custom-content"]}>
            <div className={styles["file-type"]}>{title}</div>
            <div className={styles["file-info"]}>
                <div className={styles["info-name"]}>{subTitle}</div>
                {describe && <div className={styles["info-size"]}>{describe}</div>}
            </div>
            <div className={styles["file-extra"]}>{extra}</div>
        </div>
    )
})
