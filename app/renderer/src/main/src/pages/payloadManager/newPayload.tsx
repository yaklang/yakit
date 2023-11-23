import React, {useEffect, useMemo, useRef, useState} from "react"
import {Divider, Form, Input, Progress, Tooltip} from "antd"
import {useGetState, useMemoizedFn, useThrottleFn} from "ahooks"
import styles from "./NewPayload.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
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
import {OutlineAddPayloadIcon, PropertyIcon} from "./icon"
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
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {v4 as uuidv4} from "uuid"
import {DeletePayloadProps, NewPayloadTable, Payload, PayloadAddEditForm, QueryPayloadParams} from "./newPayloadTable"
import {callCopyToClipboard} from "@/utils/basic"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {ExecResult, PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {randomString} from "@/utils/randomUtil"
const {ipcRenderer} = window.require("electron")

interface UploadStatusInfoProps {
    title: string
}

export const UploadStatusInfo: React.FC<UploadStatusInfoProps> = (props) => {
    const {title} = props
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
                            percent={Math.floor((0.25 || 0) * 100)}
                            showInfo={false}
                        />
                        <div className={styles["progress-title"]}>进度 25%</div>
                    </div>
                    <div className={styles["download-info-wrapper"]}>
                        <div>剩余时间 : {(0.06 || 0).toFixed(2)}s</div>
                        <div className={styles["divider-wrapper"]}>
                            <div className={styles["divider-style"]}></div>
                        </div>
                        <div>耗时 : {(0.04 || 0).toFixed(2)}s</div>
                        <div className={styles["divider-wrapper"]}>
                            <div className={styles["divider-style"]}></div>
                        </div>
                        <div>下载速度 : {((1000000 || 0) / 1000000).toFixed(2)}M/s</div>
                    </div>
                    <div className={styles["log-info"]}>
                        <div className={styles["log-item"]}>开始导入Payload：</div>
                        <div className={styles["log-item"]}>
                            打开本地文件：/sers/v1l14n/yakit-projects/projects/project-111.yakitproject
                        </div>
                        <div className={styles["log-item"]}>正在读取文件</div>
                        <div className={styles["log-item"]}>正在解压数据库</div>
                        <div className={styles["log-item"]}>解压完成，正在解密数据库</div>
                        <div className={styles["log-item"]}>读取基本信息</div>
                        <div className={styles["log-item"]}>导入成功</div>
                    </div>
                    <div className={styles["download-btn"]}>
                        <YakitButton loading={false} size='max' type='outline2' onClick={() => {}}>
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
}

// 新建字典
export const CreateDictionaries: React.FC<CreateDictionariesProps> = (props) => {
    const {onClose, type,title} = props
    const isDictionaries = type === "dictionaries"
    // 可上传文件类型
    const FileType = ["text/plain", "text/csv"]
    // 收集上传的数据
    const [dictionariesName, setDictionariesName] = useState<string>("")
    const [uploadList, setUploadList] = useState<string[]>([])

    // token
    const [token, setToken] = useState(randomString(20))
    const [fileToken, setFileToken] = useState(randomString(20))

    const isDisabled = useMemo(() => {
        if (isDictionaries) {
            return uploadList.length === 0 || dictionariesName.length === 0
        }
        return uploadList.length === 0
    }, [uploadList, dictionariesName, isDictionaries])

    // 数据库存储
    const onSavePayload = useMemoizedFn(() => {
        ipcRenderer.invoke(
            "SavePayloadStream",
            {
                IsFile: false,
                Content: dictionariesName,
                FileName: uploadList
            },
            token
        )
    })

    // 文件存储
    const onSavePayloadToFile = useMemoizedFn(() => {
        ipcRenderer.invoke(
            "SavePayloadToFileStream",
            {
                IsFile: true,
                Content: dictionariesName,
                FileName: uploadList
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
        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    // let messageJsonRaw = Buffer.from(data.Message).toString("utf8")
                    // let logInfo = ExtractExecResultMessageToYakitPort(JSON.parse(messageJsonRaw))
                    // if (!logInfo) return
                    // if (logInfo.isOpen) {
                    //     openPort.current.unshift(logInfo)
                    //     // 限制20条数据
                    //     openPort.current = openPort.current.slice(0, 20)
                    // } else {
                    //     // closedPort.current.unshift(logInfo)
                    // }
                } catch (e) {
                    failed("解析端口扫描结果失败...")
                }
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[SimpleDetect] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info("[SimpleDetect] finished")
        })

        const syncPorts = () => {
            // if (openPort.current) setOpenPorts([...openPort.current])
        }

        syncPorts()
        let id = setInterval(syncPorts, 1000)
        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-SimpleDetect", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    // 监听文件存储任务
    useEffect(() => {
        ipcRenderer.on(`${fileToken}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    // let messageJsonRaw = Buffer.from(data.Message).toString("utf8")
                    // let logInfo = ExtractExecResultMessageToYakitPort(JSON.parse(messageJsonRaw))
                    // if (!logInfo) return
                    // if (logInfo.isOpen) {
                    //     openPort.current.unshift(logInfo)
                    //     // 限制20条数据
                    //     openPort.current = openPort.current.slice(0, 20)
                    // } else {
                    //     // closedPort.current.unshift(logInfo)
                    // }
                } catch (e) {
                    failed("解析端口扫描结果失败...")
                }
            }
        })
        ipcRenderer.on(`${fileToken}-error`, (e: any, error: any) => {
            failed(`[SimpleDetect] error:  ${error}`)
        })
        ipcRenderer.on(`${fileToken}-end`, (e: any, data: any) => {
            info("[SimpleDetect] finished")
        })

        const syncPorts = () => {
            // if (openPort.current) setOpenPorts([...openPort.current])
        }

        syncPorts()
        let id = setInterval(syncPorts, 1000)
        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-SimpleDetect", fileToken)
            ipcRenderer.removeAllListeners(`${fileToken}-data`)
            ipcRenderer.removeAllListeners(`${fileToken}-error`)
            ipcRenderer.removeAllListeners(`${fileToken}-end`)
        }
    }, [])
    return (
        <div className={styles["create-dictionaries"]}>
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
                            <YakitButton disabled={isDisabled}>导入</YakitButton>
                        </>
                    )}
                </div>
            </>

            {/* <UploadStatusInfo title="导入中..."/> */}
        </div>
    )
}

export interface NewPayloadListProps {}

// 示例数据，可以根据实际需求进行修改
const initialData = [
    {
        type: "folders",
        name: "文件夹1",
        id: 11111,
        isFold: true,
        node: [
            {
                type: "file",
                name: "文件1-1",
                id: 111111
            },
            {
                type: "file",
                name: "文件1-2",
                id: 111112
            }
        ]
    },
    {
        type: "file",
        name: "文件2-2",
        id: 222222
    },
    {
        type: "folders",
        name: "文件夹3",
        isFold: true,
        id: 333333,
        node: [
            {
                type: "file",
                name: "文件3-1",
                id: 3333331
            },
            {
                type: "file",
                name: "文件3-2",
                id: 3333332
            }
        ]
    }
]

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
        if (item.id.toString() === targetId) {
            return item
        } else if (item.type === "folders" && item.node) {
            const foundInNode = findItemById(item.node, targetId)
            if (foundInNode) {
                return foundInNode
            }
        }
    }
    return null
}

// 根据Id获取当前文件夹
const findFoldersById = (items: DataItem[], targetId: string) => {
    for (const item of items) {
        if (item.id.toString() === targetId) {
            return item
        } else if (item.type === "folders" && item.node) {
            const foundInNode = findFoldersById(item.node, targetId)
            if (foundInNode) {
                return item
            }
        }
    }
    return null
}

interface DataItem {
    type: string
    name: string
    id: number
    // 文件夹才有 isFold 作用于判断是否展开 默认展开
    isFold?: boolean
    // 是否为新建
    isCreate?: boolean
    node?: DataItem[]
}

interface MoveLevelProps {
    draggableId: string
    level: "inside" | "outside"
}

const droppable = "droppable"
const droppableGroup = "droppableGroup"

export const NewPayloadList: React.FC<NewPayloadListProps> = (props) => {
    const [data, setData] = useState<DataItem[]>(initialData)
    const [selectItem, setSelectItem] = useState<number>()

    const [dropType, setDropType] = useState<string>(droppable)
    const [subDropType, setSubDropType] = useState<string>(droppableGroup)
    const [combineIds, setCombineIds] = useState<string[]>([])
    const [isCombineEnabled, setIsCombineEnabled] = useState<boolean>(true)

    const [moveLevel, setMoveLevel] = useState<MoveLevelProps>()

    const moveLevelRef = useRef<MoveLevelProps>()

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
            .then((data: {Groups: string[]}) => {
                console.log("Groups", data)

                // setGroups(data.Groups || [])
            })
            .catch((e: any) => {
                failed(e?.details || "call GetAllPayloadGroup failed")
            })
            .finally()
    }

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
        if (sourceItem.type === "file" && combineItem && combineItem.type === "folders") {
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
        if (sourceItem.type === "file" && combineItem && combineItem.type === "file") {
            // 移除此项
            copyData.splice(source.index, 1)
            // 生成 UUID
            const uuid = uuidv4()
            // 将 UUID 转换为整数
            const integerId = parseInt(uuid.replace(/-/g, ""), 16)
            const newData = copyData.map((item) => {
                if (item.id === combineItem.id) {
                    return {
                        type: "folders",
                        name: "未命名检测",
                        id: integerId,
                        isFold: true,
                        node: [combineItem, sourceItem]
                    }
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
        if (sourceFolders && sourceFolders?.node && combineItem && combineItem.type === "folders") {
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
        if (sourceFolders && sourceFolders?.node && combineItem && combineItem.type === "file") {
            const sourceItem = sourceFolders.node[source.index]
            sourceFolders.node.splice(source.index, 1)
            // 生成 UUID
            const uuid = uuidv4()
            // 将 UUID 转换为整数
            const integerId = parseInt(uuid.replace(/-/g, ""), 16)
            const newData = copyData.map((item) => {
                if (item.id === combineItem.id) {
                    return {
                        type: "folders",
                        name: "未命名检测",
                        id: integerId,
                        isFold: true,
                        node: [combineItem, sourceItem]
                    }
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
                // 组外两个游离的文件合成组
                if (source.droppableId === "droppable-payload" && combine.droppableId === "droppable-payload") {
                    // mergingGroup(result)
                }
                // 组内的文件拖拽到组外并和组外的文件夹合成组(组内向组外合并)
                if (source.droppableId !== "droppable-payload" && combine.droppableId === "droppable-payload") {
                    // mergeWithinAndOutsideGroup(result)
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
                        // console.log("item---",item);

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
                    console.log("source---", source, destination)
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
                if (moveType && moveType.type !== "folders") {
                    setCombineIds(ids)
                }
                // // 由内合并至外层
                // if(droppableId!=="droppable-payload"&&combine.droppableId==="droppable-payload"){

                // }
                setMoveLevel(moveLevelRef.current)
                return
            }
            // 拖拽文件时 层级变动 更改样式
            if (moveNode && destination && moveNode.type === "file") {
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
        const item: DataItem = findItemById(data, result.draggableId)
        if (item.type === "file") {
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
        if (moveType && moveType.type === "folders") {
            setIsCombineEnabled(false)
        }
    })
    return (
        <div className={styles["new-payload-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>Payload 字典管理</div>
                    <div className={styles["count"]}>8</div>
                </div>
                <div className={styles["extra"]}>
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
                                                    title="新建字典"
                                                    type='dictionaries'
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
                                        // 将 UUID 转换为整数
                                        const integerId = parseInt(uuid.replace(/-/g, ""), 16)
                                        setData([
                                            {
                                                type: "folders",
                                                name: "",
                                                isFold: true,
                                                id: integerId,
                                                isCreate: true
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
            </div>
            <div className={styles["content"]}>
                <div className={styles["drag-list"]}>
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
                                            moveLevel?.draggableId === item.id.toString()
                                                ? moveLevel.level === "outside"
                                                : true
                                        const isCombine = combineIds[0] === item.id.toString()
                                        return (
                                            <Draggable
                                                key={item.id.toString()}
                                                draggableId={item.id.toString()}
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
                                                        {item.type === "folders" ? (
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
                                                            />
                                                        ) : (
                                                            // 渲染文件组件
                                                            <FileComponent
                                                                file={item}
                                                                selectItem={selectItem}
                                                                setSelectItem={setSelectItem}
                                                                isInside={!fileOutside}
                                                                isCombine={isCombine}
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
                </div>
            </div>
        </div>
    )
}

interface FileComponentCloneProps {
    file: DataItem
    selectItem?: number
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
                <div className={classNames(styles["file-icon"], styles["file-icon-database"])}>
                    <SolidDatabaseIcon />
                </div>
                {/* <div className={classNames(styles['file-icon'],styles['file-icon-document'])}>
                    <SolidDocumenttextIcon/>
                </div> */}

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
    selectItem?: number
    setSelectItem: (id: number) => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    subDropType: string
    moveLevel?: MoveLevelProps
    // 是否合并
    isCombine?: boolean
}
export const FolderComponent: React.FC<FolderComponentProps> = (props) => {
    const {folder, selectItem, setSelectItem, data, setData, subDropType, moveLevel, isCombine} = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(folder.isCreate === true)
    const [inputName, setInputName] = useState<string>(folder.name)
    const onIsFold = useMemoizedFn((id: number) => {
        // 文件夹只会存在第一层 不用递归遍历
        const newData = data.map((item) => {
            if (item.id === id) {
                return {...item, isFold: !item.isFold}
            }
            return item
        })
        setData(newData)
    })
    // 更改文件名
    const onChangeValue = useMemoizedFn(() => {
        setEditInput(false)
        if (inputName.length > 0) {
            // 新建
            if (folder.isCreate) {
            }
            // 编辑
            else {
            }
        } else {
            // 创建时为空则不创建
            if (folder.isCreate) {
                setData(data.filter((item) => !item.isCreate))
            }
            // 编辑时为空恢复
            else {
                setInputName(folder.name)
            }
        }
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
                        [styles["folder-menu"]]: menuOpen,
                        [styles["folder-combine"]]: isCombine,
                        [styles["folder-no-combine"]]: !isCombine,
                        [styles["folder-border"]]: !isCombine && !menuOpen
                    })}
                    onClick={() => onIsFold(folder.id)}
                >
                    <div className={styles["folder-header"]}>
                        <div className={styles["is-fold-icon"]}>
                            {folder.isFold ? <SolidChevrondownIcon /> : <SolidChevronrightIcon />}
                        </div>
                        <div className={styles["folder-icon"]}>
                            <SolidFolderopenIcon />
                        </div>
                        <div className={styles["folder-name"]}>{folder.name}</div>
                    </div>
                    <div
                        className={classNames(styles["extra"], {
                            [styles["extra-dot"]]: menuOpen,
                            [styles["extra-hover"]]: !menuOpen
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles["file-count"]}>10</div>
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
                                                        title="新建子集字典"
                                                        type='dictionaries'
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
                    </div>
                </div>
            )}

            {folder.isFold && (
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
                            moveLevel?.draggableId === file[0].id.toString() ? moveLevel.level === "inside" : true
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
                                    <Draggable key={file.id.toString()} draggableId={file.id.toString()} index={index}>
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
                                                    isInside={true}
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
    )
}

interface FileComponentProps {
    file: DataItem
    selectItem?: number
    setSelectItem: (id: number) => void
    // 是否为内层
    isInside?: boolean
    // 是否合并
    isCombine?: boolean
}

export const FileComponent: React.FC<FileComponentProps> = (props) => {
    const {file, selectItem, setSelectItem, isInside = true, isCombine} = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(file.isCreate === true)
    const [inputName, setInputName] = useState<string>(file.name)
    const judgeFileIcon = useMemoizedFn((key) => {
        switch (key) {
            case 1:
                return <SolidDatabaseIcon />
            case 2:
                return <SolidDocumenttextIcon />
            default:
                return <SolidDatabaseIcon />
        }
    })
    // 更改文件名
    const onChangeValue = useMemoizedFn(() => {
        setEditInput(false)
        if (inputName.length > 0) {
            
        } else {
            setInputName(file.name)
        }
    })

    const fileMenuData = useMemo(() => {
        return [
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
                key: "exportTxt",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineExportIcon />
                        <div className={styles["menu-name"]}>导出为txt</div>
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
        // return [
        //     {
        //         key: "copyFuzztag",
        //         label: (
        //             <div className={styles["extra-menu"]}>
        //                 <OutlineDocumentduplicateIcon />
        //                 <div className={styles["menu-name"]}>复制 Fuzztag</div>
        //             </div>
        //         )
        //     },
        //     {
        //         key: "exportTxt",
        //         label: (
        //             <div className={styles["extra-menu"]}>
        //                 <OutlineImportIcon />
        //                 <div className={styles["menu-name"]}>扩充字典</div>
        //             </div>
        //         )
        //     },
        //     {
        //         key: "rename",
        //         label: (
        //             <div className={styles["extra-menu"]}>
        //                 <OutlinePencilaltIcon />
        //                 <div className={styles["menu-name"]}>重命名</div>
        //             </div>
        //         )
        //     },
        //     {
        //         key: "toDatabase",
        //         label: (
        //             <div className={styles["extra-menu"]}>
        //                 <OutlineDatabasebackupIcon />
        //                 <div className={styles["menu-name"]}>转为数据库存储</div>
        //             </div>
        //         )
        //     },
        //     {
        //         key: "delete",
        //         label: (
        //             <div className={styles["extra-menu"]}>
        //                 <OutlineTrashIcon />
        //                 <div className={styles["menu-name"]}>删除</div>
        //             </div>
        //         )
        //     }
        // ]
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
                        <div className={classNames(styles["file-icon"], styles["file-icon-database"])}>
                            <SolidDatabaseIcon />
                        </div>
                        {/* <div className={classNames(styles['file-icon'],styles['file-icon-document'])}>
                            <SolidDocumenttextIcon/>
                        </div> */}

                        <div className={styles["file-name"]}>{file.name}</div>
                    </div>
                    <div
                        className={classNames(styles["extra"], {
                            [styles["extra-dot"]]: menuOpen,
                            [styles["extra-hover"]]: !menuOpen
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles["file-count"]}>10</div>
                        <YakitDropdownMenu
                            menu={{
                                data: fileMenuData,
                                onClick: ({key}) => {
                                    setMenuOpen(false)
                                    switch (key) {
                                        case "copyFuzztag":
                                            callCopyToClipboard("666")
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
                                                        title="扩充到护网专用工具"
                                                        type='payload'
                                                        onClose={() => {
                                                            m.destroy()
                                                        }}
                                                    />
                                                )
                                            })
                                            break
                                        case "exportTxt":
                                            break
                                        case "rename":
                                            setEditInput(true)
                                            break
                                        case "toDatabase":
                                            break
                                        case "delete":
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
                    </div>
                </div>
            )}
        </>
    )
}

interface PayloadContentProps {
    isExpand: boolean
    setExpand: (v: boolean) => void
    showContentType: "editor" | "table"
}

export const PayloadContent: React.FC<PayloadContentProps> = (props) => {
    const {isExpand, setExpand, showContentType} = props
    const [isEditMonaco, setEditMonaco] = useState<boolean>(false)
    const [editorValue, setEditorValue] = useState<string>("")

    const [deletePayloadArr, setDeletePayloadArr] = useState<number[]>([])
    const [params, setParams, getParams] = useGetState<QueryPayloadParams>({
        Keyword: "",
        Folder: "",
        Group: "",
        Pagination: {Page: 1, Limit: 20, Order: "asc", OrderBy: "id"}
    })
    const [response, setResponse] = useState<QueryGeneralResponse<Payload>>()
    const pagination: PaginationSchema | undefined = response?.Pagination

    const Expand = () => (
        <div
            className={styles["icon-box"]}
            onClick={() => {
                setExpand(!isExpand)
            }}
        >
            {isExpand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
        </div>
    )

    const onQueryPayload = useMemoizedFn((page?: number, limit?: number) => {
        const obj: QueryPayloadParams = {
            ...getParams(),
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
                failed(e?.details || "query payload failed")
            })
    })

    const onDeletePayload = useMemoizedFn((deletePayload: DeletePayloadProps) => {
        ipcRenderer
            .invoke("DeletePayload", deletePayload)
            .then(() => {
                onQueryPayload(pagination?.Page, pagination?.Limit)
                setDeletePayloadArr([])
                success("删除成功")
            })
            .catch((e: any) => {
                failed("删除失败：" + e)
            })
    })

    return (
        <div className={styles["payload-content"]}>
            <div className={styles["header"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>
                        {showContentType === "editor" ? "pass_top25" : "护网专用工具"}
                    </div>
                    <div className={styles["sun-title"]}>{`可以通过 fuzz 模块 {{x(字典名)}} 来渲染`}</div>
                </div>
                {showContentType === "table" && (
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
                            disabled={deletePayloadArr.length === 0}
                            onClick={() => {
                                if (deletePayloadArr.length > 0) {
                                    onDeletePayload({Ids: deletePayloadArr})
                                }
                            }}
                        />
                        <YakitButton type='outline2' icon={<OutlineExportIcon />}>
                            导出
                        </YakitButton>
                        <YakitButton
                            icon={<OutlinePlusIcon />}
                            onClick={() => {
                                const m = showYakitModal({
                                    title: "扩充",
                                    width: 448,
                                    type: "white",
                                    footer: null,
                                    content: <PayloadAddEditForm onClose={() => m.destroy()} />
                                })
                            }}
                        >
                            扩充
                        </YakitButton>
                        {Expand()}
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
                                }}
                            >
                                取消
                            </YakitButton>
                            <YakitButton
                                icon={<SolidStoreIcon />}
                                onClick={() => {
                                    setEditMonaco(false)
                                }}
                            >
                                保存
                            </YakitButton>
                            {Expand()}
                        </div>

                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-hidden"]]: isEditMonaco
                            })}
                        >
                            <YakitButton type='outline1' colors='danger' icon={<OutlineTrashIcon />} />
                            <YakitButton type='outline2' icon={<OutlineExportIcon />}>
                                导出
                            </YakitButton>
                            <YakitButton type='outline2' icon={<SolidSparklesIcon />}>
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
                            {Expand()}
                        </div>
                    </>
                )}
            </div>
            <div className={styles["content"]}>
                {showContentType === "editor" && (
                    <div className={styles["editor-box"]}>
                        <YakitEditor
                            type='plaintext'
                            readOnly={!isEditMonaco}
                            noLineNumber={true}
                            value={editorValue}
                            setValue={(content: string) => {
                                setEditorValue(content)
                            }}
                        />
                    </div>
                )}
                {showContentType === "table" && (
                    <div className={styles["table-box"]}>
                        <NewPayloadTable
                            deletePayloadArr={deletePayloadArr}
                            setDeletePayloadArr={setDeletePayloadArr}
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

export interface NewPayloadProps {}
export const NewPayload: React.FC<NewPayloadProps> = (props) => {
    // 是否全部展开
    const [isExpand, setExpand] = useState<boolean>(false)
    const [showContentType, setContentType] = useState<"editor" | "table">("table")
    return (
        <div className={styles["new-payload"]}>
            {!isExpand && (
                <div className={styles["payload-list-box"]}>
                    <NewPayloadList />
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
                <PayloadContent isExpand={isExpand} setExpand={setExpand} showContentType={showContentType} />
            ) : (
                <div className={styles["no-data"]}>
                    <YakitEmpty title='请点击左侧列表，选择想要查看的字典' />
                </div>
            )}
        </div>
    )
}
