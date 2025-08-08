import React, {useEffect, useMemo, useRef, useState} from "react"
import {Divider, Progress, Tooltip} from "antd"
import {
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useMemoizedFn,
    useSize,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
import styles from "./NewPayload.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineClipboardcopyIcon,
    OutlineCogIcon,
    OutlineDatabasebackupIcon,
    OutlineDocumentduplicateIcon,
    OutlineExportIcon,
    OutlineFolderaddIcon,
    OutlineImportIcon,
    OutlinePaperclipIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlineRefreshIcon,
    OutlineSparklesIcon,
    OutlineTrashIcon,
    OutlineUploadIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {OutlineAddPayloadIcon, PropertyIcon, PropertyNoAddIcon} from "./icon"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {
    DragDropContext,
    Droppable,
    Draggable,
    BeforeCapture,
    DropResult,
    ResponderProvided,
    DragStart,
    DragUpdate
} from "@hello-pangea/dnd"
import {
    SolidChevrondownIcon,
    SolidChevronrightIcon,
    SolidDatabaseIcon,
    SolidDocumentdownloadIcon,
    SolidDocumenttextIcon,
    SolidDotsverticalIcon,
    SolidDragsortIcon,
    SolidFolderopenIcon,
    SolidStoreIcon,
    SolidXcircleIcon
} from "@/assets/icon/solid"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import Dragger from "antd/lib/upload/Dragger"
import {v4 as uuidv4} from "uuid"
import {DeletePayloadProps, NewPayloadTable, Payload, QueryPayloadParams} from "./PayloadLocalTable"
import {PaginationSchema, QueryGeneralResponse} from "../invoker/schema"
import {randomString} from "@/utils/randomUtil"
import _isEqual from "lodash/isEqual"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import emiter from "@/utils/eventBus/eventBus"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakEditor} from "@/utils/editors"
import {openABSFile, openABSFileLocated} from "@/utils/openWebsite"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {setClipboardText} from "@/utils/clipboard"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {isEnpriTrace} from "@/utils/envfile"
import {NewPayloadOnlineList} from "./onlinePayload/NewPayloadOnlineList"
import {UserInfoProps, useStore} from "@/store"
import {
    apiDeleteOnlinePayloadList,
    apiGetOnlinePayloadFile,
    apiGetOnlinePayloadList,
    apiUpdateOnlinePayloadFile
} from "./utils"
import {DeleteOnlinePayloadProps, NewPayloadOnlineTable} from "./onlinePayload/PayloadOnlineTable"
import {API} from "@/services/swagger/resposeType"
import {useTheme} from "@/hook/useTheme"
const {ipcRenderer} = window.require("electron")

// 是否为Payload操作员
export const isPayloadOperator = (userInfo?: UserInfoProps) =>
    userInfo?.isLogin && ["admin", "auditor"].includes(userInfo?.role || "")

interface UploadStatusInfoProps {
    title: string
    streamData: SavePayloadProgress
    cancelRun: () => void
    logInfo: string[]
    // 是否显示 剩余时间-耗时-下载速度 默认不显示
    showDownloadDetail?: boolean
    // 是否自动关闭
    autoClose?: boolean
    // 关闭
    onClose?: () => void
}

export const UploadStatusInfo: React.FC<UploadStatusInfoProps> = (props) => {
    const {title, streamData, logInfo, cancelRun, onClose, showDownloadDetail = true, autoClose} = props
    useEffect(() => {
        if (autoClose && streamData.Progress === 1) {
            onClose && onClose()
        }
    }, [autoClose, streamData.Progress])

    return (
        <div className={styles["yaklang-engine-hint-wrapper"]}>
            <div className={styles["hint-left-wrapper"]}>
                <div className={styles["hint-icon"]}>
                    <SolidDocumentdownloadIcon />
                </div>
            </div>

            <div className={styles["hint-right-wrapper"]}>
                <div className={styles["hint-right-download"]}>
                    <div className={styles["hint-right-title"]}>{title}</div>
                    <div className={classNames(styles["download-progress"], "yakit-progress-wrapper")}>
                        <Progress
                            strokeColor='var(--Colors-Use-Main-Primary)'
                            trailColor='var(--Colors-Use-Neutral-Bg)'
                            percent={Math.floor((streamData.Progress || 0) * 100)}
                            showInfo={false}
                        />
                        <div className={styles["progress-title"]}>进度 {Math.round(streamData.Progress * 100)}%</div>
                    </div>
                    {showDownloadDetail && (
                        <div className={styles["download-info-wrapper"]}>
                            {/* <div>剩余时间 : {streamData.Progress === 1 ? "0s" : streamData.RestDurationVerbose}</div>
                            <div className={styles["divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div> */}
                            <div>耗时 : {streamData.CostDurationVerbose}</div>
                            {/* <div className={styles["divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <div>下载速度 : {streamData.Speed}M/s</div> */}
                        </div>
                    )}
                    <div className={styles["log-info"]}>
                        {logInfo.map((item) => (
                            <div key={item} className={styles["log-item"]}>
                                {item}
                            </div>
                        ))}
                    </div>
                    <div className={styles["download-btn"]}>
                        <YakitButton loading={false} size='large' type='outline2' onClick={cancelRun}>
                            取消
                        </YakitButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
interface CreateDictionariesProps {
    type: "dictionaries" | "payload"
    onClose: () => void
    title: string
    onQueryGroup: (obj?: {Group: string; Folder: string}) => void
    folder?: string
    group?: string
}

export interface SavePayloadProgress {
    Progress: number
    Speed: string
    CostDurationVerbose: string
    RestDurationVerbose: string
    Message: string
}

// 新建字典
export const CreateDictionaries: React.FC<CreateDictionariesProps> = (props) => {
    const {onClose, type, title, onQueryGroup, folder, group} = props
    const isDictionaries = type === "dictionaries"
    // 可上传文件类型
    const FileType = ["text/plain", "text/csv"]
    // 收集上传的数据
    const [dictionariesName, setDictionariesName] = useState<string>("")
    const [uploadList, setUploadList] = useState<{path: string; name: string}[]>([])
    const [editorValue, setEditorValue] = useState<string>("")
    // token
    const [token, setToken] = useState(randomString(20))
    const [fileToken, setFileToken] = useState(randomString(20))
    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>()
    const logInfoRef = useRef<string[]>([])
    // 提示重复，不关闭Modal
    const messageWarnRef = useRef<boolean>(false)

    // 上传文件/手动输入
    const [uploadType, setUploadType] = useState<"dragger" | "editor" | "large-dragger">("dragger")

    // 存储类型
    const [storeType, setStoreType] = useState<"database" | "file">()

    const isDisabled = useMemo(() => {
        if (isDictionaries && ["dragger", "large-dragger"].includes(uploadType)) {
            return uploadList.length === 0 || dictionariesName.length === 0
        }
        if (isDictionaries && uploadType === "editor") {
            return editorValue.length === 0 || dictionariesName.length === 0
        }
        return ["dragger", "large-dragger"].includes(uploadType) ? uploadList.length === 0 : editorValue.length === 0
    }, [uploadList, dictionariesName, isDictionaries, uploadType, editorValue])

    // 数据库存储
    const onSavePayload = useMemoizedFn(() => {
        setStoreType("database")
        ipcRenderer.invoke(
            "SavePayloadStream",
            {
                IsFile: uploadType === "dragger",
                IsNew: isDictionaries,
                Content: editorValue,
                FileName: uploadList.map((item) => item.path),
                Group: group || dictionariesName,
                Folder: folder || ""
            },
            token
        )
    })

    // 文件存储
    const onSavePayloadToFile = useMemoizedFn(() => {
        setStoreType("database")
        if (uploadType === "large-dragger") {
            ipcRenderer.invoke(
                "SavePayloadToLargeFileStream",
                {
                    IsFile: true,
                    IsNew: true,
                    Content: editorValue,
                    FileName: uploadList.map((item) => item.path),
                    Group: group || dictionariesName,
                    Folder: folder || ""
                },
                fileToken
            )
        } else {
            // 两次stream
            ipcRenderer.invoke(
                "SavePayloadToFileStream",
                {
                    IsFile: uploadType === "dragger",
                    IsNew: true,
                    Content: editorValue,
                    FileName: uploadList.map((item) => item.path),
                    Group: group || dictionariesName,
                    Folder: folder || ""
                },
                fileToken
            )
        }
    })

    // 取消数据库任务
    const cancelSavePayload = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SavePayload", token)
    })

    // 取消文件存储任务
    const cancelSavePayloadFile = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SavePayloadFile", fileToken)
    })

    // 取消大文件存储任务
    const cancelSavePayloadLargeFile = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SavePayloadLargeFile", fileToken)
    })

    // 监听数据库任务
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    setStreamData(data)
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            if (error === `group[${group || dictionariesName}] exist`) {
                messageWarnRef.current = true
                warn("字典名重复")
                return
            }
            failed(`[SavePayload] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            if (messageWarnRef.current) {
                messageWarnRef.current = false
                return
            }
            info("[SavePayload] finished")
            logInfoRef.current = []
            cancelRun()
        })

        return () => {
            ipcRenderer.invoke("cancel-SavePayload", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [group, dictionariesName])

    // 监听文件存储任务
    useEffect(() => {
        ipcRenderer.on(`${fileToken}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                    if (data.Message === "step2" && data.Progress === 1) {
                        setStoreType("file")
                    }
                    setStreamData(data)
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${fileToken}-error`, (e: any, error: any) => {
            if (error === `group[${group || dictionariesName}] exist`) {
                messageWarnRef.current = true
                warn("字典名重复")
                return
            }
            failed(`[SavePayloadFile] error:  ${error}`)
        })
        ipcRenderer.on(`${fileToken}-end`, (e: any, data: any) => {
            if (messageWarnRef.current) {
                messageWarnRef.current = false
                return
            }
            info("[SavePayloadFile] finished")
            logInfoRef.current = []
            cancelRun()
        })

        return () => {
            ipcRenderer.invoke("cancel-SavePayloadFile", fileToken)
            ipcRenderer.removeAllListeners(`${fileToken}-data`)
            ipcRenderer.removeAllListeners(`${fileToken}-error`)
            ipcRenderer.removeAllListeners(`${fileToken}-end`)
        }
    }, [group, dictionariesName])

    const cancelRun = useMemoizedFn(() => {
        if (isDictionaries) {
            onQueryGroup({
                Group: group || dictionariesName,
                Folder: folder || ""
            })
        } else {
            onQueryGroup()
        }
        onClose()
        // 扩充时通知table刷新
        if (group || folder) {
            emiter.emit("refreshTableEvent")
        }
    })

    const beforeUploadFun = useDebounceFn(
        (fileList: any[]) => {
            let arr: {
                path: string
                name: string
            }[] = []
            fileList.forEach((f) => {
                if (uploadType === "large-dragger" && !"text/plain".includes(f.type) && f.size / 1024 / 1024 > 20) {
                    failed("大文件存储仅支持txt文件类型")
                    return false
                }
                if (uploadType === "dragger" && !FileType.includes(f.type)) {
                    failed(`${f.name}非txt、csv文件，请上传正确格式文件！`)
                    return false
                }
                if (uploadList.map((item) => item.path).includes(f.path)) {
                    warn(`${f.path}已选择`)
                    return
                }
                let name = f.name.split(".")[0]
                arr.push({
                    path: f.path,
                    name
                })
            })

            if (dictionariesName.length === 0 && arr.length > 0) {
                setDictionariesName(arr[0].name)
            }
            setUploadList([...uploadList, ...arr])
        },
        {
            wait: 200
        }
    ).run
    return (
        <div className={styles["create-dictionaries"]}>
            {!streamData && (
                <>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>{title}</div>
                        <div className={styles["extra"]} onClick={onClose}>
                            <OutlineXIcon />
                        </div>
                    </div>
                    {isDictionaries && (
                        <div className={styles["explain"]}>
                            <div className={styles["explain-bg"]}>
                                <div className={styles["title"]}>可根据需求选择以下存储方式，存储方式不影响使用：</div>
                                <div className={styles["content"]}>
                                    <div className={styles["item"]}>
                                        <div className={styles["dot"]}>1</div>
                                        <div className={styles["text"]}>
                                            文件存储：将字典以文件形式保存在本地，不支持命中次数，
                                            <span className={styles["hight-text"]}>上传速度更快</span>
                                        </div>
                                    </div>
                                    <div className={styles["item"]}>
                                        <div className={styles["dot"]}>2</div>
                                        <div className={styles["text"]}>
                                            数据库存储：将字典数据读取后保存在数据库中，支持命中次数，
                                            <span className={styles["hight-text"]}>搜索更方便</span>
                                        </div>
                                    </div>
                                    <div className={styles["item"]}>
                                        <div className={styles["dot"]}>3</div>
                                        <div className={styles["text"]}>
                                            大文件存储：上传文件大于<span className={styles["hight-text"]}>20M</span>
                                            时，支持采取大文件存储方式，仅支持txt，
                                            <span className={styles["hight-text"]}>存储更便捷</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={styles["info-box"]}>
                        {isDictionaries && (
                            <div className={styles["input-box"]}>
                                <div className={styles["name"]}>
                                    字典名<span className={styles["must"]}>*</span>:
                                </div>
                                <div>
                                    <YakitInput
                                        style={{width: "100%"}}
                                        placeholder='请输入...'
                                        value={dictionariesName}
                                        onChange={(e) => {
                                            setDictionariesName(e.target.value)
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        <div className={styles["card-box"]}>
                            <div className={styles["card-heard"]}>
                                <YakitRadioButtons
                                    value={uploadType}
                                    onChange={(e) => {
                                        setEditorValue("")
                                        setUploadList([])
                                        setUploadType(e.target.value)
                                    }}
                                    buttonStyle='solid'
                                    options={[
                                        {
                                            value: "dragger",
                                            label: "上传文件"
                                        },
                                        {
                                            value: "editor",
                                            label: "手动输入"
                                        },
                                        {
                                            value: "large-dragger",
                                            label: "上传大文件"
                                        }
                                    ]}
                                    // size={"small"}
                                />
                            </div>
                            <>
                                {["dragger", "large-dragger"].includes(uploadType) && (
                                    <div className={styles["upload-dragger-box"]}>
                                        <Dragger
                                            className={styles["upload-dragger"]}
                                            // accept={FileType.join(",")}
                                            multiple={true}
                                            showUploadList={false}
                                            beforeUpload={(f: any, fileList: any) => {
                                                beforeUploadFun(fileList)
                                                return false
                                            }}
                                        >
                                            <div className={styles["upload-info"]}>
                                                <div className={styles["add-file-icon"]}>
                                                    <PropertyIcon />
                                                </div>
                                                <div className={styles["content"]}>
                                                    <div className={styles["title"]}>
                                                        可将文件拖入框内，或
                                                        <span className={styles["hight-light"]}>点击此处导入</span>
                                                    </div>
                                                    <div className={styles["sub-title"]}>
                                                        {uploadType === "dragger"
                                                            ? "支持文件夹批量上传(支持文件类型txt/csv)"
                                                            : "支持大文件上传(支持文件类型txt)"}
                                                    </div>
                                                </div>
                                            </div>
                                        </Dragger>
                                    </div>
                                )}
                                {uploadType === "editor" && (
                                    <div className={styles["upload-editor-box"]}>
                                        <YakEditor
                                            type='plaintext'
                                            value={editorValue}
                                            setValue={(content: string) => {
                                                setEditorValue(content)
                                            }}
                                            noWordWrap={true}
                                        />
                                    </div>
                                )}
                            </>
                        </div>

                        <div className={styles["upload-list"]}>
                            {uploadList.map((item, index) => (
                                <div className={styles["upload-list-item"]} key={index}>
                                    <div className={styles["link-icon"]}>
                                        <OutlinePaperclipIcon />
                                    </div>
                                    <div className={styles["text"]}>{item.path}</div>
                                    <div
                                        className={styles["close-icon"]}
                                        onClick={() => {
                                            const newUploadList = uploadList.filter(
                                                (itemIn) => itemIn.path !== item.path
                                            )
                                            if (item.name === dictionariesName) {
                                                setDictionariesName(
                                                    newUploadList.length > 0 ? newUploadList[0].name : ""
                                                )
                                            }
                                            setUploadList(newUploadList)
                                        }}
                                    >
                                        <SolidXcircleIcon />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles["submit-box"]}>
                        {isDictionaries ? (
                            <>
                                {uploadType !== "large-dragger" ? (
                                    <>
                                        <YakitButton
                                            size='large'
                                            disabled={isDisabled}
                                            type='outline1'
                                            icon={<SolidDatabaseIcon />}
                                            onClick={onSavePayload}
                                        >
                                            数据库存储
                                        </YakitButton>
                                        <YakitButton
                                            size='large'
                                            disabled={isDisabled}
                                            icon={<SolidDocumenttextIcon />}
                                            onClick={onSavePayloadToFile}
                                        >
                                            文件存储
                                        </YakitButton>
                                    </>
                                ) : (
                                    <YakitButton
                                        size='large'
                                        disabled={isDisabled}
                                        icon={<SolidDocumenttextIcon />}
                                        onClick={onSavePayloadToFile}
                                    >
                                        大文件存储
                                    </YakitButton>
                                )}
                            </>
                        ) : (
                            <>
                                <YakitButton size='large' disabled={isDisabled} type='outline1' onClick={onClose}>
                                    取消
                                </YakitButton>
                                <YakitButton size='large' disabled={isDisabled} onClick={onSavePayload}>
                                    导入
                                </YakitButton>
                            </>
                        )}
                    </div>
                </>
            )}

            {streamData && (
                <UploadStatusInfo
                    title={storeType === "database" ? "导入中..." : "自动去重检测，请耐心等待..."}
                    streamData={streamData}
                    cancelRun={cancelRun}
                    logInfo={logInfoRef.current}
                />
            )}
        </div>
    )
}

// 示例数据，可以根据实际需求进行修改
// const initialData: DataItem[] = [
//     {
//         type: "Folder",
//         name: "文件夹1",
//         id: "11111",
//         node: [
//             {
//                 type: "File",
//                 name: "文件1-1",
//                 id: "111111"
//             },
//             {
//                 type: "File",
//                 name: "文件1-2",
//                 id: "111112"
//             }
//         ]
//     },
//     {
//         type: "File",
//         name: "文件2-2",
//         id: "222222"
//     },
//     {
//         type: "Folder",
//         name: "文件夹3",
//         id: "333333",
//         node: [
//             {
//                 type: "File",
//                 name: "文件3-1",
//                 id: "3333331"
//             },
//             {
//                 type: "File",
//                 name: "文件3-2",
//                 id: "3333332"
//             }
//         ]
//     }
// ]

const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = "translate(0px" + transform.substring(index, transform.length)
    }
    return {
        ...draggableStyle,
        transform
    }
}

const cloneItemStyle = (draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (transform) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = "translate(0px" + transform.substring(index, transform.length)
    }
    return {
        ...draggableStyle,
        transform
    }
}

// 根据Group获取此项
export const findItemByGroup = (items: DataItem[], group: string): DataItem | null => {
    for (const item of items) {
        if (item.name === group && item.type !== "Folder") {
            return item
        } else if (item.type === "Folder" && item.node) {
            const foundInNode = findItemByGroup(item.node, group)
            if (foundInNode) {
                return foundInNode
            }
        }
    }
    return null
}

// 根据Id获取此项
const findItemById = (items: DataItem[], targetId: string): DataItem | null => {
    for (const item of items) {
        if (item.id === targetId) {
            return item
        } else if (item.type === "Folder" && item.node) {
            const foundInNode = findItemById(item.node, targetId)
            if (foundInNode) {
                return foundInNode
            }
        }
    }
    return null
}

// 根据Id获取此项(如在文件夹中 则获取至文件夹那一层)
export const findFoldersById = (items: DataItem[], targetId: string) => {
    for (const item of items) {
        if (item.id === targetId) {
            return item
        } else if (item.type === "Folder" && item.node) {
            const foundInNode = findFoldersById(item.node, targetId)
            if (foundInNode) {
                return item
            }
        }
    }
    return null
}

// 比较数组是否相等
const compareArrays = (arr1, arr2) => {
    if (arr1.length !== arr2.length) {
        return false
    }

    for (let i = 0; i < arr1.length; i++) {
        if (!_isEqual(arr1[i], arr2[i])) {
            return false
        }
    }
    return true
}

// 判断字符串中是否存在/*,
export const isIncludeSpecial = (v: string) => /[/*,]/.test(v)

// 将后端结构数据捏成渲染数组
const nodesToDataFun = (nodes: PayloadGroupNodeProps[]) => {
    return nodes.map((item) => {
        const {Type, Name, Nodes, Number} = item
        let obj: DataItem = {
            type: Type,
            name: Name,
            id: `${Type}-${Name}`,
            number: Number
        }
        if (Nodes.length > 0) {
            return {
                ...obj,
                node: Nodes.map((itemIn) => ({
                    type: itemIn.Type,
                    name: itemIn.Name,
                    id: `${itemIn.Type}-${itemIn.Name}`,
                    number: itemIn.Number
                }))
            }
        }
        return obj
    })
}

// 递归数组中的数据库文件并将其id归纳为一个数组
const getDataBaseIds = (data: DataItem[]): string[] => {
    let ids: string[] = []
    for (const item of data) {
        if (item.type === "DataBase") {
            ids.push(item.name)
        } else if (item.type === "Folder" && item.node) {
            const foundInNode = getDataBaseIds(item.node)
            if (foundInNode.length > 0) {
                ids = ids.concat(foundInNode)
            }
        }
    }
    return ids
}

// 数组去重
const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

export interface DataItem {
    type: "File" | "Folder" | "DataBase"
    name: string
    id: string
    number: number
    // 是否为新建
    isCreate?: boolean
    node?: DataItem[]
}

interface MoveLevelProps {
    draggableId: string
    level: "inside" | "outside"
}

export interface PayloadGroupNodeProps {
    Type: "File" | "Folder" | "DataBase"
    Name: string
    Nodes: PayloadGroupNodeProps[]
    Number: number
}

const droppable = "droppable"
const droppableGroup = "droppableGroup"

export interface NewPayloadLocalListProps {
    listLoading: boolean
    data: DataItem[]
    setData: (v: DataItem[]) => void
    onQueryGroup: (obj?: {Group: string; Folder: string}) => void
    cacheNodesRef: any
    setGroup: (v: string) => void
    setFolder: (v: string) => void
    setContentType: (v?: "editor" | "table") => void
    codePath?: string
    // 屏蔽掉所有拖拽及所有操作 仅留点击插入
    onlyInsert?: boolean
    // 以下为插入弹框所需要
    onClose?: () => void
    // 选中项
    selectItem: string | undefined
    setSelectItem: (v: string) => void
    checkedItem?: string[]
    onCheckedItem?: (id: string[]) => void
    floderChecked?: string[]
    onSetFloderChecked?: (id: string[]) => void
    setShowType?: (v: "local" | "online") => void
    showType?: "local" | "online"
}

export const NewPayloadLocalList: React.FC<NewPayloadLocalListProps> = (props) => {
    const {
        listLoading,
        data,
        setData,
        onQueryGroup,
        cacheNodesRef,
        setGroup,
        setFolder,
        setContentType,
        codePath,
        onlyInsert,
        onClose,
        selectItem,
        setSelectItem,
        checkedItem = [],
        onCheckedItem = () => {},
        floderChecked = [],
        onSetFloderChecked = () => {},
        setShowType,
        showType
    } = props

    const [dropType, setDropType] = useState<string>(droppable)
    const [subDropType, setSubDropType] = useState<string>(droppableGroup)
    const [combineIds, setCombineIds] = useState<string[]>([])
    const [isCombineEnabled, setIsCombineEnabled] = useState<boolean>(true)

    const [moveLevel, setMoveLevel] = useState<MoveLevelProps>()
    const moveLevelRef = useRef<MoveLevelProps>()

    // 用于记录展开的文件夹
    const [expandArr, setExpandArr] = useState<string[]>([])
    // 用于记录所选需要导出的数据
    const [exportData, setExportData] = useState<string[]>([])

    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const [exportType, setExportType] = useState<ExportTypeProps>()

    const userInfo = useStore((s) => s.userInfo)

    useUpdateEffect(() => {
        onUpdateAllPayloadGroup(data)
    }, [JSON.stringify(data)])

    useEffect(() => {
        emiter.on("refreshListEvent", onRefreshListEvent)
        return () => {
            emiter.off("refreshListEvent", onRefreshListEvent)
        }
    }, [])

    const onRefreshListEvent = useMemoizedFn(() => {
        onQueryGroup()
    })

    useEffect(() => {
        if (selectItem) {
            const selectData = findFoldersById(data, selectItem)
            if (selectData) {
                if (selectData.type === "Folder") {
                    setFolder(selectData.name)
                    let item = selectData.node?.filter((item) => item.id === selectItem) || []
                    let group: string = item.length > 0 ? item[0].name : ""
                    let type: string = item.length > 0 ? item[0].type : ""
                    setGroup(group)
                    setContentType(type === "DataBase" ? "table" : "editor")
                    setShowType && setShowType("local")
                } else {
                    setFolder("")
                    setGroup(selectData.name)
                    setContentType(selectData.type === "DataBase" ? "table" : "editor")
                    setShowType && setShowType("local")
                }
            }
        }
    }, [selectItem])

    // 将渲染数组捏回后端结构数据
    const dataToNodesFun = useMemoizedFn((data: DataItem[]) => {
        return data.map((item) => {
            let obj: PayloadGroupNodeProps = {
                Name: item.name,
                Type: item.type,
                Nodes: [],
                Number: item.number
            }
            if (item.node) {
                obj.Nodes = item.node.map((itemIn) => ({
                    Name: itemIn.name,
                    Type: itemIn.type,
                    Nodes: [],
                    Number: itemIn.number
                }))
            }
            return obj
        })
    })

    // 顺序、合并拖拽时将新的顺序通知后端
    const onUpdateAllPayloadGroup = useMemoizedFn((data: DataItem[]) => {
        // 排除新建文件夹
        const newData = data.filter((item) => item.isCreate !== true)
        // 将渲染数组捏回后端结构数据
        const newNodes: PayloadGroupNodeProps[] = dataToNodesFun(newData)
        // 比较新旧 是否相等
        const isEqual: boolean = compareArrays(cacheNodesRef.current, newNodes)
        // 不相等时通知后端顺序变换
        if (!isEqual) {
            ipcRenderer
                .invoke("UpdateAllPayloadGroup", {
                    Nodes: newNodes
                })
                .then(() => {
                    cacheNodesRef.current = newNodes
                    onQueryGroup()
                })
                .catch((e: any) => {
                    failed(`数据更新失败：${e}`)
                })
        }
    })

    // 根据数组下标进行位置互换
    const moveArrayElement = useMemoizedFn((arr, fromIndex, toIndex) => {
        // 检查下标是否有效
        if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
            console.error("Invalid indices")
            return arr // 返回原始数组
        }

        // 从数组中移除元素并插入到目标位置
        const [element] = arr.splice(fromIndex, 1)
        arr.splice(toIndex, 0, element)

        return arr // 返回移动后的数组
    })

    useEffect(() => {
        onQueryGroup()
    }, [])

    // 获取唯一文件夹名称
    const getOnlyFolderName = useMemoizedFn(() => {
        const existingFolderNames = data.filter((item) => item.type === "Folder").map((item) => item.name)
        // 创建新文件夹的名称
        let newFolderName: string
        let index = 1
        do {
            newFolderName = `未命名检测${index}`
            index++
        } while (existingFolderNames.includes(newFolderName))
        return newFolderName
    })

    // 组外两个游离的文件合成组 或者 组外的文件拖拽到组外的文件夹合成组
    const mergingGroup = useMemoizedFn((result: DropResult) => {
        const {source, destination, draggableId, type, combine} = result
        if (!combine) {
            return
        }
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const sourceItem: DataItem = copyData[source.index]
        const combineItem = findItemById(data, combine.draggableId)
        // 组外的文件拖拽到组外的文件夹合成组
        if (sourceItem.type !== "Folder" && combineItem && combineItem.type === "Folder") {
            // 移除此项
            copyData.splice(source.index, 1)
            combineItem.node = combineItem.node ? [sourceItem, ...combineItem.node] : [sourceItem]
            const newData = copyData.map((item) => {
                if (item.id === combineItem.id) {
                    return combineItem
                }
                return item
            })
            setData(newData)
        }
        // 组外两个游离的文件合成组
        if (sourceItem.type !== "Folder" && combineItem && combineItem.type !== "Folder") {
            // 移除此项
            copyData.splice(source.index, 1)
            // 生成 UUID
            const uuid = uuidv4()
            const newData = copyData.map((item) => {
                if (item.id === combineItem.id) {
                    let item: DataItem = {
                        type: "Folder",
                        name: getOnlyFolderName(),
                        id: uuid,
                        node: [combineItem, sourceItem],
                        number: parseInt(combineItem.number + "") + parseInt(sourceItem.number + "")
                    }
                    return item
                }
                return item
            })
            setData(newData)
        }
    })
    // 组内的文件拖拽到组外并和组外的文件夹合成组(组内向组外合并)
    const mergeWithinAndOutsideGroup = useMemoizedFn((result: DropResult) => {
        const {source, destination, draggableId, type, combine} = result
        if (!combine) {
            return
        }
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const sourceFolders = findFoldersById(copyData, source.droppableId)
        const combineItem = findItemById(data, combine.draggableId)
        if (sourceFolders && sourceFolders?.node && combineItem && combineItem.type === "Folder") {
            const sourceItem = sourceFolders.node[source.index]
            sourceFolders.node.splice(source.index, 1)
            combineItem.node = combineItem.node ? [sourceItem, ...combineItem.node] : [sourceItem]
            const newData = copyData.map((item) => {
                if (item.id === sourceFolders.id) {
                    return sourceFolders
                }
                if (item.id === combineItem.id) {
                    return combineItem
                }
                return item
            })
            setData(newData)
        }
        if (sourceFolders && sourceFolders?.node && combineItem && combineItem.type !== "Folder") {
            const sourceItem = sourceFolders.node[source.index]
            sourceFolders.node.splice(source.index, 1)
            // 生成 UUID
            const uuid = uuidv4()
            const newData = copyData.map((item) => {
                if (item.id === combineItem.id) {
                    let item: DataItem = {
                        type: "Folder",
                        name: getOnlyFolderName(),
                        id: uuid,
                        node: [combineItem, sourceItem],
                        number: parseInt(combineItem.number + "") + parseInt(sourceItem.number + "")
                    }
                    return item
                }
                return item
            })
            setData(newData)
        }
    })
    // 拖放结束时的回调函数
    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        try {
            const {source, destination, draggableId, type, combine} = result
            /** 合并组   ---------start--------- */
            if (combine) {
                // 组外两个游离的文件合成组
                if (source.droppableId === "droppable-payload" && combine.droppableId === "droppable-payload") {
                    mergingGroup(result)
                }
                // 组内的文件拖拽到组外并和组外的文件夹合成组(组内向组外合并)
                if (source.droppableId !== "droppable-payload" && combine.droppableId === "droppable-payload") {
                    mergeWithinAndOutsideGroup(result)
                }
            }
            setIsCombineEnabled(true)
            setMoveLevel(undefined)
            setCombineIds([])
            moveLevelRef.current = undefined
            /** 合并组   ---------end--------- */
            if (!destination) {
                return
            }
            const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
            // 同层内拖拽(最外层)
            if (source.droppableId === "droppable-payload" && destination.droppableId === "droppable-payload") {
                const newArray: DataItem[] = moveArrayElement(data, source.index, destination.index)
                setData(newArray)
            }
            // 同层内拖拽(内层)
            else if (source.droppableId === destination.droppableId) {
                const foldersArr = findFoldersById(copyData, source.droppableId)
                if (foldersArr) {
                    const newArray: DataItem[] = moveArrayElement(foldersArr.node, source.index, destination.index)
                    foldersArr.node = newArray
                    const newData = copyData.map((item) => {
                        if (item.id === foldersArr.id) {
                            return foldersArr
                        }
                        return item
                    })
                    setData(newData)
                }
            }
            // 跨层级拖拽 删除原有的 新增新添的
            else {
                // 由外部拖向内部
                if (source.droppableId === "droppable-payload") {
                    const cacheData: DataItem = copyData[source.index]
                    // 移除此项
                    copyData.splice(source.index, 1)
                    const foldersItem = findFoldersById(copyData, destination.droppableId)
                    if (foldersItem) {
                        foldersItem.node?.splice(destination.index, 0, cacheData)
                        const newData = copyData.map((item) => {
                            if (item.id === foldersItem.id) {
                                return foldersItem
                            }
                            return item
                        })
                        setData(newData)
                    }
                }
                // 由内部拖向另一个内部
                else if (
                    source.droppableId !== "droppable-payload" &&
                    destination.droppableId !== "droppable-payload"
                ) {
                    const foldersItem = findFoldersById(copyData, source.droppableId)
                    const dropFoldersItem = findFoldersById(copyData, destination.droppableId)
                    if (foldersItem?.node && dropFoldersItem) {
                        const cacheData: DataItem = foldersItem.node[source.index]
                        // 移除此项
                        foldersItem.node.splice(source.index, 1)
                        const newData = copyData.map((item) => {
                            if (item.id === foldersItem.id) {
                                return foldersItem
                            }
                            if (item.id === dropFoldersItem.id && item.node) {
                                item.node.splice(destination.index, 0, cacheData)
                                return item
                            }
                            return item
                        })
                        setData(newData)
                    }
                }
                // 由内部拖向外部
                else {
                    const foldersItem = findFoldersById(copyData, source.droppableId)
                    if (foldersItem?.node) {
                        const cacheData: DataItem = foldersItem.node[source.index]
                        // 移除此项
                        foldersItem.node.splice(source.index, 1)
                        copyData.splice(destination.index, 0, cacheData)
                        const newData = copyData.map((item) => {
                            if (item.id === foldersItem.id) {
                                return foldersItem
                            }
                            return item
                        })
                        setData(newData)
                    }
                }
            }
        } catch (error) {}
    })

    /**
     * @description: 计算移动的范围是否在目标范围类destinationDrag
     */
    const onDragUpdate = useThrottleFn(
        (result: DragUpdate, provided: ResponderProvided) => {
            const {index, droppableId} = result.source
            const {combine, destination, draggableId} = result
            // if (droppableId === "droppable-payload") {
            //     // 拖动的来源item是组时，不用合并
            // }

            const moveNode = findItemById(data, draggableId)
            if (combine) {
                // 检测到合并的情况
                const ids = [combine.draggableId, draggableId]
                // 如果拖拽的是文件夹 则不允许合并
                const moveType = findItemById(data, draggableId)
                if (moveType && moveType.type !== "Folder") {
                    setCombineIds(ids)
                }
                // // 由内合并至外层
                // if(droppableId!=="droppable-payload"&&combine.droppableId==="droppable-payload"){

                // }
                setMoveLevel(moveLevelRef.current)
                return
            }
            // 拖拽文件时 层级变动 更改样式
            if (moveNode && destination && moveNode.type !== "Folder") {
                if (
                    (droppableId === "droppable-payload" || destination.droppableId === "droppable-payload") &&
                    droppableId !== destination.droppableId
                ) {
                    const moveLevelObj: MoveLevelProps = {
                        draggableId,
                        level: droppableId === "droppable-payload" ? "inside" : "outside"
                    }
                    moveLevelRef.current = moveLevelObj
                    setMoveLevel(moveLevelObj)
                } else {
                    const moveLevelObj: MoveLevelProps = {
                        draggableId,
                        level: droppableId === "droppable-payload" ? "outside" : "inside"
                    }
                    moveLevelRef.current = moveLevelObj
                    setMoveLevel(moveLevelObj)
                }
            }

            setCombineIds([])
        },
        {wait: 200}
    ).run

    const onBeforeCapture = useMemoizedFn((result: BeforeCapture) => {
        // 根据Id判断其是否为文件
        const item = findItemById(data, result.draggableId)
        if (item && item.type !== "Folder") {
            setDropType(droppableGroup)
            setSubDropType(droppableGroup)
        } else {
            setDropType(droppable)
            setSubDropType(droppableGroup)
        }
    })

    const onDragStart = useMemoizedFn((result: DragStart, provided: ResponderProvided) => {
        if (!result.source) return
        // 如果拖拽的是文件夹 则不允许合并
        const moveType = findItemById(data, result.draggableId)
        if (moveType && moveType.type === "Folder") {
            setIsCombineEnabled(false)
        }
    })

    // 获取Payload
    const getPayloadCount = useMemo(() => {
        let count: number = 0
        data.forEach((item) => {
            if (item.type !== "Folder") {
                count += 1
            }
            if (item.node) {
                item.node.forEach(() => {
                    count += 1
                })
            }
        })
        return count
    }, [data])

    const allCheckIds = useMemo(() => {
        return getDataBaseIds(data)
    }, [data])

    return (
        <>
            <div className={styles["new-payload-list"]}>
                <div className={styles["header"]}>
                    <div className={styles["title-box"]}>
                        <div className={styles["title"]}>{onlyInsert ? "选择想要插入的字典" : "Payload 字典管理"}</div>
                        <div className={styles["count"]}>{getPayloadCount}</div>
                        {!onlyInsert && (
                            <YakitButton
                                type='text2'
                                icon={<OutlineRefreshIcon />}
                                onClick={() => {
                                    onQueryGroup()
                                }}
                            />
                        )}
                    </div>
                    <div className={styles["extra"]}>
                        {onlyInsert ? (
                            <>
                                <Tooltip title={"前往 Payload 字典管理"}>
                                    <YakitButton
                                        type='text2'
                                        icon={<OutlineCogIcon />}
                                        onClick={() => {
                                            onClose && onClose()
                                            ipcRenderer.invoke("open-route-page", {route: YakitRoute.PayloadManager})
                                        }}
                                    />
                                </Tooltip>
                            </>
                        ) : (
                            <div className={styles["option"]}>
                                <Tooltip title={"批量导出"}>
                                    <YakitButton
                                        type='text2'
                                        icon={<OutlineExportIcon />}
                                        onClick={() => {
                                            if (exportData.length === 0) {
                                                warn("请选择导出内容")
                                                return
                                            }
                                            setExportType("all")
                                            setExportVisible(true)
                                        }}
                                    />
                                </Tooltip>
                                <YakitDropdownMenu
                                    menu={{
                                        data: [
                                            {
                                                key: "createDictionaries",
                                                label: (
                                                    <div className={styles["extra-menu"]}>
                                                        <OutlineAddPayloadIcon />
                                                        <div className={styles["menu-name"]}>新建字典</div>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: "createFolder",
                                                label: (
                                                    <div className={styles["extra-menu"]}>
                                                        <OutlineFolderaddIcon />
                                                        <div className={styles["menu-name"]}>新建文件夹</div>
                                                    </div>
                                                )
                                            }
                                        ],
                                        onClick: ({key}) => {
                                            switch (key) {
                                                case "createDictionaries":
                                                    const m = showYakitModal({
                                                        getContainer:
                                                            document.getElementById("new-payload") || document.body,
                                                        title: null,
                                                        footer: null,
                                                        width: 566,
                                                        type: "white",
                                                        closable: false,
                                                        maskClosable: false,
                                                        hiddenHeader: true,
                                                        content: (
                                                            <CreateDictionaries
                                                                title='新建字典'
                                                                type='dictionaries'
                                                                onQueryGroup={onQueryGroup}
                                                                onClose={() => {
                                                                    m.destroy()
                                                                }}
                                                            />
                                                        )
                                                    })
                                                    break
                                                case "createFolder":
                                                    // 生成 UUID
                                                    const uuid = uuidv4()
                                                    setData([
                                                        {
                                                            type: "Folder",
                                                            name: "",
                                                            id: uuid,
                                                            isCreate: true,
                                                            number: 0
                                                        },
                                                        ...data
                                                    ])
                                                    break
                                                default:
                                                    break
                                            }
                                        }
                                    }}
                                    dropdown={{
                                        trigger: ["click"],
                                        placement: "bottomRight"
                                    }}
                                >
                                    <Tooltip title={"新增"}>
                                        <YakitButton type='secondary2' icon={<OutlinePlusIcon />} />
                                    </Tooltip>
                                </YakitDropdownMenu>
                            </div>
                        )}
                    </div>
                </div>
                <YakitSpin spinning={listLoading} wrapperClassName={styles["spin-box"]}>
                    <div className={styles["content"]}>
                        <div className={styles["drag-list"]}>
                            {onlyInsert ? (
                                <>
                                    {data.map((item, index) => {
                                        const fileOutside =
                                            moveLevel?.draggableId === item.id ? moveLevel.level === "outside" : true
                                        const isCombine = combineIds[0] === item.id
                                        /* 渲染你的文件夹或文件组件 */
                                        /* 使用 item.type 来区分文件夹和文件 */
                                        return item.type === "Folder" ? (
                                            // 渲染文件夹组件
                                            <FolderComponent
                                                key={`${item.id}-${index}`}
                                                folder={item}
                                                selectItem={selectItem}
                                                setSelectItem={setSelectItem}
                                                data={data}
                                                setData={setData}
                                                subDropType={subDropType}
                                                moveLevel={moveLevel}
                                                isCombine={isCombine}
                                                codePath={codePath}
                                                expandArr={expandArr}
                                                setExpandArr={setExpandArr}
                                                onQueryGroup={onQueryGroup}
                                                setContentType={setContentType}
                                                onlyInsert={onlyInsert}
                                                checkedItem={checkedItem}
                                                onCheckedItem={onCheckedItem}
                                                floderChecked={floderChecked}
                                                onSetFloderChecked={onSetFloderChecked}
                                            />
                                        ) : (
                                            // 渲染文件组件
                                            <FileComponent
                                                key={`${item.id}-${index}`}
                                                file={item}
                                                selectItem={selectItem}
                                                setSelectItem={setSelectItem}
                                                data={data}
                                                setData={setData}
                                                isInside={!fileOutside}
                                                isCombine={isCombine}
                                                codePath={codePath}
                                                onQueryGroup={onQueryGroup}
                                                setContentType={setContentType}
                                                onlyInsert={onlyInsert}
                                                checkedItem={checkedItem}
                                                onCheckedItem={onCheckedItem}
                                            />
                                        )
                                    })}
                                    <div className={styles["to-end"]}>已经到底啦～</div>
                                </>
                            ) : (
                                <>
                                    <div className={styles["checkbox-wrapper"]}>
                                        <YakitCheckbox
                                            checked={exportData.length === allCheckIds.length}
                                            indeterminate={
                                                exportData.length > 0 && exportData.length < allCheckIds.length
                                            }
                                            className={styles["checkbox"]}
                                            disabled={allCheckIds.length === 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setExportData(allCheckIds)
                                                } else {
                                                    setExportData([])
                                                }
                                            }}
                                        >
                                            全选
                                        </YakitCheckbox>
                                    </div>

                                    <DragDropContext
                                        onDragEnd={onDragEnd}
                                        onDragStart={onDragStart}
                                        onDragUpdate={onDragUpdate}
                                        onBeforeCapture={onBeforeCapture}
                                    >
                                        <Droppable
                                            droppableId='droppable-payload'
                                            direction='vertical'
                                            type={dropType}
                                            isCombineEnabled={isCombineEnabled}
                                        >
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                                    {data.map((item, index) => {
                                                        const fileOutside =
                                                            moveLevel?.draggableId === item.id
                                                                ? moveLevel.level === "outside"
                                                                : true
                                                        const isCombine = combineIds[0] === item.id
                                                        return (
                                                            <Draggable
                                                                key={item.id}
                                                                draggableId={item.id}
                                                                index={index}
                                                            >
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        style={{
                                                                            // ...provided.draggableProps.style
                                                                            ...getItemStyle(
                                                                                snapshot.isDragging,
                                                                                provided.draggableProps.style
                                                                            )
                                                                        }}
                                                                    >
                                                                        {/* 渲染你的文件夹或文件组件 */}
                                                                        {/* 使用 item.type 来区分文件夹和文件 */}
                                                                        {item.type === "Folder" ? (
                                                                            // 渲染文件夹组件
                                                                            <FolderComponent
                                                                                folder={item}
                                                                                selectItem={selectItem}
                                                                                setSelectItem={setSelectItem}
                                                                                data={data}
                                                                                setData={setData}
                                                                                subDropType={subDropType}
                                                                                moveLevel={moveLevel}
                                                                                isCombine={isCombine}
                                                                                codePath={codePath}
                                                                                expandArr={expandArr}
                                                                                setExpandArr={setExpandArr}
                                                                                onQueryGroup={onQueryGroup}
                                                                                setContentType={setContentType}
                                                                                isDragging={snapshot.isDragging}
                                                                                exportData={exportData}
                                                                                setExportData={setExportData}
                                                                                userInfo={userInfo}
                                                                                showType={showType}
                                                                            />
                                                                        ) : (
                                                                            // 渲染文件组件
                                                                            <FileComponent
                                                                                file={item}
                                                                                selectItem={selectItem}
                                                                                setSelectItem={setSelectItem}
                                                                                data={data}
                                                                                setData={setData}
                                                                                isInside={!fileOutside}
                                                                                isCombine={isCombine}
                                                                                codePath={codePath}
                                                                                onQueryGroup={onQueryGroup}
                                                                                setContentType={setContentType}
                                                                                isDragging={snapshot.isDragging}
                                                                                exportData={exportData}
                                                                                setExportData={setExportData}
                                                                                userInfo={userInfo}
                                                                                showType={showType}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        )
                                                    })}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                    <div className={styles["to-end"]}>已经到底啦～</div>
                                </>
                            )}
                        </div>
                    </div>
                </YakitSpin>
            </div>
            {exportVisible && (
                <ExportByPayloadGrpc
                    group={exportData.join(",")}
                    setExportVisible={setExportVisible}
                    exportType={exportType}
                />
            )}
        </>
    )
}

interface FileComponentCloneProps {
    file: DataItem
    selectItem?: string
    isInside?: boolean
}

// 用于生成拖拽文件元素
export const FileComponentClone: React.FC<FileComponentCloneProps> = (props) => {
    const {file, selectItem, isInside = true} = props
    const menuOpen = false
    return (
        <div
            className={classNames(styles["file"], {
                [styles["file-active"]]: file.id === selectItem,
                [styles["file-no-active"]]: file.id !== selectItem,
                [styles["file-inside"]]: isInside,
                [styles["file-outside"]]: !isInside
            })}
        >
            <div className={styles["file-header"]}>
                <div className={styles["drag-icon"]}>
                    <SolidDragsortIcon />
                </div>
                {file.type === "DataBase" ? (
                    <div className={classNames(styles["file-icon"], styles["file-icon-database"])}>
                        <SolidDatabaseIcon />
                    </div>
                ) : (
                    <div className={classNames(styles["file-icon"], styles["file-icon-document"])}>
                        <SolidDocumenttextIcon />
                    </div>
                )}

                <div className={styles["file-name"]}>{file.name}</div>
            </div>
            <div
                className={classNames(styles["extra"], {
                    [styles["extra-dot"]]: menuOpen,
                    [styles["extra-hover"]]: !menuOpen
                })}
            >
                <div className={styles["file-count"]}>{file.type === "DataBase" ? file.number : ""}</div>
                <div
                    className={styles["extra-icon"]}
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <SolidDotsverticalIcon />
                </div>
            </div>
        </div>
    )
}

interface FolderComponentProps {
    folder: DataItem
    selectItem?: string
    setSelectItem: (id: string) => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    subDropType: string
    moveLevel?: MoveLevelProps
    // 是否合并
    isCombine?: boolean
    // 导出所需参数
    codePath?: string
    // 文件夹不展开记录
    expandArr: string[]
    setExpandArr: (v: string[]) => void
    onQueryGroup: (obj?: {Group: string; Folder: string}) => void
    setContentType: (v?: "editor" | "table") => void
    onlyInsert?: boolean
    // 是否拖拽中
    isDragging?: boolean
    checkedItem?: string[]
    onCheckedItem?: (id: string[]) => void
    floderChecked?: string[]
    onSetFloderChecked?: (id: string[]) => void
    exportData?: string[]
    setExportData?: (ids: React.SetStateAction<string[]>) => void
    userInfo?: UserInfoProps
    showType?: "local" | "online"
}
export const FolderComponent: React.FC<FolderComponentProps> = (props) => {
    const {
        folder,
        selectItem,
        setSelectItem,
        data,
        setData,
        subDropType,
        moveLevel,
        isCombine,
        codePath,
        expandArr,
        setExpandArr,
        onQueryGroup,
        setContentType,
        onlyInsert,
        isDragging,
        checkedItem = [],
        onCheckedItem = () => {},
        floderChecked = [],
        onSetFloderChecked = () => {},
        exportData = [],
        setExportData,
        userInfo,
        showType = "local"
    } = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(folder.isCreate === true)
    const [inputName, setInputName] = useState<string>(folder.name)
    // delete
    const [deleteVisible, setDeleteVisible] = useState<boolean>(false)
    const getAllFolderName = useMemoizedFn(() => {
        return data.filter((item) => item.type === "Folder").map((item) => item.name)
    })

    const [uploadVisible, setUploadVisible] = useState<boolean>(false)

    const setFolderNameById = useMemoizedFn(() => {
        // 文件夹只会存在第一层 不用递归遍历
        const newData = data.map((item) => {
            if (item.id === folder.id) {
                return {...item, name: inputName}
            }
            return item
        })
        setData(newData)
    })

    // 更改文件名
    const onChangeValue = useMemoizedFn(() => {
        setEditInput(false)
        const allFolderName = getAllFolderName()
        const pass: boolean = !isIncludeSpecial(inputName)
        if (inputName.length > 0 && !allFolderName.includes(inputName) && pass) {
            // 新建
            if (folder.isCreate) {
                ipcRenderer
                    .invoke("CreatePayloadFolder", {
                        Name: inputName
                    })
                    .then(() => {
                        success("新建文件夹成功")
                        setInputName(inputName)
                        setFolderNameById()
                        setExportData && setExportData([])
                    })
                    .catch((e: any) => {
                        failed(`新建文件夹失败：${e}`)
                        setData(data.filter((item) => !item.isCreate))
                    })
            }
            // 编辑
            else {
                ipcRenderer
                    .invoke("RenamePayloadFolder", {
                        Name: folder.name,
                        NewName: inputName
                    })
                    .then(() => {
                        success("修改成功")
                        setInputName(inputName)
                        setFolderNameById()
                    })
                    .catch((e: any) => {
                        setInputName(folder.name)
                        failed(`编辑失败：${e}`)
                    })
            }
        } else {
            !pass && warn("名称不允许出现/*,")
            // 创建时为空则不创建
            if (folder.isCreate) {
                setData(data.filter((item) => !item.isCreate))
                allFolderName.includes(inputName) && inputName.length !== 0 && warn("文件夹名重复，不可创建")
            }
            // 编辑时为空恢复
            else {
                // 没有修改
                setInputName(folder.name)
                folder.name !== inputName && allFolderName.includes(inputName) && warn("文件夹名重复，不可编辑")
            }
        }
    })

    const onDeleteFolderById = useMemoizedFn((id: string) => {
        // 文件夹只会存在第一层 不用递归遍历
        const newData = data.filter((item) => item.id !== id)
        setData(newData)
        // 如果删除的包含选中项 则重新选择
        const sourceFolders = findFoldersById(data, id)
        if (sourceFolders && sourceFolders?.node && showType === "local") {
            let results = sourceFolders.node.find((item) => item.id === selectItem)
            if (results) setContentType(undefined)
        }
    })

    // 删除文件夹
    const onDeleteFolder = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeletePayloadByFolder", {
                Name: folder.name
            })
            .then(() => {
                success("删除成功")
                onDeleteFolderById(folder.id)
                setDeleteVisible(false)
                setExportData && setExportData([])
            })
            .catch((e: any) => {
                setDeleteVisible(false)
                failed(`删除失败：${e}`)
            })
    })

    // 右键展开菜单
    const handleRightClick = useMemoizedFn((e) => {
        e.preventDefault()
        if (!onlyInsert) {
            setMenuOpen(true)
        }
    })

    const allCheckIds = useMemo(() => {
        return getDataBaseIds(folder.node || [])
    }, [folder.node])

    // 上传
    const onUpload = useMemoizedFn(() => {
        setUploadVisible(true)
    })

    return (
        <>
            {isEditInput ? (
                <div className={styles["file-input"]} style={{paddingLeft: 8}}>
                    <YakitInput
                        value={inputName}
                        autoFocus
                        showCount
                        maxLength={50}
                        onPressEnter={() => {
                            onChangeValue()
                        }}
                        onBlur={() => {
                            onChangeValue()
                        }}
                        onChange={(e) => {
                            setInputName(e.target.value)
                        }}
                    />
                </div>
            ) : (
                <div style={{display: "flex", alignItems: "center"}}>
                    {onlyInsert && (
                        <div style={{marginRight: 5}}>
                            <YakitCheckbox
                                onChange={(e) => {
                                    const index = folder.id.indexOf("-")
                                    // 使用 substring 方法获取第一个 "-" 后的所有内容
                                    const str = folder.id.substring(index + 1)
                                    if (e.target.checked) {
                                        const arr = [...floderChecked]
                                        arr.push(str)
                                        const newfloderChecked = [...new Set(arr)]
                                        onSetFloderChecked(newfloderChecked)
                                    } else {
                                        const arr = floderChecked.filter((i) => i !== str)
                                        onSetFloderChecked([...arr])
                                    }
                                }}
                            />
                        </div>
                    )}
                    <div
                        style={{flex: 1}}
                        className={classNames(styles["folder"], {
                            [styles["folder-active"]]: folder.id === selectItem,
                            [styles["folder-no-active"]]: folder.id !== selectItem,
                            [styles["folder-menu"]]: menuOpen,
                            [styles["folder-combine"]]: isCombine,
                            [styles["folder-no-combine"]]: !isCombine,
                            [styles["folder-border"]]:
                                !isCombine && !menuOpen && !isDragging && !expandArr.includes(folder.id)
                        })}
                        onClick={() => {
                            if (onlyInsert) {
                                setSelectItem(folder.id)
                            }
                            if (expandArr.includes(folder.id)) {
                                setExpandArr(expandArr.filter((item) => item !== folder.id))
                            } else {
                                setExpandArr([...expandArr, folder.id])
                            }
                        }}
                        onContextMenu={handleRightClick}
                    >
                        <div className={styles["folder-header"]}>
                            {!onlyInsert && (
                                <YakitCheckbox
                                    checked={
                                        allCheckIds.length > 0 &&
                                        allCheckIds.every((element) => exportData.includes(element))
                                    }
                                    disabled={allCheckIds.length === 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setExportData &&
                                                setExportData((old) => filterItem([...old, ...allCheckIds]))
                                        } else {
                                            setExportData &&
                                                setExportData((old: string[]) =>
                                                    old.filter((item) => !allCheckIds.includes(item))
                                                )
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                            <div className={styles["is-fold-icon"]}>
                                {expandArr.includes(folder.id) ? <SolidChevrondownIcon /> : <SolidChevronrightIcon />}
                            </div>
                            <div className={styles["folder-icon"]}>
                                <SolidFolderopenIcon />
                            </div>
                            <div className={classNames(styles["folder-name"], "yakit-content-single-ellipsis")}>
                                {inputName}
                            </div>
                        </div>
                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-dot"]]: !onlyInsert && menuOpen,
                                [styles["extra-hover"]]: !onlyInsert && !menuOpen
                            })}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles["file-count"]}>{folder?.node ? folder.node.length : 0}</div>
                            {!onlyInsert && (
                                <YakitDropdownMenu
                                    menu={{
                                        data: [
                                            {
                                                key: "copyFuzztag",
                                                label: (
                                                    <div className={styles["extra-menu"]}>
                                                        <OutlineDocumentduplicateIcon />
                                                        <div className={styles["menu-name"]}>复制 Fuzztag</div>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: "addChildPayload",
                                                label: (
                                                    <div className={styles["extra-menu"]}>
                                                        <OutlineAddPayloadIcon />
                                                        <div className={styles["menu-name"]}>新增子集字典</div>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: "rename",
                                                label: (
                                                    <div className={styles["extra-menu"]}>
                                                        <OutlinePencilaltIcon />
                                                        <div className={styles["menu-name"]}>重命名</div>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: "upload",
                                                label: (
                                                    <div className={styles["extra-menu"]}>
                                                        <OutlineUploadIcon />
                                                        <div className={styles["menu-name"]}>上传</div>
                                                    </div>
                                                ),
                                                disabled: !isPayloadOperator(userInfo)
                                            },
                                            {
                                                type: "divider"
                                            },
                                            {
                                                key: "delete",
                                                label: (
                                                    <div className={styles["extra-menu"]}>
                                                        <OutlineTrashIcon />
                                                        <div className={styles["menu-name"]}>删除</div>
                                                    </div>
                                                ),
                                                type: "danger"
                                            }
                                        ],
                                        onClick: ({key}) => {
                                            setMenuOpen(false)
                                            switch (key) {
                                                case "copyFuzztag":
                                                    setClipboardText(`{{payload(${inputName}/*)}}`)
                                                    break
                                                case "addChildPayload":
                                                    // 注: 此处需注意文件夹
                                                    const m = showYakitModal({
                                                        getContainer:
                                                            document.getElementById("new-payload") || document.body,
                                                        title: null,
                                                        footer: null,
                                                        width: 566,
                                                        type: "white",
                                                        closable: false,
                                                        maskClosable: false,
                                                        hiddenHeader: true,
                                                        content: (
                                                            <CreateDictionaries
                                                                title='新建子集字典'
                                                                type='dictionaries'
                                                                onQueryGroup={onQueryGroup}
                                                                folder={folder.name}
                                                                onClose={() => {
                                                                    m.destroy()
                                                                }}
                                                            />
                                                        )
                                                    })
                                                    break
                                                case "rename":
                                                    setEditInput(true)
                                                    break
                                                case "upload":
                                                    onUpload()
                                                    break
                                                case "delete":
                                                    setDeleteVisible(true)
                                                    break
                                                default:
                                                    break
                                            }
                                        }
                                    }}
                                    dropdown={{
                                        trigger: ["click"],
                                        placement: "bottomRight",
                                        onVisibleChange: (v) => {
                                            setMenuOpen(v)
                                        },
                                        visible: menuOpen
                                    }}
                                >
                                    <div className={styles["extra-icon"]}>
                                        <SolidDotsverticalIcon />
                                    </div>
                                </YakitDropdownMenu>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {onlyInsert ? (
                <>
                    {expandArr.includes(folder.id) &&
                        Array.isArray(folder.node) &&
                        folder.node.map((file, index) => (
                            <FileComponent
                                key={file.id}
                                file={file}
                                folder={folder.name}
                                selectItem={selectItem}
                                setSelectItem={setSelectItem}
                                data={data}
                                setData={setData}
                                isInside={true}
                                codePath={codePath}
                                onQueryGroup={onQueryGroup}
                                setContentType={setContentType}
                                onlyInsert={onlyInsert}
                                endBorder={(folder.node?.length || 0) - 1 === index}
                                checkedItem={checkedItem}
                                onCheckedItem={onCheckedItem}
                                showType={showType}
                            />
                        ))}
                </>
            ) : (
                <>
                    {expandArr.includes(folder.id) && (
                        <Droppable
                            droppableId={`${folder.id}`}
                            type={subDropType}
                            isCombineEnabled={false}
                            direction='vertical'
                            renderClone={(provided, snapshot, rubric) => {
                                const file: DataItem[] =
                                    folder.node?.filter((item, index) => `${item.id}` === rubric.draggableId) || []

                                const cloneStyle = cloneItemStyle(provided.draggableProps.style)
                                const fileInside =
                                    moveLevel?.draggableId === file[0].id ? moveLevel.level === "inside" : true
                                return (
                                    <div
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        ref={provided.innerRef}
                                        style={{...cloneStyle}}
                                    >
                                        <>
                                            {file.length > 0 && (
                                                <FileComponentClone
                                                    file={file[0]}
                                                    selectItem={selectItem}
                                                    isInside={fileInside}
                                                />
                                            )}
                                        </>
                                    </div>
                                )
                            }}
                        >
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                    {Array.isArray(folder.node) &&
                                        folder.node.map((file, index) => (
                                            <Draggable key={file.id} draggableId={file.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            ...provided.draggableProps.style
                                                        }}
                                                    >
                                                        {/* 渲染文件组件 */}
                                                        <FileComponent
                                                            file={file}
                                                            folder={folder.name}
                                                            selectItem={selectItem}
                                                            setSelectItem={setSelectItem}
                                                            data={data}
                                                            setData={setData}
                                                            isInside={true}
                                                            codePath={codePath}
                                                            onQueryGroup={onQueryGroup}
                                                            setContentType={setContentType}
                                                            endBorder={(folder.node?.length || 0) - 1 === index}
                                                            exportData={exportData}
                                                            setExportData={setExportData}
                                                            userInfo={userInfo}
                                                            showType={showType}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    )}
                </>
            )}
            {deleteVisible && (
                <DeleteConfirm visible={deleteVisible} setVisible={setDeleteVisible} onFinish={onDeleteFolder} />
            )}
            {uploadVisible && (
                <UploadOrDownloadByPayloadGrpc
                    group={""}
                    folder={folder.name}
                    setUploadOrDownloadVisible={setUploadVisible}
                    finished={() => {
                        emiter.emit("refreshOnlineListEvent")
                    }}
                />
            )}
        </>
    )
}

interface DeleteConfirmProps {
    visible: boolean
    setVisible: (v: boolean) => void
    onFinish: () => void
}

// 删除确认弹窗
export const DeleteConfirm: React.FC<DeleteConfirmProps> = (props) => {
    const {visible, setVisible, onFinish} = props
    const [check, setCheck] = useState<boolean>(false)
    const [showConfirm, setShowConfirm] = useState<boolean>(false)
    const NewPayloadDeleteConfirm = "NewPayloadDeleteConfirm"
    useEffect(() => {
        getRemoteValue(NewPayloadDeleteConfirm).then((res) => {
            if (!res) {
                setShowConfirm(true)
                return
            }
            try {
                const obj = JSON.parse(res)
                if (!obj.check) {
                    setShowConfirm(true)
                } else {
                    onFinish()
                }
            } catch (error) {}
        })
    }, [])

    const onCheck = useMemoizedFn((v: boolean) => {
        setCheck(v)
        setRemoteValue(NewPayloadDeleteConfirm, JSON.stringify({check: v}))
    })

    return (
        <>
            {/* 删除确认弹框 */}
            <YakitHint
                visible={showConfirm && visible}
                title='是否要删除'
                content='确认删除后将会彻底删除'
                footerExtra={
                    <YakitCheckbox value={check} onChange={(e) => onCheck(e.target.checked)}>
                        下次不再提醒
                    </YakitCheckbox>
                }
                onOk={() => {
                    onFinish()
                }}
                onCancel={() => {
                    setVisible(false)
                }}
            />
        </>
    )
}

interface FileComponentProps {
    file: DataItem
    folder?: string
    selectItem?: string
    setSelectItem: (id: string) => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    onQueryGroup: (obj?: {Group: string; Folder: string}) => void
    // 是否为内层
    isInside?: boolean
    // 是否合并
    isCombine?: boolean
    // 导出所需数据
    codePath?: string
    // 展示控制
    setContentType: (v?: "editor" | "table") => void
    onlyInsert?: boolean
    // 是否拖拽中
    isDragging?: boolean
    // 是否在其底部显示border
    endBorder?: boolean
    checkedItem?: string[]
    onCheckedItem?: (id: string[]) => void
    exportData?: string[]
    setExportData?: (ids: React.SetStateAction<string[]>) => void
    userInfo?: UserInfoProps
    showType?: "local" | "online"
}

export const FileComponent: React.FC<FileComponentProps> = (props) => {
    const {
        file,
        folder,
        selectItem,
        setSelectItem,
        isInside = true,
        isCombine,
        data,
        setData,
        onQueryGroup,
        codePath = "",
        setContentType,
        onlyInsert,
        isDragging,
        endBorder,
        checkedItem = [],
        onCheckedItem = () => {},
        exportData = [],
        setExportData,
        userInfo,
        showType
    } = props
    const {theme} = useTheme()
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(file.isCreate === true)
    const [inputName, setInputName] = useState<string>(file.name)
    // 转为数据库存储token
    const [token, setToken] = useState(randomString(20))
    const [visible, setVisible] = useState<boolean>(false)

    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const [exportType, setExportType] = useState<ExportTypeProps>()
    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<string[]>([])

    // delete
    const [deleteVisible, setDeleteVisible] = useState<boolean>(false)

    // upload
    const [uploadVisible, setUploadVisible] = useState<boolean>(false)

    // 根据Id修改文件名
    const setFileById = useMemoizedFn((id: string, newName: string) => {
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const selectData = findFoldersById(copyData, id)
        if (selectData) {
            if (selectData.type === "Folder") {
                let node =
                    selectData.node?.map((item) => {
                        if (item.id === id) {
                            return {...item, name: newName}
                        }
                        return item
                    }) || []
                const newData = copyData.map((item) => {
                    if (item.id === selectData.id) {
                        return {...item, node}
                    }
                    return item
                })
                setData(newData)
            } else {
                const newData = copyData.map((item) => {
                    if (item.id === id) {
                        return {...item, name: newName}
                    }
                    return item
                })
                setData(newData)
            }
        }
    })

    // 获取所有文件名
    const getAllFileName = useMemoizedFn(() => {
        let name: string[] = []
        data.forEach((item) => {
            if (item.type !== "Folder") {
                name.push(item.name)
            }
            if (item.node) {
                item.node.forEach((itemIn) => {
                    name.push(itemIn.name)
                })
            }
        })
        return name
    })

    // 更改文件名
    const onChangeValue = useMemoizedFn(() => {
        setEditInput(false)
        const allFileName = getAllFileName()
        const pass: boolean = !isIncludeSpecial(inputName)
        if (inputName.length > 0 && !allFileName.includes(inputName) && pass) {
            ipcRenderer
                .invoke("RenamePayloadGroup", {
                    Name: file.name,
                    NewName: inputName
                })
                .then(() => {
                    success("修改成功")
                    setInputName(inputName)
                    setFileById(file.id, inputName)
                    setExportData && setExportData([])
                })
                .catch((e: any) => {
                    setInputName(file.name)
                    failed(`编辑失败：${e}`)
                })
        } else {
            file.name !== inputName && allFileName.includes(inputName) && warn("名称重复，编辑失败")
            !pass && warn("名称不允许出现/*,")
            setInputName(file.name)
        }
    })

    // 根据Id删除文件
    const onDeletePayloadById = useMemoizedFn((id: string) => {
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const selectData = findFoldersById(copyData, id)
        if (selectData) {
            if (selectData.type === "Folder") {
                let node = selectData.node?.filter((item) => item.id !== id)
                const newData = copyData.map((item) => {
                    if (item.id === selectData.id && node) {
                        return {...item, node}
                    } else if (item.id === selectData.id && node === undefined) {
                        delete item.node
                        return item
                    }
                    return item
                })
                setData(newData)
                let results = selectData.node?.find((item) => item.id === selectItem)
                if (results && showType === "local") setContentType(undefined)
            } else {
                const newData = copyData.filter((item) => item.id !== id)
                setData(newData)

                if (selectItem === id && showType === "local") setContentType(undefined)
            }
        }
    })

    // 删除Payload
    const onDeletePayload = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeletePayloadByGroup", {
                Group: file.name
            })
            .then(() => {
                success("删除成功")
                onDeletePayloadById(file.id)
                setDeleteVisible(false)
                setExportData && setExportData([])
            })
            .catch((e: any) => {
                setDeleteVisible(false)
                failed(`删除失败：${e}`)
            })
    })

    // 导出Csv
    const onExportCsv = useMemoizedFn(() => {
        setExportVisible(true)
        setExportType("csv")
    })

    // 文件导出
    const onExportTxt = useMemoizedFn(() => {
        setExportVisible(true)
        setExportType("file")
    })

    // 上传
    const onUpload = useMemoizedFn(() => {
        setUploadVisible(true)
    })

    // 转为数据库存储
    const onGroupToDatabase = useMemoizedFn(() => {
        ipcRenderer.invoke(
            "ConvertPayloadGroupToDatabase",
            {
                Name: inputName
            },
            token
        )
        if (file.id === selectItem && showType === "local") setContentType(undefined)
        setVisible(true)
    })

    // 取消转为数据库存储
    const cancelRemoveDuplicate = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-ConvertPayloadGroupToDatabase", token)
    })

    // 监听转为数据库存储
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    setStreamData(data)
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[ToDatabase] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            logInfoRef.current = []
            onQueryGroup({
                Group: file.name,
                Folder: folder || ""
            })
            info("[ToDatabase] finished")
        })
        return () => {
            ipcRenderer.invoke("cancel-ConvertPayloadGroupToDatabase", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const fileMenuData = useMemo(() => {
        // 此处数据库导出为csv 文件导出为txt
        return file.type === "DataBase"
            ? [
                  {
                      key: "copyFuzztag",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineDocumentduplicateIcon />
                              <div className={styles["menu-name"]}>复制 Fuzztag</div>
                          </div>
                      )
                  },
                  {
                      key: "importPayload",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineImportIcon />
                              <div className={styles["menu-name"]}>扩充字典</div>
                          </div>
                      )
                  },
                  {
                      key: "exportCsv",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineExportIcon />
                              <div className={styles["menu-name"]}>导出字典</div>
                          </div>
                      )
                  },
                  {
                      key: "rename",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlinePencilaltIcon />
                              <div className={styles["menu-name"]}>重命名</div>
                          </div>
                      )
                  },
                  {
                      key: "upload",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineUploadIcon />
                              <div className={styles["menu-name"]}>上传</div>
                          </div>
                      ),
                      disabled: !isPayloadOperator(userInfo)
                  },
                  {
                      type: "divider"
                  },
                  {
                      key: "delete",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineTrashIcon />
                              <div className={styles["menu-name"]}>删除</div>
                          </div>
                      ),
                      type: "danger"
                  }
              ]
            : [
                  {
                      key: "copyFuzztag",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineDocumentduplicateIcon />
                              <div className={styles["menu-name"]}>复制 Fuzztag</div>
                          </div>
                      )
                  },
                  {
                      key: "exportTxt",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineExportIcon />
                              <div className={styles["menu-name"]}>导出字典</div>
                          </div>
                      )
                  },
                  {
                      key: "rename",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlinePencilaltIcon />
                              <div className={styles["menu-name"]}>重命名</div>
                          </div>
                      )
                  },
                  {
                      key: "toDatabase",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineDatabasebackupIcon />
                              <div className={styles["menu-name"]}>转为数据库存储</div>
                          </div>
                      )
                  },
                  {
                      key: "upload",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineUploadIcon />
                              <div className={styles["menu-name"]}>上传</div>
                          </div>
                      ),
                      disabled: !isPayloadOperator(userInfo)
                  },
                  {
                      type: "divider"
                  },
                  {
                      key: "delete",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineTrashIcon />
                              <div className={styles["menu-name"]}>删除</div>
                          </div>
                      ),
                      type: "danger"
                  }
              ]
    }, [userInfo?.isLogin])

    // 右键展开菜单
    const handleRightClick = useMemoizedFn((e) => {
        e.preventDefault()
        if (!onlyInsert) {
            setSelectItem(file.id)
            setMenuOpen(true)
        }
    })

    return (
        <>
            {isEditInput ? (
                <div className={styles["file-input"]} style={{paddingLeft: isInside ? 28 : 8}}>
                    <YakitInput
                        value={inputName}
                        autoFocus
                        showCount
                        maxLength={50}
                        onPressEnter={() => {
                            onChangeValue()
                        }}
                        onBlur={() => {
                            onChangeValue()
                        }}
                        onChange={(e) => {
                            setInputName(e.target.value)
                        }}
                    />
                </div>
            ) : (
                <div style={{display: "flex", alignItems: "center"}}>
                    {onlyInsert && (
                        <div style={{marginRight: 5}}>
                            <YakitCheckbox
                                onChange={(e) => {
                                    const index = file.id.indexOf("-")
                                    // 使用 substring 方法获取第一个 "-" 后的所有内容
                                    const str = file.id.substring(index + 1)
                                    if (e.target.checked) {
                                        const arr = [...checkedItem]
                                        arr.push(str)
                                        const newCgheckedItem = [...new Set(arr)]
                                        onCheckedItem(newCgheckedItem)
                                    } else {
                                        const arr = checkedItem.filter((i) => i !== str)
                                        onCheckedItem([...arr])
                                    }
                                }}
                            />
                        </div>
                    )}
                    <div
                        style={{flex: 1}}
                        className={classNames(styles["file"], {
                            [styles["file-active"]]: file.id === selectItem,
                            [styles["file-no-active"]]: file.id !== selectItem,
                            [styles["file-menu"]]: menuOpen && file.id !== selectItem,
                            [styles["file-combine"]]: isCombine,
                            [styles["file-outside"]]: !isInside,
                            [styles["file-inside"]]: isInside,
                            [styles["file-dragging"]]: !isInside && !isDragging,
                            [styles["file-end-border"]]: endBorder
                        })}
                        onClick={() => {
                            setSelectItem(file.id)
                        }}
                        onContextMenu={handleRightClick}
                    >
                        <div className={styles["file-header"]}>
                            {!onlyInsert && (
                                <>
                                    <YakitCheckbox
                                        className={classNames(styles["payload-checkbox"], {
                                            [styles["payload-dark-checkbox"]]:
                                                file.id !== selectItem && theme === "dark"
                                        })}
                                        checked={exportData.includes(file.name)}
                                        disabled={getDataBaseIds([file]).length === 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setExportData &&
                                                    setExportData((old) =>
                                                        filterItem([...old, ...getDataBaseIds([file])])
                                                    )
                                            } else {
                                                let notExportArr = getDataBaseIds([file])
                                                setExportData &&
                                                    setExportData((old: string[]) =>
                                                        old.filter((item) => !notExportArr.includes(item))
                                                    )
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className={styles["drag-icon"]}>
                                        <SolidDragsortIcon />
                                    </div>
                                </>
                            )}
                            {file.type === "DataBase" ? (
                                <div className={classNames(styles["file-icon"], styles["file-icon-database"])}>
                                    <SolidDatabaseIcon />
                                </div>
                            ) : (
                                <div className={classNames(styles["file-icon"], styles["file-icon-document"])}>
                                    <SolidDocumenttextIcon />
                                </div>
                            )}

                            <div className={styles["file-name"]}>{inputName}</div>
                        </div>
                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-dot"]]: !onlyInsert && menuOpen,
                                [styles["extra-hover"]]: !onlyInsert && !menuOpen
                            })}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles["file-count"]} style={onlyInsert ? {display: "block"} : {}}>
                                {file.type === "DataBase" ? file.number : ""}
                            </div>
                            {!onlyInsert && (
                                <YakitDropdownMenu
                                    menu={{
                                        data: fileMenuData as YakitMenuItemProps[],
                                        onClick: ({key}) => {
                                            setMenuOpen(false)
                                            switch (key) {
                                                case "copyFuzztag":
                                                    setClipboardText(`{{payload(${inputName})}}`)
                                                    break
                                                case "importPayload":
                                                    const m = showYakitModal({
                                                        getContainer:
                                                            document.getElementById("new-payload") || document.body,
                                                        title: null,
                                                        footer: null,
                                                        width: 566,
                                                        type: "white",
                                                        closable: false,
                                                        maskClosable: false,
                                                        hiddenHeader: true,
                                                        content: (
                                                            <CreateDictionaries
                                                                title={`扩充到 ${inputName}`}
                                                                type='payload'
                                                                onQueryGroup={onQueryGroup}
                                                                folder={folder}
                                                                group={inputName}
                                                                onClose={() => {
                                                                    m.destroy()
                                                                }}
                                                            />
                                                        )
                                                    })
                                                    break
                                                case "exportCsv":
                                                    onExportCsv()
                                                    break
                                                case "exportTxt":
                                                    onExportTxt()
                                                    break
                                                case "rename":
                                                    setEditInput(true)
                                                    break
                                                case "toDatabase":
                                                    onGroupToDatabase()
                                                    break
                                                case "upload":
                                                    onUpload()
                                                    break
                                                case "delete":
                                                    setDeleteVisible(true)
                                                    break
                                                default:
                                                    break
                                            }
                                        }
                                    }}
                                    dropdown={{
                                        overlayClassName: styles["payload-list-menu"],
                                        trigger: ["click"],
                                        placement: "bottomRight",
                                        onVisibleChange: (v) => {
                                            setMenuOpen(v)
                                        },
                                        visible: menuOpen
                                    }}
                                >
                                    <div className={styles["extra-icon"]}>
                                        <SolidDotsverticalIcon />
                                    </div>
                                </YakitDropdownMenu>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <YakitModal
                centered
                getContainer={document.getElementById("new-payload") || document.body}
                visible={visible}
                title={null}
                footer={null}
                width={520}
                type='white'
                closable={false}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <UploadStatusInfo
                    title={"转为数据库存储中，请耐心等待..."}
                    streamData={streamData}
                    cancelRun={() => {
                        cancelRemoveDuplicate()
                        setVisible(false)
                    }}
                    onClose={() => {
                        setVisible(false)
                    }}
                    logInfo={logInfoRef.current}
                    showDownloadDetail={false}
                    autoClose={true}
                />
            </YakitModal>
            {deleteVisible && (
                <DeleteConfirm visible={deleteVisible} setVisible={setDeleteVisible} onFinish={onDeletePayload} />
            )}
            {exportVisible && (
                <ExportByPayloadGrpc
                    group={file.name}
                    folder={folder || ""}
                    setExportVisible={setExportVisible}
                    exportType={exportType}
                />
            )}
            {uploadVisible && (
                <UploadOrDownloadByPayloadGrpc
                    group={file.name}
                    folder={folder || ""}
                    setUploadOrDownloadVisible={setUploadVisible}
                    finished={() => {
                        emiter.emit("refreshOnlineListEvent")
                    }}
                />
            )}
        </>
    )
}

interface MoveOrCopyPayloadProps {
    group: string
    copyMoveValueRef: any
}

interface MoveOrCopyParamsProps {
    file: string
    folder?: string
}

export const MoveOrCopyPayload: React.FC<MoveOrCopyPayloadProps> = (props) => {
    const {copyMoveValueRef, group} = props
    const [value, setValue] = useState<string>()
    const [fileArr, setFileArr] = useState<MoveOrCopyParamsProps[]>([])
    useEffect(() => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
                let arr: MoveOrCopyParamsProps[] = []
                res.Nodes.forEach((item) => {
                    if (item.Type !== "Folder") {
                        arr.push({file: item.Name, folder: ""})
                    } else {
                        item.Nodes.forEach((itemIn) => {
                            arr.push({file: itemIn.Name, folder: item.Name})
                        })
                    }
                })
                setFileArr(arr.filter((item) => item.file !== group))
            })
            .catch((e: any) => {
                failed(`获取数据失败：${e}`)
            })
            .finally()
    }, [])
    return (
        <div style={{padding: "20px 24px"}}>
            <YakitSelect
                value={value}
                onSelect={(val) => {
                    setValue(val)
                    let item = fileArr.filter((item) => item.file === val)[0]
                    copyMoveValueRef.current = item
                }}
                placeholder='请选择...'
            >
                {fileArr.map((item) => (
                    <YakitSelect value={item.file} key={item.file}>
                        {item.file}
                    </YakitSelect>
                ))}
            </YakitSelect>
        </div>
    )
}

interface PayloadLocalContentProps {
    isExpand?: boolean
    setExpand?: (v: boolean) => void
    showContentType: "editor" | "table"
    group: string
    folder: string
    onlyInsert?: boolean
    onClose?: () => void
}

interface PayloadFileDataProps {
    Data: Uint8Array
    IsBigFile: boolean
}

type ExportTypeProps = "csv" | "file" | "all"

export const PayloadLocalContent: React.FC<PayloadLocalContentProps> = (props) => {
    const {isExpand, setExpand, showContentType, group, folder, onlyInsert, onClose} = props
    const [isEditMonaco, setEditMonaco] = useState<boolean>(false)
    const [editorValue, setEditorValue] = useState<string>("")
    const [payloadFileData, setPayloadFileData] = useState<PayloadFileDataProps>()

    const [selectPayloadArr, setSelectPayloadArr] = useState<number[]>([])
    const [params, setParams, getParams] = useGetState<QueryPayloadParams>({
        Keyword: "",
        Folder: "",
        Group: "",
        Pagination: {Page: 1, Limit: 20, Order: "asc", OrderBy: "id"}
    })
    const [response, setResponse] = useState<QueryGeneralResponse<Payload>>()
    const pagination: PaginationSchema | undefined = response?.Pagination
    const [loading, setLoading] = useState<boolean>(false)

    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const [exportType, setExportType] = useState<ExportTypeProps>()
    // 去重token
    const [token, setToken] = useState(randomString(20))
    const [visible, setVisible] = useState<boolean>(false)

    const copyMoveValueRef = useRef<MoveOrCopyParamsProps>()
    const userInfo = useStore((s) => s.userInfo)
    const headerRef = useRef<HTMLDivElement>(null)
    const size = useSize(headerRef)

    const onRefreshTableEvent = useMemoizedFn(() => {
        onQueryPayload()
    })

    useEffect(() => {
        emiter.on("refreshTableEvent", onRefreshTableEvent)
        return () => {
            emiter.off("refreshTableEvent", onRefreshTableEvent)
        }
    }, [])

    useDebounceEffect(
        () => {
            reset()
            // 获取table数据
            if (showContentType === "table") {
                onQueryPayload(undefined, undefined, true)
            }
            // 获取editor数据
            else {
                onQueryEditor(group, folder)
            }
        },
        [group, folder, showContentType],
        {
            wait: 200
        }
    )

    const reset = useMemoizedFn(() => {
        setEditorValue("")
        setPayloadFileData(undefined)
        setResponse(undefined)
        setSelectPayloadArr([])
    })

    const Expand = () => (
        <div
            className={styles["icon-box"]}
            onClick={() => {
                setExpand && setExpand(!isExpand)
            }}
        >
            {isExpand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
        </div>
    )

    const onQueryEditor = useMemoizedFn((Group: string, Folder: string) => {
        setLoading(true)

        ipcRenderer
            .invoke("QueryPayloadFromFile", {
                Group,
                Folder
            })
            .then((data: PayloadFileDataProps) => {
                setPayloadFileData(data)
                setEditorValue(Uint8ArrayToString(data.Data))
            })
            .catch((e: any) => {
                failed("编辑器数据获取失败")
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const onSaveFileFun = useMemoizedFn(() => {
        ipcRenderer
            .invoke("UpdatePayloadToFile", {
                GroupName: group,
                Content: editorValue
            })
            .then(() => {
                onQueryEditor(group, folder)
                setEditMonaco(false)
                success("保存成功")
            })
            .catch((e: any) => {
                failed(`UpdatePayloadToFile failed:${e}`)
            })
    })

    const onQueryPayload = useMemoizedFn((page?: number, limit?: number, isNoRefreshList?: boolean) => {
        const obj: QueryPayloadParams = {
            ...getParams(),
            Group: group,
            Folder: folder,
            Pagination: {
                ...getParams().Pagination,
                Page: page || getParams().Pagination.Page,
                Limit: limit || getParams().Pagination.Limit
            }
        }
        ipcRenderer
            .invoke("QueryPayload", obj)
            .then((data: QueryGeneralResponse<Payload>) => {
                setResponse(data)
                if (!isNoRefreshList) {
                    // 通知刷新列表
                    emiter.emit("refreshListEvent")
                }
            })
            .catch((e: any) => {
                failed(`QueryPayload failed：${e}`)
            })
    })

    const onDeletePayload = useMemoizedFn((deletePayload: DeletePayloadProps) => {
        ipcRenderer
            .invoke("DeletePayload", deletePayload)
            .then(() => {
                let page = pagination?.Page
                // 如为当页全部删除回到第一页
                if (pagination && deletePayload.Ids?.length === response?.Data.length) {
                    page = 1
                }
                onQueryPayload(page, pagination?.Limit)
                setSelectPayloadArr([])
                success("删除成功")
            })
            .catch((e: any) => {
                failed("删除失败：" + e)
            })
    })

    const onCopyOrMoveFun = useMemoizedFn((id?: number, isCopy = false) => {
        return new Promise((resolve, reject) => {
            if (copyMoveValueRef.current === undefined) {
                warn("请选择字典")
                resolve(false)
            } else {
                const {folder, file} = copyMoveValueRef.current
                ipcRenderer
                    .invoke("BackUpOrCopyPayloads", {
                        Ids: id ? [id] : selectPayloadArr,
                        Group: file,
                        Folder: folder,
                        Copy: isCopy
                    })
                    .then(() => {
                        success("操作成功")
                        onQueryPayload()
                        resolve(true)
                    })
                    .catch((e: any) => {
                        failed(`操作字典失败${e}`)
                        resolve(false)
                    })
                    .finally()
            }
        })
    })

    const onCopyToOtherPayload = useMemoizedFn((id?: number) => {
        copyMoveValueRef.current = undefined
        const m = showYakitModal({
            title: "备份到其他字典",
            width: 400,
            type: "white",
            closable: false,
            content: <MoveOrCopyPayload copyMoveValueRef={copyMoveValueRef} group={group} />,
            onCancel: () => {
                m.destroy()
            },
            onOk: async () => {
                let result = await onCopyOrMoveFun(id, true)
                if (result) {
                    setSelectPayloadArr([])
                    m.destroy()
                }
            }
        })
    })

    const onMoveToOtherPayload = useMemoizedFn((id?: number) => {
        copyMoveValueRef.current = undefined
        const y = showYakitModal({
            title: "移动到其他字典",
            width: 400,
            type: "white",
            closable: false,
            content: <MoveOrCopyPayload copyMoveValueRef={copyMoveValueRef} group={group} />,
            onCancel: () => {
                y.destroy()
            },
            onOk: async () => {
                let result = await onCopyOrMoveFun(id)
                if (result) {
                    setSelectPayloadArr([])
                    y.destroy()
                }
            }
        })
    })

    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<string[]>([])

    // 自动去重
    const onRemoveDuplicate = useMemoizedFn(() => {
        ipcRenderer.invoke(
            "RemoveDuplicatePayloads",
            {
                Name: group
            },
            token
        )
        setVisible(true)
    })

    // 取消去重任务
    const cancelRemoveDuplicate = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-RemoveDuplicatePayloads", token)
    })

    // 监听去重任务
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    setStreamData(data)
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[RemoveDuplicate] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            logInfoRef.current = []
            info("[RemoveDuplicate] finished")
            onQueryEditor(group, folder)
        })
        return () => {
            ipcRenderer.invoke("cancel-RemoveDuplicatePayloads", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [group, folder])

    const isNoSelect: boolean = useMemo(() => selectPayloadArr.length === 0, [selectPayloadArr])

    return (
        <div className={styles["payload-content"]}>
            <div className={styles["header"]} ref={headerRef}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>{group}</div>
                    <div className={styles["sub-title"]}>
                        {showContentType === "editor" && payloadFileData?.IsBigFile ? (
                            <YakitTag color='danger'>超大字典</YakitTag>
                        ) : selectPayloadArr.length > 0 ? (
                            <div className={styles["total-item"]}>
                                <span className={styles["total-item-text"]}>Selected</span>
                                <span className={styles["total-item-number"]}>{selectPayloadArr?.length}</span>
                            </div>
                        ) : (
                            `可以通过 fuzz 模块 {{x(字典名)}} 来渲染`
                        )}
                    </div>
                </div>
                {!onlyInsert && showContentType === "table" && (
                    <div className={styles["extra"]}>
                        <YakitInput.Search
                            placeholder='请输入关键词搜索'
                            value={params.Keyword}
                            onChange={(e) => {
                                setParams({...params, Keyword: e.target.value})
                            }}
                            style={{maxWidth: 200}}
                            onSearch={() => {
                                onQueryPayload(undefined, undefined, true)
                            }}
                        />
                        <Divider type='vertical' style={{top: 1, height: 16}} />
                        <YakitButton
                            type='outline1'
                            colors='danger'
                            icon={<OutlineTrashIcon />}
                            disabled={isNoSelect}
                            onClick={() => {
                                if (!isNoSelect) {
                                    onDeletePayload({Ids: selectPayloadArr})
                                }
                            }}
                        />
                        {isNoSelect && (
                            <YakitButton
                                type='outline2'
                                icon={<OutlineExportIcon />}
                                onClick={() => {
                                    setExportType("csv")
                                    setExportVisible(true)
                                }}
                            >
                                导出
                            </YakitButton>
                        )}
                        {!isNoSelect && size && (
                            <>
                                {size.width < 950 ? (
                                    <>
                                        <Tooltip title={"备份到其他字典"}>
                                            <YakitButton
                                                type='outline2'
                                                icon={<OutlineDocumentduplicateIcon />}
                                                onClick={() => onCopyToOtherPayload()}
                                            />
                                        </Tooltip>
                                        <Tooltip title={"移动到其他字典"}>
                                            <YakitButton
                                                type='outline2'
                                                icon={<OutlineClipboardcopyIcon />}
                                                onClick={() => onMoveToOtherPayload()}
                                            />
                                        </Tooltip>
                                    </>
                                ) : (
                                    <>
                                        <YakitButton
                                            type='outline2'
                                            icon={<OutlineDocumentduplicateIcon />}
                                            onClick={() => onCopyToOtherPayload()}
                                        >
                                            备份到其他字典
                                        </YakitButton>
                                        <YakitButton
                                            type='outline2'
                                            icon={<OutlineClipboardcopyIcon />}
                                            onClick={() => onMoveToOtherPayload()}
                                        >
                                            移动到其他字典
                                        </YakitButton>
                                    </>
                                )}
                            </>
                        )}
                        <YakitButton
                            icon={<OutlinePlusIcon />}
                            onClick={() => {
                                const m = showYakitModal({
                                    getContainer: document.getElementById("new-payload") || document.body,
                                    title: null,
                                    footer: null,
                                    width: 566,
                                    type: "white",
                                    closable: false,
                                    maskClosable: false,
                                    hiddenHeader: true,
                                    content: (
                                        <CreateDictionaries
                                            title={`扩充到 ${group}`}
                                            type='payload'
                                            onQueryGroup={() => {
                                                emiter.emit("refreshListEvent")
                                            }}
                                            folder={folder}
                                            group={group}
                                            onClose={() => {
                                                m.destroy()
                                            }}
                                        />
                                    )
                                })
                            }}
                        >
                            扩充
                        </YakitButton>
                        {setExpand && Expand()}
                    </div>
                )}

                {!onlyInsert && showContentType === "editor" && (
                    <>
                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-hidden"]]: !isEditMonaco
                            })}
                        >
                            <YakitButton
                                type='outline2'
                                icon={<OutlineXIcon />}
                                onClick={() => {
                                    setEditMonaco(false)
                                    payloadFileData && setEditorValue(Uint8ArrayToString(payloadFileData.Data))
                                }}
                            >
                                取消
                            </YakitButton>
                            <YakitButton icon={<SolidStoreIcon />} onClick={onSaveFileFun}>
                                保存
                            </YakitButton>
                            {setExpand && Expand()}
                        </div>

                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-hidden"]]: isEditMonaco
                            })}
                        >
                            <YakitButton
                                type='outline2'
                                icon={<OutlineExportIcon />}
                                onClick={() => {
                                    setExportType("file")
                                    setExportVisible(true)
                                }}
                            >
                                导出
                            </YakitButton>

                            {payloadFileData?.IsBigFile === false && (
                                <>
                                    <YakitButton
                                        type='outline2'
                                        icon={<OutlineSparklesIcon />}
                                        onClick={onRemoveDuplicate}
                                    >
                                        自动去重
                                    </YakitButton>

                                    <YakitButton
                                        onClick={() => {
                                            setEditMonaco(true)
                                        }}
                                        icon={<OutlinePencilaltIcon />}
                                    >
                                        编辑
                                    </YakitButton>
                                </>
                            )}

                            {setExpand && Expand()}
                        </div>
                    </>
                )}

                {onlyInsert && (
                    <div className={styles["extra"]}>
                        <div
                            className={styles["close-btn"]}
                            onClick={() => {
                                onClose && onClose()
                            }}
                        >
                            <OutlineXIcon />
                        </div>
                    </div>
                )}
            </div>
            <div className={styles["content"]}>
                {showContentType === "editor" && (
                    <div className={styles["editor-box"]}>
                        <YakEditor
                            type='plaintext'
                            readOnly={!isEditMonaco}
                            // noLineNumber={true}
                            value={editorValue}
                            setValue={(content: string) => {
                                setEditorValue(content)
                            }}
                            loading={loading}
                            noWordWrap={true}
                        />
                    </div>
                )}
                {showContentType === "table" && (
                    <div className={styles["table-box"]}>
                        <NewPayloadTable
                            onCopyToOtherPayload={onCopyToOtherPayload}
                            onMoveToOtherPayload={onMoveToOtherPayload}
                            selectPayloadArr={selectPayloadArr}
                            setSelectPayloadArr={setSelectPayloadArr}
                            onDeletePayload={onDeletePayload}
                            onQueryPayload={onQueryPayload}
                            pagination={pagination}
                            params={params}
                            response={response}
                            setResponse={setResponse}
                            setParams={setParams}
                            onlyInsert={onlyInsert}
                        />
                    </div>
                )}
            </div>
            <YakitModal
                centered
                getContainer={document.getElementById("new-payload") || document.body}
                visible={visible}
                title={null}
                footer={null}
                width={520}
                type='white'
                closable={false}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <UploadStatusInfo
                    title={"自动去重中，请耐心等待..."}
                    streamData={streamData}
                    cancelRun={() => {
                        cancelRemoveDuplicate()
                        setVisible(false)
                    }}
                    onClose={() => {
                        setVisible(false)
                    }}
                    logInfo={logInfoRef.current}
                    showDownloadDetail={false}
                    autoClose={true}
                />
            </YakitModal>
            {exportVisible && (
                <ExportByPayloadGrpc
                    group={group}
                    folder={folder}
                    setExportVisible={setExportVisible}
                    exportType={exportType}
                />
            )}
        </div>
    )
}

export const PayloadOnlineContent: React.FC<PayloadLocalContentProps> = (props) => {
    const {isExpand, setExpand, showContentType, group, folder} = props
    const [isEditMonaco, setEditMonaco] = useState<boolean>(false)
    const [editorValue, setEditorValue] = useState<string>("")
    const [payloadFileData, setPayloadFileData] = useState<PayloadFileDataProps>()

    const [selectPayloadArr, setSelectPayloadArr] = useState<number[]>([])
    const [params, setParams, getParams] = useGetState<API.PayloadRequest>({
        keyword: "",
        folder: "",
        group: "",
        page: 1,
        limit: 20,
        order: "asc",
        order_by: "id"
    })
    const [response, setResponse] = useState<API.PayloadResponse>()
    const pagination: API.PageMeta | undefined = response?.pagemeta
    const [loading, setLoading] = useState<boolean>(false)

    const userInfo = useStore((s) => s.userInfo)

    const onRefreshTableEvent = useMemoizedFn(() => {
        onQueryPayload()
    })

    useEffect(() => {
        emiter.on("refreshTableEvent", onRefreshTableEvent)
        return () => {
            emiter.off("refreshTableEvent", onRefreshTableEvent)
        }
    }, [])

    useDebounceEffect(
        () => {
            reset()
            // 获取table数据
            if (showContentType === "table") {
                onQueryPayload(undefined, undefined, true)
            }
            // 获取editor数据
            else {
                onQueryEditor(group, folder)
            }
        },
        [group, folder, showContentType],
        {
            wait: 200
        }
    )

    const reset = useMemoizedFn(() => {
        setEditorValue("")
        setPayloadFileData(undefined)
        setResponse(undefined)
        setSelectPayloadArr([])
    })

    const Expand = () => (
        <div
            className={styles["icon-box"]}
            onClick={() => {
                setExpand && setExpand(!isExpand)
            }}
        >
            {isExpand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
        </div>
    )

    const onQueryEditor = useMemoizedFn((Group: string, Folder: string) => {
        setLoading(true)
        // 云端编辑器内容获取
        apiGetOnlinePayloadFile({group: Group, folder: Folder})
            .then((res) => {
                setPayloadFileData({
                    Data: StringToUint8Array(res.data || "") as unknown as Uint8Array,
                    IsBigFile: res.isBigFile || false
                })
                setEditorValue(res.data || "")
            })
            .catch((e: any) => {
                failed(`编辑器数据获取失败：${e}`)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const onSaveFileFun = useMemoizedFn(() => {
        apiUpdateOnlinePayloadFile({
            groupName: group,
            content: editorValue
        })
            .then(() => {
                onQueryEditor(group, folder)
                setEditMonaco(false)
                success("保存成功")
            })
            .catch((e: any) => {
                failed(`UpdatePayloadToFile failed:${e}`)
            })
    })

    const onQueryPayload = useMemoizedFn((page?: number, limit?: number, isNoRefreshList?: boolean) => {
        const obj: API.PayloadRequest = {
            ...getParams(),
            group,
            folder,
            page: page || getParams().page,
            limit: limit || getParams().limit,
            order: "desc",
            order_by: "updated_at"
        }

        apiGetOnlinePayloadList(obj)
            .then((data) => {
                setResponse(data)
                if (!isNoRefreshList) {
                    // 通知刷新列表
                    emiter.emit("refreshOnlineListEvent")
                }
            })
            .catch((e: any) => {
                failed(`QueryPayload failed：${e}`)
            })
    })

    const onDeletePayload = useMemoizedFn((deletePayload: DeleteOnlinePayloadProps) => {
        apiDeleteOnlinePayloadList(deletePayload)
            .then(() => {
                let page = pagination?.page
                // 如为当页全部删除回到第一页
                if (pagination && deletePayload.ids?.length === response?.data.length) {
                    page = 1
                }
                onQueryPayload(page, pagination?.limit)
                setSelectPayloadArr([])
                success("删除成功")
            })
            .catch((e: any) => {
                failed("删除失败：" + e)
            })
    })

    const isNoSelect: boolean = useMemo(() => selectPayloadArr.length === 0, [selectPayloadArr])

    return (
        <div className={styles["payload-content"]}>
            <div className={styles["header"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>{group}</div>
                    <div className={styles["sub-title"]}>
                        {showContentType === "editor" && payloadFileData?.IsBigFile ? (
                            <YakitTag color='danger'>超大字典</YakitTag>
                        ) : selectPayloadArr.length > 0 ? (
                            <div className={styles["total-item"]}>
                                <span className={styles["total-item-text"]}>Selected</span>
                                <span className={styles["total-item-number"]}>{selectPayloadArr?.length}</span>
                            </div>
                        ) : (
                            `可以通过 fuzz 模块 {{x(字典名)}} 来渲染`
                        )}
                    </div>
                </div>
                {showContentType === "table" && (
                    <div className={styles["extra"]}>
                        <YakitInput.Search
                            placeholder='请输入关键词搜索'
                            value={params.keyword}
                            onChange={(e) => {
                                setParams({...params, keyword: e.target.value})
                            }}
                            style={{maxWidth: 200}}
                            onSearch={() => {
                                onQueryPayload(undefined, undefined, true)
                            }}
                        />
                        <Divider type='vertical' style={{top: 1, height: 16}} />
                        <YakitButton
                            type='outline1'
                            colors='danger'
                            icon={<OutlineTrashIcon />}
                            disabled={isNoSelect}
                            onClick={() => {
                                if (!isNoSelect) {
                                    onDeletePayload({ids: selectPayloadArr})
                                }
                            }}
                        />
                        {setExpand && Expand()}
                    </div>
                )}

                {showContentType === "editor" && (
                    <>
                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-hidden"]]: !isEditMonaco
                            })}
                        >
                            <YakitButton
                                type='outline2'
                                icon={<OutlineXIcon />}
                                onClick={() => {
                                    setEditMonaco(false)
                                    payloadFileData && setEditorValue(Uint8ArrayToString(payloadFileData.Data))
                                }}
                            >
                                取消
                            </YakitButton>
                            <YakitButton icon={<SolidStoreIcon />} onClick={onSaveFileFun}>
                                保存
                            </YakitButton>
                            {setExpand && Expand()}
                        </div>

                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-hidden"]]: isEditMonaco
                            })}
                        >
                            {payloadFileData?.IsBigFile === false && (
                                <>
                                    <YakitButton
                                        onClick={() => {
                                            setEditMonaco(true)
                                        }}
                                        icon={<OutlinePencilaltIcon />}
                                        disabled={!isPayloadOperator(userInfo)}
                                    >
                                        编辑
                                    </YakitButton>
                                </>
                            )}

                            {setExpand && Expand()}
                        </div>
                    </>
                )}
            </div>
            <div className={styles["content"]}>
                {showContentType === "editor" && (
                    <div className={styles["editor-box"]}>
                        <YakEditor
                            type='plaintext'
                            readOnly={!isEditMonaco}
                            // noLineNumber={true}
                            value={editorValue}
                            setValue={(content: string) => {
                                setEditorValue(content)
                            }}
                            loading={loading}
                            noWordWrap={true}
                        />
                    </div>
                )}
                {showContentType === "table" && (
                    <div className={styles["table-box"]}>
                        <NewPayloadOnlineTable
                            selectPayloadArr={selectPayloadArr}
                            setSelectPayloadArr={setSelectPayloadArr}
                            onDeletePayload={onDeletePayload}
                            onQueryPayload={onQueryPayload}
                            pagination={pagination}
                            params={params}
                            response={response}
                            setResponse={setResponse}
                            setParams={setParams}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

interface ExportByPayloadGrpcProps {
    group: string
    folder?: string
    setExportVisible: (v: boolean) => void
    exportType?: ExportTypeProps
}
// 导出
export const ExportByPayloadGrpc: React.FC<ExportByPayloadGrpcProps> = (props) => {
    const {group, folder, setExportVisible, exportType} = props
    // 导出token
    const [exportToken, setExportToken] = useState(randomString(20))
    // export-show
    const [exportStreamData, setExportStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    // 导出路径
    const exportPathRef = useRef<string>()
    // 是否显示modal
    const [showModal, setShowModal] = useState<boolean>(false)

    useEffect(() => {
        onExportFileFun()
    }, [])

    const getExportGrpc = useMemo(() => {
        if (!exportType) {
            return ""
        }
        let exportObj = {
            file: "ExportAllPayloadFromFile",
            csv: "ExportAllPayload",
            all: "ExportPayloadBatch"
        }
        return exportObj[exportType]
    }, [exportType])

    const getCancleExportGrpc = useMemo(() => {
        if (!exportType) {
            return ""
        }
        let cancelExportObj = {
            file: "cancel-ExportAllPayloadFromFile",
            csv: "cancel-ExportAllPayload",
            all: "cancel-ExportPayloadBatch"
        }
        return cancelExportObj[exportType]
    }, [exportType])

    // 导出任务
    const onExportFileFun = useMemoizedFn(() => {
        if (exportType === "all") {
            ipcRenderer
                .invoke("ExportMultiplePayloads")
                .then((defaultPath) => {
                    exportPathRef.current = defaultPath
                    ipcRenderer.invoke(
                        getExportGrpc,
                        {
                            Group: group,
                            SavePath: defaultPath
                        },
                        exportToken
                    )
                    setShowModal(true)
                })
                .catch((e: any) => {
                    failed(`批量导出失败：${e}`)
                })
        } else {
            ipcRenderer
                .invoke("openDialog", {
                    title: "请选择文件夹",
                    properties: ["openDirectory"]
                })
                .then((data) => {
                    if (data.filePaths.length) {
                        let absolutePath: string = data.filePaths[0].replace(/\\/g, "\\")

                        ipcRenderer
                            .invoke("pathJoin", {
                                dir: absolutePath,
                                file: `${group}.${exportType === "file" ? "txt" : "csv"}`
                            })
                            .then((currentPath: string) => {
                                exportPathRef.current = currentPath
                                ipcRenderer.invoke(
                                    getExportGrpc,
                                    {
                                        Group: group,
                                        Folder: folder,
                                        SavePath: currentPath
                                    },
                                    exportToken
                                )
                                setShowModal(true)
                            })
                    } else {
                        setExportVisible(false)
                    }
                })
        }
    })
    // 取消导出任务
    const cancelExportFile = useMemoizedFn(() => {
        ipcRenderer.invoke(getCancleExportGrpc, exportToken)
    })

    const onExportStreamData = useThrottleFn(
        (data) => {
            setExportStreamData({...exportStreamData, Progress: data.Progress})
        },
        {wait: 500}
    ).run

    // 监听导出任务
    useEffect(() => {
        ipcRenderer.on(`${exportToken}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    onExportStreamData(data)
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${exportToken}-error`, (e: any, error: any) => {
            failed(`[ExportFile] error:  ${error}`)
        })
        ipcRenderer.on(`${exportToken}-end`, (e: any, data: any) => {
            info("[ExportFile] finished")
            setShowModal(false)
            setExportVisible(false)
            if (exportPathRef.current) {
                exportType === "all" ? openABSFile(exportPathRef.current) : openABSFileLocated(exportPathRef.current)
            }
        })
        return () => {
            ipcRenderer.invoke(getCancleExportGrpc, exportToken)
            ipcRenderer.removeAllListeners(`${exportToken}-data`)
            ipcRenderer.removeAllListeners(`${exportToken}-error`)
            ipcRenderer.removeAllListeners(`${exportToken}-end`)
        }
    }, [])
    return (
        <YakitModal
            centered
            getContainer={document.getElementById("new-payload") || document.body}
            visible={showModal}
            title={null}
            footer={null}
            width={520}
            type='white'
            closable={false}
            hiddenHeader={true}
            bodyStyle={{padding: 0}}
        >
            <UploadStatusInfo
                title={"导出中，请耐心等待..."}
                streamData={exportStreamData}
                cancelRun={() => {
                    cancelExportFile()
                    setExportVisible(false)
                }}
                logInfo={[]}
                showDownloadDetail={false}
            />
        </YakitModal>
    )
}

interface UploadOrDownloadByPayloadGrpcProps {
    group: string
    folder: string
    setUploadOrDownloadVisible: (v: boolean) => void
    type?: "upload" | "download"
    finished?: () => void
}
// 上传与下载(默认上传)
export const UploadOrDownloadByPayloadGrpc: React.FC<UploadOrDownloadByPayloadGrpcProps> = (props) => {
    const {group, folder, setUploadOrDownloadVisible, type = "upload", finished} = props
    const userInfo = useStore((s) => s.userInfo)
    // 导出token
    const [exportToken, setExportToken] = useState(randomString(20))
    // export-show
    const [exportStreamData, setExportStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<string[]>([])
    // 是否显示modal
    const [showModal, setShowModal] = useState<boolean>(false)

    useEffect(() => {
        onUploadFileFun()
    }, [])

    // 上传任务
    const onUploadFileFun = useMemoizedFn(() => {
        ipcRenderer.invoke(
            type === "upload" ? "UploadPayloadToOnline" : "DownloadPayload",
            {
                Token: userInfo.token,
                Group: group,
                Folder: folder
            },
            exportToken
        )
        setShowModal(true)
    })
    // 取消上传任务
    const cancelExportFile = useMemoizedFn(() => {
        ipcRenderer.invoke(type === "upload" ? "cancel-UploadPayloadToOnline" : "cancel-DownloadPayload", exportToken)
    })

    const onExportStreamData = useThrottleFn(
        (data) => {
            setExportStreamData({...exportStreamData, Progress: data.Progress})
        },
        {wait: 500}
    ).run

    // 监听上传任务
    useEffect(() => {
        ipcRenderer.on(`${exportToken}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                    onExportStreamData(data)
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${exportToken}-error`, (e: any, error: any) => {
            failed(`${type === "upload" ? "[UploadFile]" : "[DownloadFile]"} error:  ${error}`)
        })
        ipcRenderer.on(`${exportToken}-end`, (e: any, data: any) => {
            info(`${type === "upload" ? "[UploadFile]" : "[DownloadFile]"} finished`)
            setShowModal(false)
            setUploadOrDownloadVisible(false)
            finished && finished()
            logInfoRef.current = []
        })
        return () => {
            ipcRenderer.invoke(
                type === "upload" ? "cancel-UploadPayloadToOnline" : "cancel-DownloadPayload",
                exportToken
            )
            ipcRenderer.removeAllListeners(`${exportToken}-data`)
            ipcRenderer.removeAllListeners(`${exportToken}-error`)
            ipcRenderer.removeAllListeners(`${exportToken}-end`)
        }
    }, [])
    return (
        <YakitModal
            centered
            getContainer={document.getElementById("new-payload") || document.body}
            visible={showModal}
            title={null}
            footer={null}
            width={520}
            type='white'
            closable={false}
            hiddenHeader={true}
            bodyStyle={{padding: 0}}
        >
            <UploadStatusInfo
                title={`${type === "upload" ? "上传" : "下载"}中，请耐心等待...`}
                streamData={exportStreamData}
                cancelRun={() => {
                    cancelExportFile()
                    setUploadOrDownloadVisible(false)
                }}
                logInfo={logInfoRef.current}
                showDownloadDetail={false}
            />
        </YakitModal>
    )
}

export interface NewPayloadProps {}
export const NewPayload: React.FC<NewPayloadProps> = (props) => {
    // 是否全部展开
    const [isExpand, setExpand] = useState<boolean>(false)
    const [showContentType, setContentType] = useState<"editor" | "table">()

    // table/editor 筛选条件
    const [selectItem, setSelectItem] = useState<string>()
    const [group, setGroup] = useState<string>("")
    const [folder, setFolder] = useState<string>("")

    const [codePath, setCodePath] = useState<string>("")

    const [listLoading, setListLoading] = useState<boolean>(false)
    const [data, setData] = useState<DataItem[]>([])
    const [isOnlyShowLocal, setOnlyShowLocal] = useState<boolean>(true)

    // 关闭Payload
    const [isClosePayload, setClosePayload] = useState<boolean>(false)
    // 第一次进入
    const [isFirstEnter, setFirstEnter] = useState<boolean>(false)
    const NewPayloadFirstEnter = "NewPayloadFirstEnter"
    // 转为数据库存储token
    const [token, setToken] = useState(randomString(20))
    // 第一次导入进度
    const [visible, setVisible] = useState<boolean>(false)
    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<string[]>([])

    // 用于比较顺序是否改变
    const cacheNodesRef = useRef<PayloadGroupNodeProps[]>([])

    // 当前展示的是本地还是线上
    const [showType, setShowType] = useState<"local" | "online">("local")

    const userInfo = useStore((s) => s.userInfo)

    useUpdateEffect(() => {
        if (showType !== "local") {
            setSelectItem(undefined)
        }
    }, [showType])

    const onQueryGroup = (obj?: {Group: string; Folder: string}) => {
        setListLoading(true)
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
                cacheNodesRef.current = res.Nodes
                let newData: DataItem[] = nodesToDataFun(res.Nodes)
                setData(newData)
                if (obj) {
                    // 选中
                    const {Group, Folder} = obj
                    // 根据Id判断其是否为文件
                    const item = findItemByGroup(newData, Group)
                    if (item) {
                        setGroup(Group)
                        setFolder(Folder)
                        setContentType(item.type === "DataBase" ? "table" : "editor")
                        setSelectItem(item.id)
                    }
                }
                if (newData.length === 0) {
                    setExpand(true)
                }
            })
            .catch((e: any) => {
                failed(`获取字典列表失败：${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setListLoading(false)
                }, 100)
            })
    }

    useEffect(() => {
        ipcRenderer.invoke("fetch-code-path").then((path: string) => {
            ipcRenderer
                .invoke("is-exists-file", path)
                .then(() => {
                    setCodePath("")
                })
                .catch(() => {
                    setCodePath(path)
                })
        })
    }, [])

    useEffect(() => {
        ipcRenderer
            .invoke("YakVersionAtLeast", {
                AtLeastVersion: "v1.2.9-sp3",
                YakVersion: ""
            })
            .then((res: {Ok: boolean}) => {
                if (res.Ok) {
                    // 页面初次进入时
                    getRemoteValue(NewPayloadFirstEnter).then((res) => {
                        if (!res) {
                            setFirstEnter(true)
                        }
                    })
                } else {
                    setClosePayload(true)
                }
            })
            .catch((e) => {
                setClosePayload(true)
            })
    }, [])

    const reset = useMemoizedFn(() => {
        showType === "local" && setContentType(undefined)
        setSelectItem(undefined)
        setGroup("")
        setFolder("")
    })

    // 迁移数据
    const initNewPayload = useMemoizedFn(() => {
        ipcRenderer.invoke("MigratePayloads", {}, token)
        setFirstEnter(false)
        setVisible(true)
    })

    // 取消迁移数据
    const cancelMigratePayloads = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-MigratePayloads", token)
    })

    // 监听迁移数据
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    setStreamData(data)
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[MigratePayloads] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info("[MigratePayloads] finished")
            logInfoRef.current = []
            setRemoteValue(NewPayloadFirstEnter, JSON.stringify({import: true}))
            onQueryGroup()
        })
        return () => {
            ipcRenderer.invoke("cancel-MigratePayloads", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%",
            firstMinSize: 250,
            secondMinSize: 250
        }
        if (isOnlyShowLocal || !isEnpriTrace()) {
            p.firstRatio = "100%"
            p.secondRatio = "0%"
        }
        return p
    }, [isOnlyShowLocal])

    useEffect(() => {
        if (userInfo.isLogin) {
            setOnlyShowLocal(false)
        } else {
            setOnlyShowLocal(true)
        }
    }, [userInfo.isLogin])

    return (
        <div className={styles["new-payload"]} id='new-payload'>
            <div className={styles["payload-list-box"]} style={isExpand ? {width: 0, opacity: 0} : {}}>
                <YakitResizeBox
                    isVer={true}
                    firstNodeStyle={{padding: 0}}
                    lineStyle={{display: isOnlyShowLocal || !isEnpriTrace() ? "none" : ""}}
                    secondNodeStyle={{padding: 0, display: isOnlyShowLocal || !isEnpriTrace() ? "none" : ""}}
                    firstNode={
                        <NewPayloadLocalList
                            listLoading={listLoading}
                            data={data}
                            setData={setData}
                            cacheNodesRef={cacheNodesRef}
                            onQueryGroup={onQueryGroup}
                            setGroup={setGroup}
                            setFolder={setFolder}
                            setContentType={setContentType}
                            codePath={codePath}
                            selectItem={selectItem}
                            setSelectItem={setSelectItem}
                            setShowType={setShowType}
                            showType={showType}
                        />
                    }
                    secondNode={
                        <NewPayloadOnlineList
                            setGroup={setGroup}
                            setFolder={setFolder}
                            setContentType={setContentType}
                            showType={showType}
                            setShowType={setShowType}
                        />
                    }
                    {...ResizeBoxProps}
                />
            </div>
            {data.length === 0 ? (
                <div className={styles["no-data"]}>
                    <YakitEmpty
                        title='暂无 Payload 字典'
                        // description='可一键获取官方内置字典，或新建字典'
                        children={
                            <YakitButton
                                icon={<OutlineAddPayloadIcon />}
                                onClick={() => {
                                    const m = showYakitModal({
                                        getContainer: document.getElementById("new-payload") || document.body,
                                        title: null,
                                        footer: null,
                                        width: 566,
                                        type: "white",
                                        closable: false,
                                        maskClosable: false,
                                        hiddenHeader: true,
                                        content: (
                                            <CreateDictionaries
                                                title='新建字典'
                                                type='dictionaries'
                                                onQueryGroup={onQueryGroup}
                                                onClose={() => {
                                                    setExpand(true)
                                                    m.destroy()
                                                }}
                                            />
                                        )
                                    })
                                }}
                            >
                                新建字典
                            </YakitButton>
                        }
                    />
                </div>
            ) : (
                <>
                    {showContentType ? (
                        <>
                            {showType === "local" ? (
                                <PayloadLocalContent
                                    isExpand={isExpand}
                                    setExpand={setExpand}
                                    showContentType={showContentType}
                                    group={group}
                                    folder={folder}
                                />
                            ) : (
                                <PayloadOnlineContent
                                    isExpand={isExpand}
                                    setExpand={setExpand}
                                    showContentType={showContentType}
                                    group={group}
                                    folder={folder}
                                />
                            )}
                        </>
                    ) : (
                        <div className={styles["no-data"]}>
                            <YakitEmpty title='请点击左侧列表，选择想要查看的字典' />
                        </div>
                    )}
                </>
            )}
            <YakitHint
                visible={isFirstEnter}
                title='迁移数据'
                content='由于Payload功能进行重构，为不影响使用，需要点击确定将旧数据进行迁移，迁移数据不会造成任何数据丢失。'
                footer={
                    <div style={{marginTop: 24, textAlign: "right"}}>
                        <YakitButton size='max' onClick={initNewPayload}>
                            确定
                        </YakitButton>
                    </div>
                }
            />
            <YakitHint
                visible={isClosePayload}
                title='引擎版本过低'
                content='当前引擎版本过低无法使用新版Payload，请将引擎更新到 v1.2.9-sp3及以上版本'
                footer={
                    <div style={{marginTop: 24, textAlign: "right"}}>
                        <YakitButton
                            size='max'
                            onClick={() => {
                                setClosePayload(false)
                                emiter.emit("closePage", JSON.stringify({route: YakitRoute.PayloadManager}))
                            }}
                        >
                            确定
                        </YakitButton>
                    </div>
                }
            />
            <YakitModal
                centered
                getContainer={document.getElementById("new-payload") || document.body}
                visible={visible}
                title={null}
                footer={null}
                width={520}
                type='white'
                closable={false}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <UploadStatusInfo
                    title={"迁移数据中，请耐心等待..."}
                    streamData={streamData}
                    cancelRun={() => {
                        cancelMigratePayloads()
                        setVisible(false)
                    }}
                    onClose={() => {
                        setVisible(false)
                    }}
                    logInfo={logInfoRef.current}
                    showDownloadDetail={false}
                    autoClose={true}
                />
            </YakitModal>
        </div>
    )
}

export interface ReadOnlyNewPayloadProps {
    onClose: () => void
    selectorHandle: (v: string) => void
    Nodes: PayloadGroupNodeProps[]
}
export const ReadOnlyNewPayload: React.FC<ReadOnlyNewPayloadProps> = (props) => {
    const {selectorHandle, onClose, Nodes} = props
    const [showContentType, setContentType] = useState<"editor" | "table">()

    // table/editor 筛选条件
    const [selectItem, setSelectItem] = useState<string>()
    const [checkedItem, setCheckedItem] = useState<string[]>([])
    const [floderChecked, setFloderChecked] = useState<string[]>([])
    const [group, setGroup] = useState<string>("")
    const [folder, setFolder] = useState<string>("")

    const [codePath, setCodePath] = useState<string>("")

    const [data, setData] = useState<DataItem[]>([])
    // 用于比较顺序是否改变
    const cacheNodesRef = useRef<PayloadGroupNodeProps[]>([])

    // 注：此处只会在页面进入时拿去一次 因此不用考虑反复获取最新的情况
    const onQueryGroup = () => {
        cacheNodesRef.current = Nodes
        let newData: DataItem[] = nodesToDataFun(Nodes)
        setData(newData)
    }

    useEffect(() => {
        ipcRenderer.invoke("fetch-code-path").then((path: string) => {
            ipcRenderer
                .invoke("is-exists-file", path)
                .then(() => {
                    setCodePath("")
                })
                .catch(() => {
                    setCodePath(path)
                })
        })
    }, [])

    const selectInfo = useMemo(() => {
        return group.length > 0 ? group : folder
    }, [group, folder])

    return (
        <div
            style={{height: 720, borderRadius: 4, overflow: "hidden"}}
            className={classNames(styles["new-payload-only-insert"], styles["new-payload"])}
        >
            <div className={styles["payload-list-box"]}>
                <NewPayloadLocalList
                    listLoading={false}
                    data={data}
                    setData={setData}
                    cacheNodesRef={cacheNodesRef}
                    onQueryGroup={onQueryGroup}
                    setGroup={setGroup}
                    setFolder={setFolder}
                    setContentType={setContentType}
                    codePath={codePath}
                    onlyInsert={true}
                    onClose={onClose}
                    selectItem={selectItem}
                    setSelectItem={setSelectItem}
                    checkedItem={checkedItem}
                    onCheckedItem={setCheckedItem}
                    floderChecked={floderChecked}
                    onSetFloderChecked={setFloderChecked}
                />
                <div className={styles["payload-list-bottom"]}>
                    <div className={styles["show"]}>
                        <div className={styles["text"]}>已选中：</div>
                        {checkedItem.length + floderChecked.length > 0 ? (
                            <YakitTag color='info'>{checkedItem.length + floderChecked.length}个</YakitTag>
                        ) : (
                            <></>
                        )}
                    </div>
                    <div className={styles["option"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                onClose()
                            }}
                        >
                            取消
                        </YakitButton>
                        <YakitButton
                            disabled={checkedItem.length + floderChecked.length === 0}
                            onClick={() => {
                                let str = ""
                                if (checkedItem.length > 0) {
                                    str = `{{payload(${checkedItem.join(",")})}}`
                                }
                                if (floderChecked.length > 0) {
                                    str += `{{payload(${floderChecked.map((i) => i + "/*").join(",")})}}`
                                }
                                selectorHandle(str)
                            }}
                        >
                            插入
                        </YakitButton>
                    </div>
                </div>
            </div>

            {showContentType && group.length !== 0 ? (
                <PayloadLocalContent
                    showContentType={showContentType}
                    group={group}
                    folder={folder}
                    onlyInsert={true}
                    onClose={onClose}
                />
            ) : (
                <div className={styles["no-data"]}>
                    <div
                        className={styles["close-btn"]}
                        onClick={() => {
                            onClose()
                        }}
                    >
                        <OutlineXIcon />
                    </div>
                    {folder.length !== 0 ? (
                        <div className={styles["select-folder"]}>
                            <div className={styles["icon"]}>
                                <PropertyNoAddIcon />
                            </div>
                            <div className={styles["title"]}>{selectInfo}</div>
                            <div className={styles["sub-title"]}>支持插入文件进行Fuzz</div>
                        </div>
                    ) : (
                        <YakitEmpty title='请选择要插入的字典或文件夹' />
                    )}
                </div>
            )}
        </div>
    )
}
