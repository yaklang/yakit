import React, {useEffect, useMemo, useRef, useState} from "react"
import {Divider, Form, Input, Progress, Tooltip} from "antd"
import {useGetState, useMemoizedFn, useSize, useThrottleFn, useUpdateEffect} from "ahooks"
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
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {OutlineAddPayloadIcon, PropertyIcon, PropertyNoAddIcon} from "./icon"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {
    SolidChevrondownIcon,
    SolidChevronrightIcon,
    SolidDatabaseIcon,
    SolidDocumentdownloadIcon,
    SolidDocumenttextIcon,
    SolidDotsverticalIcon,
    SolidDragsortIcon,
    SolidFolderopenIcon,
    SolidPencilaltIcon,
    SolidSparklesIcon,
    SolidStoreIcon,
    SolidXcircleIcon
} from "@/assets/icon/solid"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import Dragger from "antd/lib/upload/Dragger"
import {DragDropContextResultProps} from "../layout/mainOperatorContent/MainOperatorContentType"
import {v4 as uuidv4} from "uuid"
import {DeletePayloadProps, NewPayloadTable, Payload, QueryPayloadParams} from "./newPayloadTable"
import {callCopyToClipboard} from "@/utils/basic"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {ExecResult, PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {randomString} from "@/utils/randomUtil"
import _isEqual from "lodash/isEqual"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import emiter from "@/utils/eventBus/eventBus"
import {Uint8ArrayToString} from "@/utils/str"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakEditor} from "@/utils/editors"
import {openABSFileLocated} from "@/utils/openWebsite"
import {YakitRoute} from "@/routes/newRoute"
const {ipcRenderer} = window.require("electron")

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
                    <div className={styles["download-progress"]}>
                        <Progress
                            strokeColor='#F28B44'
                            trailColor='#F0F2F5'
                            percent={Math.floor((streamData.Progress || 0) * 100)}
                            showInfo={false}
                        />
                        <div className={styles["progress-title"]}>进度 {streamData.Progress * 100}%</div>
                    </div>
                    {showDownloadDetail && (
                        <div className={styles["download-info-wrapper"]}>
                            <div>剩余时间 : {streamData.Progress === 1 ? "0s" : streamData.RestDurationVerbose}</div>
                            <div className={styles["divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <div>耗时 : {streamData.CostDurationVerbose}</div>
                            <div className={styles["divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <div>下载速度 : {streamData.Speed}M/s</div>
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
                        <YakitButton loading={false} size='max' type='outline2' onClick={cancelRun}>
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
    onQueryGroup: () => void
    folder?: string
    group?: string
}

interface SavePayloadProgress {
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
    const [uploadList, setUploadList] = useState<string[]>([])

    // token
    const [token, setToken] = useState(randomString(20))
    const [fileToken, setFileToken] = useState(randomString(20))
    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>()
    const logInfoRef = useRef<string[]>([])

    // 存储类型
    const [storeType, setStoreType] = useState<"database" | "file">()

    const isDisabled = useMemo(() => {
        if (isDictionaries) {
            return uploadList.length === 0 || dictionariesName.length === 0
        }
        return uploadList.length === 0
    }, [uploadList, dictionariesName, isDictionaries])

    // 数据库存储
    const onSavePayload = useMemoizedFn(() => {
        setStoreType("database")
        ipcRenderer.invoke(
            "SavePayloadStream",
            {
                IsFile: true,
                Content: "",
                FileName: uploadList,
                Group: group || dictionariesName,
                Folder: folder || ""
            },
            token
        )
    })

    // 文件存储
    const onSavePayloadToFile = useMemoizedFn(() => {
        setStoreType("database")
        console.log("SavePayloadToFileStream", {
            IsFile: true,
            Content: "",
            FileName: uploadList,
            Group: group || dictionariesName,
            Folder: folder || ""
        })

        // 两次stream
        ipcRenderer.invoke(
            "SavePayloadToFileStream",
            {
                IsFile: true,
                Content: "",
                FileName: uploadList,
                Group: group || dictionariesName,
                Folder: folder || ""
            },
            fileToken
        )
    })

    // 取消数据库任务
    const cancelSavePayload = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SavePayload", token)
    })

    // 取消文件存储任务
    const cancelSavePayloadFile = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SavePayloadFile", fileToken)
    })

    // 监听数据库任务
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    console.log("data---", data)
                    setStreamData(data)
                    logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[SavePayload] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
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
    }, [])

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
            failed(`[SavePayloadFile] error:  ${error}`)
        })
        ipcRenderer.on(`${fileToken}-end`, (e: any, data: any) => {
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
    }, [])

    const cancelRun = useMemoizedFn(() => {
        onQueryGroup()
        onClose()
        // 扩充时通知table刷新
        if (group || folder) {
            emiter.emit("refreshTableEvent")
        }
    })
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
                        <div className={styles["upload-dragger-box"]}>
                            <Dragger
                                className={styles["upload-dragger"]}
                                accept={FileType.join(",")}
                                // accept=".jpg, .jpeg, .png"
                                multiple={false}
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={(f: any) => {
                                    if (!FileType.includes(f.type)) {
                                        failed(`${f.name}非txt、csv文件，请上传正确格式文件！`)
                                        return false
                                    }
                                    if (uploadList.includes(f.path)) {
                                        warn("此文件已选择")
                                        return
                                    }
                                    setUploadList([...uploadList, f.path])
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
                                        <div className={styles["sub-title"]}>支持文件夹批量上传</div>
                                    </div>
                                </div>
                            </Dragger>
                        </div>
                        <div className={styles["upload-list"]}>
                            {uploadList.map((item, index) => (
                                <div className={styles["upload-list-item"]} key={index}>
                                    <div className={styles["link-icon"]}>
                                        <OutlinePaperclipIcon />
                                    </div>
                                    <div className={styles["text"]}>{item}</div>
                                    <div
                                        className={styles["close-icon"]}
                                        onClick={() => {
                                            const newUploadList = uploadList.filter((itemIn) => itemIn !== item)
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
                                <YakitButton
                                    disabled={isDisabled}
                                    type='outline1'
                                    icon={<SolidDatabaseIcon />}
                                    onClick={onSavePayload}
                                >
                                    数据库存储
                                </YakitButton>
                                <YakitButton
                                    disabled={isDisabled}
                                    icon={<SolidDocumenttextIcon />}
                                    onClick={onSavePayloadToFile}
                                >
                                    文件存储
                                </YakitButton>
                            </>
                        ) : (
                            <>
                                <YakitButton disabled={isDisabled} type='outline1'>
                                    取消
                                </YakitButton>
                                <YakitButton disabled={isDisabled} onClick={onSavePayload}>
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

export interface NewPayloadListProps {
    setGroup: (v: string) => void
    setFolder: (v: string) => void
    setContentType: (v?: "editor" | "table") => void
    codePath?: string
    // 屏蔽掉所有拖拽及所有操作 仅留点击插入
    onlyInsert?: boolean
    // 以下为插入弹框所需要
    onClose?: () => void
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
const findFoldersById = (items: DataItem[], targetId: string) => {
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
const isIncludeSpecial = (v: string) => /[/*,]/.test(v)

// 导出CSV
const onExportCsvFun = (obj: {Group: string; Folder: string}, codePath: string, name: string) => {
    ipcRenderer
        .invoke("GetAllPayload", obj)
        .then((res: {Data: Payload[]}) => {
            const data = res?.Data.map((ele) => ele.Content + "," + ele.HitCount).join("\r\n")
            const time = new Date().valueOf()
            const path = `${codePath}${codePath ? "/" : ""}${name}-${time}.csv`
            ipcRenderer.invoke("show-save-dialog", path).then((res) => {
                if (res.canceled) return
                const name = res.name
                ipcRenderer
                    .invoke("write-file", {
                        route: res.filePath,
                        data: "Content,HitCount\r\n" + data
                    })
                    .then(() => {
                        success(`【${name}】下载成功`)
                    })
                    .catch((e) => {
                        failed(`【${name}】下载失败:` + e)
                    })
            })
        })
        .catch((e: any) => {
            failed(`导出失败：${e}`)
        })
}

interface DataItem {
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

interface PayloadGroupNodeProps {
    Type: "File" | "Folder" | "DataBase"
    Name: string
    Nodes: PayloadGroupNodeProps[]
    Number: number
}

const droppable = "droppable"
const droppableGroup = "droppableGroup"

export const NewPayloadList: React.FC<NewPayloadListProps> = (props) => {
    const {setGroup, setFolder, setContentType, codePath, onlyInsert, onClose} = props
    const [data, setData] = useState<DataItem[]>([])
    const [selectItem, setSelectItem] = useState<string>()

    const [dropType, setDropType] = useState<string>(droppable)
    const [subDropType, setSubDropType] = useState<string>(droppableGroup)
    const [combineIds, setCombineIds] = useState<string[]>([])
    const [isCombineEnabled, setIsCombineEnabled] = useState<boolean>(true)

    const [moveLevel, setMoveLevel] = useState<MoveLevelProps>()
    const moveLevelRef = useRef<MoveLevelProps>()

    // 用于记录不展开的文件夹(默认展开)
    const [notExpandArr, setNotExpandArr] = useState<string[]>([])

    // 用于比较顺序是否改变
    const cacheNodesRef = useRef<PayloadGroupNodeProps[]>([])

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
                } else {
                    setFolder("")
                    setGroup(selectData.name)
                    setContentType(selectData.type === "DataBase" ? "table" : "editor")
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

    // 将后端结构数据捏成渲染数组
    const nodesToDataFun = useMemoizedFn((nodes: PayloadGroupNodeProps[]) => {
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
            console.log("UpdateAllPayloadGroup", newNodes)
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

    const onQueryGroup = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
                console.log("Groups", res.Nodes)
                cacheNodesRef.current = res.Nodes
                let newData: DataItem[] = nodesToDataFun(res.Nodes)
                setData(newData)
            })
            .catch((e: any) => {
                failed(`获取字典列表失败：${e}`)
            })
            .finally()
    }

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
    const mergingGroup = useMemoizedFn((result: DragDropContextResultProps) => {
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
    const mergeWithinAndOutsideGroup = useMemoizedFn((result: DragDropContextResultProps) => {
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
    const onDragEnd = useMemoizedFn((result) => {
        try {
            console.log("result", result)
            const {source, destination, draggableId, type, combine} = result
            /** 合并组   ---------start--------- */
            if (result.combine) {
                // 组外两个游离的文件合成组 或者 组外的文件拖拽到组外的文件夹合成组
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
            if (!destination && !source) {
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
        (result) => {
            console.log("result---xxx", result)
            const {index, droppableId} = result.source
            const {combine, destination, draggableId} = result
            // if (droppableId === "droppable-payload") {
            //     // 拖动的来源item是组时，不用合并
            // }

            const moveNode = findItemById(data, draggableId)
            if (combine) {
                // 检测到合并的情况
                console.log("检测到合并的情况")
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

    const onBeforeCapture = useMemoizedFn((result: DragDropContextResultProps) => {
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

    const onDragStart = useMemoizedFn((result: DragDropContextResultProps) => {
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

    return (
        <div className={styles["new-payload-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>{onlyInsert ? "选择想要插入的字典" : "Payload 字典管理"}</div>
                    <div className={styles["count"]}>{getPayloadCount}</div>
                </div>
                <div className={styles["extra"]}>
                    {onlyInsert ? (
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
                    ) : (
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
                                                title: null,
                                                footer: null,
                                                width: 520,
                                                type: "white",
                                                closable: false,
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
                    )}
                </div>
            </div>
            <div className={styles["content"]}>
                <div className={styles["drag-list"]}>
                    {onlyInsert ? (
                        <>
                            {data.map((item, index) => {
                                const fileOutside =
                                    moveLevel?.draggableId === item.id ? moveLevel.level === "outside" : true
                                const isCombine = combineIds[0] === item.id
                                {
                                    /* 渲染你的文件夹或文件组件 */
                                }
                                {
                                    /* 使用 item.type 来区分文件夹和文件 */
                                }
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
                                        notExpandArr={notExpandArr}
                                        setNotExpandArr={setNotExpandArr}
                                        onQueryGroup={onQueryGroup}
                                        setContentType={setContentType}
                                        onlyInsert={onlyInsert}
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
                                    />
                                )
                            })}
                        </>
                    ) : (
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
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
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
                                                                    notExpandArr={notExpandArr}
                                                                    setNotExpandArr={setNotExpandArr}
                                                                    onQueryGroup={onQueryGroup}
                                                                    setContentType={setContentType}
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
                    )}
                </div>
            </div>
        </div>
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
                [styles["file-menu"]]: menuOpen && file.id !== selectItem,
                [styles["file-outside"]]: !isInside,
                [styles["file-inside"]]: isInside
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
                <div className={styles["file-count"]}>10</div>
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
    notExpandArr: string[]
    setNotExpandArr: (v: string[]) => void
    onQueryGroup: () => void
    setContentType: (v?: "editor" | "table") => void
    onlyInsert?: boolean
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
        notExpandArr,
        setNotExpandArr,
        onQueryGroup,
        setContentType,
        onlyInsert
    } = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(folder.isCreate === true)
    const [inputName, setInputName] = useState<string>(folder.name)

    const getAllFolderName = useMemoizedFn(() => {
        return data.filter((item) => item.type === "Folder").map((item) => item.name)
    })

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
        if (sourceFolders && sourceFolders?.node) {
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
            })
            .catch((e: any) => {
                failed(`删除失败：${e}`)
            })
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
                <div
                    className={classNames(styles["folder"], {
                        [styles["folder-active"]]: folder.id === selectItem,
                        [styles["folder-no-active"]]: folder.id !== selectItem,
                        [styles["folder-menu"]]: menuOpen,
                        [styles["folder-combine"]]: isCombine,
                        [styles["folder-no-combine"]]: !isCombine,
                        [styles["folder-border"]]: !isCombine && !menuOpen
                    })}
                    onClick={() => {
                        if (onlyInsert) {
                            setSelectItem(folder.id)
                        }
                        if (notExpandArr.includes(folder.id)) {
                            setNotExpandArr(notExpandArr.filter((item) => item !== folder.id))
                        } else {
                            setNotExpandArr([...notExpandArr, folder.id])
                        }
                    }}
                >
                    <div className={styles["folder-header"]}>
                        <div className={styles["is-fold-icon"]}>
                            {!notExpandArr.includes(folder.id) ? <SolidChevrondownIcon /> : <SolidChevronrightIcon />}
                        </div>
                        <div className={styles["folder-icon"]}>
                            <SolidFolderopenIcon />
                        </div>
                        <div className={styles["folder-name"]}>{inputName}</div>
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
                                                    <OutlineImportIcon />
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
                                            key: "delete",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlineTrashIcon />
                                                    <div className={styles["menu-name"]}>删除</div>
                                                </div>
                                            )
                                        }
                                    ],
                                    onClick: ({key}) => {
                                        setMenuOpen(false)
                                        switch (key) {
                                            case "copyFuzztag":
                                                callCopyToClipboard(`{{payload(${inputName}/*)}}`)
                                                break
                                            case "addChildPayload":
                                                // 注: 此处需注意文件夹
                                                const m = showYakitModal({
                                                    title: null,
                                                    footer: null,
                                                    width: 520,
                                                    type: "white",
                                                    closable: false,
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
                                            case "delete":
                                                onDeleteFolder()
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
            )}

            {onlyInsert ? (
                <>
                    {!notExpandArr.includes(folder.id) &&
                        Array.isArray(folder.node) &&
                        folder.node.map((file, index) => (
                            <FileComponent
                                key={file.id}
                                file={file}
                                selectItem={selectItem}
                                setSelectItem={setSelectItem}
                                data={data}
                                setData={setData}
                                isInside={true}
                                codePath={codePath}
                                onQueryGroup={onQueryGroup}
                                setContentType={setContentType}
                                onlyInsert={onlyInsert}
                            />
                        ))}
                </>
            ) : (
                <>
                    {!notExpandArr.includes(folder.id) && (
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
                                                            selectItem={selectItem}
                                                            setSelectItem={setSelectItem}
                                                            data={data}
                                                            setData={setData}
                                                            isInside={true}
                                                            codePath={codePath}
                                                            onQueryGroup={onQueryGroup}
                                                            setContentType={setContentType}
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
        </>
    )
}

interface FileComponentProps {
    file: DataItem
    selectItem?: string
    setSelectItem: (id: string) => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    onQueryGroup: () => void
    // 是否为内层
    isInside?: boolean
    // 是否合并
    isCombine?: boolean
    // 导出所需数据
    codePath?: string
    // 展示控制
    setContentType: (v?: "editor" | "table") => void
    onlyInsert?: boolean
}

export const FileComponent: React.FC<FileComponentProps> = (props) => {
    const {
        file,
        selectItem,
        setSelectItem,
        isInside = true,
        isCombine,
        data,
        setData,
        onQueryGroup,
        codePath = "",
        setContentType,
        onlyInsert
    } = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(file.isCreate === true)
    const [inputName, setInputName] = useState<string>(file.name)
    // 转为数据库存储token
    const [token, setToken] = useState(randomString(20))
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
                if (results) setContentType(undefined)
            } else {
                const newData = copyData.filter((item) => item.id !== id)
                setData(newData)
                console.log("selectItem-id", selectItem, id)

                if (selectItem === id) setContentType(undefined)
            }
        }
    })

    // 删除Payload
    const onDeletePayload = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeletePayloadByGroup", {
                Name: file.name
            })
            .then(() => {
                success("删除成功")
                onDeletePayloadById(file.id)
            })
            .catch((e: any) => {
                failed(`删除失败：${e}`)
            })
    })

    // 导出Csv
    const onExportCsv = useMemoizedFn(() => {
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const selectData = findFoldersById(copyData, file.id)
        if (selectData) {
            let obj: {Group: string; Folder: string} = {
                Folder: "",
                Group: file.name
            }
            if (selectData.type === "Folder") {
                obj.Folder = selectData.name
            }
            onExportCsvFun(obj, codePath, file.name)
        }
    })

    // 转为数据库存储
    const onGroupToDatabase = useMemoizedFn(() => {
        ipcRenderer.invoke(
            "CoverPayloadGroupToDatabase",
            {
                Name: inputName
            },
            token
        )
        setVisible(true)
    })

    // 取消转为数据库存储
    const cancelRemoveDuplicate = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-CoverPayloadGroupToDatabase", token)
    })

    // 监听转为数据库存储
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            console.log("监听去重任务", data)
            if (data) {
                try {
                    setStreamData(data)
                    logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[ToDatabase] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            logInfoRef.current = []
            onQueryGroup()
            info("[ToDatabase] finished")
        })
        return () => {
            ipcRenderer.invoke("cancel-CoverPayloadGroupToDatabase", token)
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
                      key: "delete",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineTrashIcon />
                              <div className={styles["menu-name"]}>删除</div>
                          </div>
                      )
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
                              <OutlineImportIcon />
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
                      key: "delete",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineTrashIcon />
                              <div className={styles["menu-name"]}>删除</div>
                          </div>
                      )
                  }
              ]
    }, [])
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
                <div
                    className={classNames(styles["file"], {
                        [styles["file-active"]]: file.id === selectItem,
                        [styles["file-no-active"]]: file.id !== selectItem,
                        [styles["file-menu"]]: menuOpen && file.id !== selectItem,
                        [styles["file-combine"]]: isCombine,
                        [styles["file-outside"]]: !isInside,
                        [styles["file-inside"]]: isInside
                    })}
                    onClick={() => {
                        setSelectItem(file.id)
                    }}
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
                            {file.number}
                        </div>
                        {!onlyInsert && (
                            <YakitDropdownMenu
                                menu={{
                                    data: fileMenuData,
                                    onClick: ({key}) => {
                                        setMenuOpen(false)
                                        switch (key) {
                                            case "copyFuzztag":
                                                callCopyToClipboard(`{{payload(${inputName})}}`)
                                                break
                                            case "importPayload":
                                                const m = showYakitModal({
                                                    title: null,
                                                    footer: null,
                                                    width: 520,
                                                    type: "white",
                                                    closable: false,
                                                    content: (
                                                        <CreateDictionaries
                                                            title='扩充到护网专用工具'
                                                            type='payload'
                                                            onQueryGroup={onQueryGroup}
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
                                                break
                                            case "rename":
                                                setEditInput(true)
                                                break
                                            case "toDatabase":
                                                onGroupToDatabase()
                                                break
                                            case "delete":
                                                onDeletePayload()
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
            )}
            <YakitModal visible={visible} title={null} footer={null} width={520} type='white' closable={false}>
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
        <div style={{padding: 20}}>
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

interface PayloadContentProps {
    isExpand?: boolean
    setExpand?: (v: boolean) => void
    showContentType: "editor" | "table"
    group: string
    folder: string
    // 用于导出的参数
    codePath?: string
    onlyInsert?: boolean
}

interface PayloadFileDataProps {
    Data: Uint8Array
    IsBigFile: boolean
}

interface GetAllPayloadFromFileResponse {
    Progress: number
    Data: Uint8Array
}

export const PayloadContent: React.FC<PayloadContentProps> = (props) => {
    const {isExpand, setExpand, showContentType, group, folder, codePath = "",onlyInsert} = props
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
    // 导出token
    const [exportToken, setExportToken] = useState(randomString(20))
    const [exportVisible, setExportVisible] = useState<boolean>(false)
    // 去重token
    const [token, setToken] = useState(randomString(20))
    const [visible, setVisible] = useState<boolean>(false)

    const copyMoveValueRef = useRef<MoveOrCopyParamsProps>()

    const headerRef = useRef<HTMLDivElement>(null)
    const size = useSize(headerRef)

    // 导出路径
    const exportPathRef = useRef<string>()
    // 导出时间戳
    const exportTimeRef = useRef<number>()

    useEffect(() => {
        emiter.on("refreshTableEvent", onRefreshTableEvent)
        return () => {
            emiter.off("refreshTableEvent", onRefreshTableEvent)
        }
    }, [])

    const onRefreshTableEvent = useMemoizedFn(() => {
        onQueryPayload()
    })

    useEffect(() => {
        reset()
        // 获取table数据
        if (showContentType === "table") {
            onQueryPayload()
        }
        // 获取editor数据
        else {
            onQueryEditor(group, folder)
        }
    }, [group, folder])

    const reset = useMemoizedFn(() => {
        setEditorValue("")
        setPayloadFileData(undefined)
        setResponse(undefined)
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
        console.log("7777", {
            Group,
            Folder
        })

        ipcRenderer
            .invoke("QueryPayloadFromFile", {
                Group,
                Folder
            })
            .then((data: PayloadFileDataProps) => {
                setPayloadFileData(data)
                setEditorValue(Uint8ArrayToString(data.Data))
                setLoading(false)
                console.log("获取Editor数据", data)
            })
            .catch((e: any) => {
                failed("编辑器数据获取失败")
            })
    })

    const onQueryPayload = useMemoizedFn((page?: number, limit?: number) => {
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
        console.log("参数---", obj)
        ipcRenderer
            .invoke("QueryPayload", obj)
            .then((data) => {
                console.log("获取table数据", data)

                setResponse(data)
            })
            .catch((e: any) => {
                failed(`QueryPayload failed：${e}`)
            })
    })

    const onDeletePayload = useMemoizedFn((deletePayload: DeletePayloadProps) => {
        ipcRenderer
            .invoke("DeletePayload", deletePayload)
            .then(() => {
                onQueryPayload(pagination?.Page, pagination?.Limit)
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
                        // 通知刷新列表
                        emiter.emit("refreshListEvent")
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
                if (result) m.destroy()
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
                if (result) y.destroy()
            }
        })
    })

    const onSaveFileFun = useMemoizedFn(() => {
        ipcRenderer
            .invoke("UpdatePayloadToFile", {
                GroupName: group,
                Content: editorValue
            })
            .then((data) => {
                onQueryEditor(group, folder)
                setResponse(data)
                setEditMonaco(false)
                success("保存成功")
            })
            .catch((e: any) => {
                failed(`UpdatePayloadToFile failed:${e}`)
            })
    })

    // 导出任务
    const onExportFileFun = useMemoizedFn(() => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件夹",
                properties: ["openDirectory"]
            })
            .then((data: any) => {
                if (data.filePaths.length) {
                    let absolutePath = data.filePaths[0].replace(/\\/g, "\\")
                    exportPathRef.current = absolutePath
                    exportTimeRef.current = Math.floor(new Date().getTime() / 1000)
                    ipcRenderer.invoke(
                        "GetAllPayloadFromFile",
                        {
                            Group: group,
                            Folder: folder
                        },
                        exportToken
                    )
                    setExportVisible(true)
                }
            })
    })
    // 取消导出任务
    const cancelExportFile = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-GetAllPayloadFromFile", exportToken)
    })

    // export-show
    const [exportStreamData, setExportStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })

    // 监听导出任务
    useEffect(() => {
        ipcRenderer.on(`${exportToken}-data`, async (e: any, data: GetAllPayloadFromFileResponse) => {
            if (data) {
                try {
                    setExportStreamData({...exportStreamData, Progress: data.Progress})
                    console.log("导出任务", data, Uint8ArrayToString(data.Data))
                    ipcRenderer.invoke("ExportTxtFromPlayloadFile", {
                        name: `${group}-${exportTimeRef.current}`,
                        savePath: exportPathRef.current,
                        content: Uint8ArrayToString(data.Data)
                    })
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${exportToken}-error`, (e: any, error: any) => {
            failed(`[ExportFile] error:  ${error}`)
        })
        ipcRenderer.on(`${exportToken}-end`, (e: any, data: any) => {
            info("[ExportFile] finished")
            setExportVisible(false)
            // exportPathRef.current&&openABSFileLocated(exportPathRef.current)
        })
        return () => {
            ipcRenderer.invoke("cancel-GetAllPayloadFromFile", exportToken)
            ipcRenderer.removeAllListeners(`${exportToken}-data`)
            ipcRenderer.removeAllListeners(`${exportToken}-error`)
            ipcRenderer.removeAllListeners(`${exportToken}-end`)
        }
    }, [group])

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
            console.log("监听去重任务", data)
            if (data) {
                try {
                    setStreamData(data)
                    logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
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
                    <div className={styles["sun-title"]}>
                        {showContentType === "editor" && payloadFileData?.IsBigFile ? (
                            <YakitTag color='danger'>超大响应</YakitTag>
                        ) : (
                            `可以通过 fuzz 模块 {{x(字典名)}} 来渲染`
                        )}
                    </div>
                </div>
                {!onlyInsert&&showContentType === "table" && (
                    <div className={styles["extra"]}>
                        <YakitInput.Search
                            placeholder='请输入关键词搜索'
                            value={params.Keyword}
                            onChange={(e) => {
                                setParams({...params, Keyword: e.target.value})
                            }}
                            style={{maxWidth: 200}}
                            onSearch={() => {
                                onQueryPayload()
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
                                    onExportCsvFun({Group: group, Folder: folder}, codePath, group)
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
                                    title: null,
                                    footer: null,
                                    width: 520,
                                    type: "white",
                                    closable: false,
                                    content: (
                                        <CreateDictionaries
                                            title='扩充到护网专用工具'
                                            type='payload'
                                            onQueryGroup={() => emiter.emit("refreshListEvent")}
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

                {!onlyInsert&&showContentType === "editor" && (
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
                            <YakitButton type='outline2' icon={<OutlineExportIcon />} onClick={onExportFileFun}>
                                导出
                            </YakitButton>
                            {payloadFileData?.IsBigFile === false && (
                                <>
                                    <YakitButton
                                        type='outline2'
                                        icon={<SolidSparklesIcon />}
                                        onClick={onRemoveDuplicate}
                                    >
                                        自动去重
                                    </YakitButton>
                                    <YakitButton
                                        onClick={() => {
                                            setEditMonaco(true)
                                        }}
                                        icon={<SolidPencilaltIcon />}
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
                            noLineNumber={true}
                            value={editorValue}
                            setValue={(content: string) => {
                                setEditorValue(content)
                            }}
                            loading={loading}
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
            <YakitModal visible={visible} title={null} footer={null} width={520} type='white' closable={false}>
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

            <YakitModal visible={exportVisible} title={null} footer={null} width={520} type='white' closable={false}>
                <UploadStatusInfo
                    title={"导出中，请耐心等待..."}
                    streamData={exportStreamData}
                    cancelRun={() => {
                        cancelExportFile()
                        setExportVisible(false)
                    }}
                    onClose={() => {
                        setExportVisible(false)
                    }}
                    logInfo={[]}
                    showDownloadDetail={false}
                    autoClose={true}
                />
            </YakitModal>
        </div>
    )
}

export interface NewPayloadProps {}
export const NewPayload: React.FC<NewPayloadProps> = (props) => {
    // 是否全部展开
    const [isExpand, setExpand] = useState<boolean>(false)
    const [showContentType, setContentType] = useState<"editor" | "table">()

    // table/editor 筛选条件
    const [group, setGroup] = useState<string>("")
    const [folder, setFolder] = useState<string>("")

    const [codePath, setCodePath] = useState<string>("")
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

    return (
        <div className={styles["new-payload"]}>
            {!isExpand && (
                <div className={styles["payload-list-box"]}>
                    <NewPayloadList
                        setGroup={setGroup}
                        setFolder={setFolder}
                        setContentType={setContentType}
                        codePath={codePath}
                    />
                </div>
            )}
            {/* <div className={styles["no-data"]}>
                <YakitEmpty
                    title='暂无 Payload 字典'
                    description='可一键获取官方内置字典，或新建字典'
                    children={
                        <>
                            <YakitButton style={{marginRight: 8}} type='outline1' icon={<OutlineClouddownloadIcon />}>
                                一键获取
                            </YakitButton>
                            <YakitButton icon={<OutlineAddPayloadIcon />}>新建字典</YakitButton>
                        </>
                    }
                />
            </div> */}

            {showContentType ? (
                <PayloadContent
                    isExpand={isExpand}
                    setExpand={setExpand}
                    showContentType={showContentType}
                    group={group}
                    folder={folder}
                    codePath={codePath}
                />
            ) : (
                <div className={styles["no-data"]}>
                    <YakitEmpty title='请点击左侧列表，选择想要查看的字典' />
                </div>
            )}
        </div>
    )
}

export interface ReadOnlyNewPayloadProps {
    onClose: () => void
    selectorHandle: (v: string) => void
}
export const ReadOnlyNewPayload: React.FC<ReadOnlyNewPayloadProps> = (props) => {
    const {selectorHandle, onClose} = props
    const [showContentType, setContentType] = useState<"editor" | "table">()

    // table/editor 筛选条件
    const [group, setGroup] = useState<string>("")
    const [folder, setFolder] = useState<string>("")

    const [codePath, setCodePath] = useState<string>("")
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
    console.log("group-folder", group, folder)

    const selectInfo = useMemo(() => {
        return group.length > 0 ? group : folder
    }, [group, folder])

    return (
        <div
            style={{height: 720, borderRadius: 4, overflow: "hidden"}}
            className={classNames(styles["new-payload-only-insert"], styles["new-payload"])}
        >
            <div className={styles["payload-list-box"]}>
                <NewPayloadList
                    setGroup={setGroup}
                    setFolder={setFolder}
                    setContentType={setContentType}
                    codePath={codePath}
                    onlyInsert={true}
                    onClose={onClose}
                />
                <div className={styles["payload-list-bottom"]}>
                    <div className={styles["show"]}>
                        <div className={styles["text"]}>已选中：</div>
                        {selectInfo.length > 0 && <YakitTag color='info'>{selectInfo}</YakitTag>}
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
                            disabled={group.length === 0 && folder.length === 0}
                            onClick={() => {
                                if (group.length === 0) {
                                    selectorHandle(`{{payload(${folder}/*)}}`)
                                } else {
                                    selectorHandle(`{{payload(${group})}}`)
                                }
                            }}
                        >
                            插入
                        </YakitButton>
                    </div>
                </div>
            </div>

            {showContentType && group.length !== 0 ? (
                <PayloadContent showContentType={showContentType} group={group} folder={folder} codePath={codePath} onlyInsert={true}/>
            ) : (
                <>
                    {folder.length !== 0 ? (
                        <div className={styles["select-folder-box"]}>
                            <div className={styles["select-folder"]}>
                                <div className={styles["icon"]}>
                                    <PropertyNoAddIcon />
                                </div>
                                <div className={styles["title"]}>{selectInfo}</div>
                                <div className={styles["sub-title"]}>支持插入文件进行Fuzz</div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles["no-data"]}>
                            <YakitEmpty title='请选择要插入的字典或文件夹' />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
