import React, {useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useMemoizedFn, useThrottleEffect, useThrottleFn, useUpdateEffect} from "ahooks"
import {LeftSideBar} from "./LeftSideBar/LeftSideBar"
import {BottomSideBar} from "./BottomSideBar/BottomSideBar"
import {RightAuditDetail} from "./RightAuditDetail/RightAuditDetail"
import {FileNodeMapProps, FileNodeProps, FileTreeListProps, FileTreeNodeProps} from "./FileTree/FileTreeType"
import {
    addAreaFileInfo,
    getCodeByPath,
    getCodeSizeByPath,
    getDefaultActiveFile,
    getNameByPath,
    getPathParent,
    getYakRunnerLastFolderExpanded,
    grpcFetchAuditTree,
    grpcFetchCreateFile,
    grpcFetchFileTree,
    judgeAreaExistAuditPath,
    judgeAreaExistFilePath,
    MAX_FILE_SIZE_BYTES,
    monacaLanguageType,
    removeAreaFileInfo,
    removeAreaFilesInfo,
    setAreaFileActive,
    setYakRunnerHistory,
    setYakRunnerLastFolderExpanded,
    updateAreaFileInfo,
    updateFileTree
} from "./utils"
import {
    AreaInfoProps,
    AuditCodeStatusInfoProps,
    AuditCodeStreamData,
    AuditEmiterYakUrlProps,
    OpenFileByPathProps,
    TabFileProps,
    ViewsInfoProps,
    YakRunnerHistoryProps,
    YakRunnerProps
} from "./YakRunnerType"
import {getRemoteValue} from "@/utils/kv"
import {YakRunnerRemoteGV} from "@/enums/yakRunner"
import {failed, success, yakitNotify} from "@/utils/notification"
import YakRunnerContext, {YakRunnerContextDispatcher, YakRunnerContextStore} from "./hooks/YakRunnerContext"
import {FileDefault, FileSuffix, FolderDefault} from "./FileTree/icon"
import {RunnerTabs, YakRunnerWelcomePage} from "./RunnerTabs/RunnerTabs"

import {
    DragDropContext,
    Droppable,
    Draggable,
    DragUpdate,
    ResponderProvided,
    DragStart,
    BeforeCapture,
    DropResult
} from "@hello-pangea/dnd"

import classNames from "classnames"
import styles from "./YakRunner.module.scss"
import {SplitView} from "./SplitView/SplitView"
import {HelpInfoList} from "./CollapseList/CollapseList"
import {BottomEditorDetails} from "./BottomEditorDetails/BottomEditorDetails"
import {ShowItemType} from "./BottomEditorDetails/BottomEditorDetailsType"
import {getKeyboard, clearKeyboard, setKeyboard} from "./keyDown/keyDown"
import {FileDetailInfo} from "./RunnerTabs/RunnerTabsType"
import cloneDeep from "lodash/cloneDeep"
import {v4 as uuidv4} from "uuid"
import moment from "moment"
import {keySortHandle} from "@/components/yakitUI/YakitEditor/editorUtils"
import emiter from "@/utils/eventBus/eventBus"
import {
    clearMapFileDetail,
    getMapAllFileKey,
    getMapAllFileValue,
    getMapFileDetail,
    setMapFileDetail
} from "./FileTreeMap/FileMap"
import {clearMapFolderDetail, getMapFolderDetail, hasMapFolderDetail, setMapFolderDetail} from "./FileTreeMap/ChildMap"
import {sendDuplexConn} from "@/utils/duplex/duplex"
import {StringToUint8Array} from "@/utils/str"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {AuditModalForm} from "./AuditCode/AuditCode"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {apiDebugPlugin, DebugPluginRequest} from "../plugins/utils"
import {clearMapAuditChildDetail} from "./AuditCode/AuditTree/ChildMap"
import {clearMapAuditDetail} from "./AuditCode/AuditTree/AuditMap"
import {LeftSideType} from "./LeftSideBar/LeftSideBarType"
import {isCommunityEdition} from "@/utils/envfile"
import {WaterMark} from "@ant-design/pro-layout"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Progress} from "antd"
import {SolidDocumentdownloadIcon} from "@/assets/icon/solid"
const {ipcRenderer} = window.require("electron")

// 模拟tabs分块及对应文件
// 设想方法1：区域4等分，减少其结构嵌套层数，分别用1、2、3、4标注其展示所处区域 例如全屏展示则为[1、2、3、4]
/**  
 * 设想方法2（数组每一项对应着垂直项,其中elements中代表横着的项）：[
// 
 * {
        elements:[{...},{...}]
 * },
 * {
 * 
 * }
 * ]
*/

export const YakRunner: React.FC<YakRunnerProps> = (props) => {
    const {initCode} = props

    /** ---------- 文件树 ---------- */
    const [fileTree, setFileTree] = useState<FileTreeListProps[]>([])
    /** ---------- 审计树 ---------- */
    const [projectNmae, setProjectNmae] = useState<string>()
    /** ---------- 当前渲染树（文件树/审计树） ---------- */
    const [loadTreeType, setLoadTreeType, getLoadTreeType] = useGetState<"file" | "audit">("file")
    const [areaInfo, setAreaInfo] = useState<AreaInfoProps[]>([])
    const [activeFile, setActiveFile] = useState<FileDetailInfo>()
    const [runnerTabsId, setRunnerTabsId] = useState<string>()
    const [isShowFileHint, setShowFileHint] = useState<boolean>(false)
    const [isShowCompileModal, setShowCompileModal] = useState<boolean>(false)
    const [isShowRunAuditModal, setShowRunAuditModal] = useState<boolean>(false)
    const [isInitDefault, setInitDefault] = useState<boolean>(false)

    const handleFetchFileList = useMemoizedFn((path: string, callback?: (value: FileNodeMapProps[]) => any) => {
        if (getMapFileDetail(path).isCreate) {
            if (callback) callback([])
            return
        }
        if (getLoadTreeType() === "file") {
            grpcFetchFileTree(path)
                .then((res) => {
                    // console.log("文件树", res)
                    if (callback) callback(res)
                })
                .catch((error) => {
                    yakitNotify("error", `获取文件项目失败: ${error}`)
                    if (callback) callback([])
                })
        } else {
            grpcFetchAuditTree(path)
                .then((res) => {
                    if (callback) callback(res.data)
                })
                .catch((error) => {
                    if (error.toString().includes("record not found")) {
                        yakitNotify("error", `获取审计项目：该项目 ${path} 已被删除。`)
                    } else {
                        yakitNotify("error", `获取审计项目失败: ${error}`)
                    }
                    if (callback) callback([])
                })
        }
    })

    // 轮询下标
    const loadIndexRef = useRef<number>(0)
    // 接口是否运行中
    const isFetchRef = useRef<boolean>(false)

    // 提前注入Map
    const insertFileMap = useMemoizedFn((path) => {
        isFetchRef.current = true
        loadIndexRef.current += 1
        handleFetchFileList(path, (value) => {
            isFetchRef.current = false
            if (value.length > 0) {
                // 此处还需缓存结构Map用于结构信息
                /* 示例 [
                    {
                        key:path,
                        child:[path1,path2,...]
                    },
                    {
                        key:path1,
                        child:[path11,path12,...]
                    }]
                */
                let childArr: string[] = []
                // 文件Map
                value.forEach((item) => {
                    // 注入文件结构Map
                    childArr.push(item.path)
                    // 文件Map
                    setMapFileDetail(item.path, item)
                })
                setMapFolderDetail(path, childArr)
            }
        })
    })

    // 轮询提前加载未打开文件
    const loadFileMap = useMemoizedFn(() => {
        // 接口运行中 暂时拦截下一个接口请求
        if (isFetchRef.current) return
        if (fileTree.length === 0) return
        const keys = getMapAllFileKey()
        const index = loadIndexRef.current
        if (!keys[index]) return
        // 如果为文件时无需加载 加载下一个
        if (!getMapFileDetail(keys[index]).isFolder) {
            loadIndexRef.current += 1
            return
        }
        // 校验其子项是否存在 存在则无需加载
        const isLoadChild = hasMapFolderDetail(keys[index])
        if (isLoadChild) {
            loadIndexRef.current += 1
            return
        }
        insertFileMap(keys[index])
    })

    const clearMap = useMemoizedFn(() => {
        clearMapFileDetail()
        clearMapFolderDetail()
        clearMapAuditDetail()
        clearMapAuditChildDetail()
    })

    useEffect(() => {
        loadIndexRef.current = 0
        clearMap()
        let id = setInterval(() => {
            loadFileMap()
        }, 100)
        return () => clearInterval(id)
    }, [])

    // 重置Map与轮询
    const resetMap = useMemoizedFn((isFirst) => {
        loadIndexRef.current = 0
        clearMap()
        // FileTree缓存清除
        isFirst && emiter.emit("onResetFileTree")
    })

    const startMonitorFolder = useMemoizedFn((absolutePath, treeType: "file" | "audit") => {
        // 先停止 再启用
        const stopData = StringToUint8Array(
            JSON.stringify({
                operate: "stop"
            })
        )
        sendDuplexConn({
            Data: stopData,
            MessageType: "file_monitor",
            Timestamp: new Date().getTime()
        })
        // 审计树时屏蔽文件监控
        if (treeType === "audit") return
        const startData = StringToUint8Array(
            JSON.stringify({
                operate: "new",
                path: absolutePath
            })
        )
        sendDuplexConn({
            Data: startData,
            MessageType: "file_monitor",
            Timestamp: new Date().getTime()
        })
    })

    const onInitTreeFun = useMemoizedFn(
        async (rootPath: string, treeType: "file" | "audit", isFirst: boolean = true) => {
            onResetAuditStatusFun()
            // 开启文件夹监听
            startMonitorFolder(rootPath, treeType)
            // console.log("onOpenFileTreeFun", rootPath)
            const lastFolder = await getNameByPath(rootPath)

            if (rootPath.length > 0 && lastFolder.length > 0) {
                resetMap(isFirst)
                const node: FileNodeMapProps = {
                    parent: null,
                    name: lastFolder,
                    path: rootPath,
                    isFolder: true,
                    icon: FolderDefault
                }

                handleFetchFileList(rootPath, (list) => {
                    // 如若打开空文件夹 则不可展开
                    if (list.length === 0) {
                        node.isLeaf = true
                    }
                    setMapFileDetail(rootPath, node)
                    const children: FileTreeListProps[] = []

                    let childArr: string[] = []
                    list.forEach((item) => {
                        // 注入文件结构Map
                        childArr.push(item.path)
                        // 文件Map
                        setMapFileDetail(item.path, item)
                        // 注入tree结构
                        children.push({path: item.path})
                    })
                    // 文件结构Map
                    setMapFolderDetail(rootPath, childArr)

                    if (list) setFileTree([{path: rootPath}])
                })

                // 打开文件夹时接入历史记录
                const history: YakRunnerHistoryProps = {
                    isFile: false,
                    name: lastFolder,
                    path: rootPath,
                    loadTreeType: getLoadTreeType()
                }
                setYakRunnerHistory(history)
            }
        }
    )

    // 加载文件树(初次加载)
    const onOpenFileTreeFun = useMemoizedFn(async (absolutePath: string) => {
        // console.log("文件树---", absolutePath)
        setLoadTreeType("file")
        onInitTreeFun(absolutePath, "file")
    })

    // 加载审计树(初次加载)
    const onOpenAuditTreeFun = useMemoizedFn(async (name: string) => {
        // console.log("审计树---", name)
        setLoadTreeType("audit")
        setProjectNmae(name)
        onInitTreeFun(`/${name}`, "audit")
    })

    // 刷新文件/审计树
    const onRefreshTreeFun = useMemoizedFn(() => {
        if (loadTreeType === "file") {
            if (fileTree.length > 0) {
                const ProjectPath = fileTree[0].path
                onInitTreeFun(ProjectPath, "file", false)
            }
        } else {
            projectNmae && onInitTreeFun(`/${projectNmae}`, "audit", false)
        }
    })

    // 是否正在读取中
    const isReadingRef = useRef<boolean>(false)
    const onOpenFileByPathFun = useMemoizedFn(async (data) => {
        try {
            const {params, isHistory, isOutside} = JSON.parse(data) as OpenFileByPathProps
            const {path, name, parent, highLightRange} = params

            // 校验是否已存在 如若存在则不创建只定位
            const file = await judgeAreaExistFilePath(areaInfo, path)
            if (file) {
                let cacheAreaInfo = areaInfo
                // 如若存在高亮显示 则注入
                if (highLightRange) {
                    cacheAreaInfo = updateAreaFileInfo(areaInfo, {...file, highLightRange}, file.path)
                }
                const newAreaInfo = setAreaFileActive(cacheAreaInfo, path)
                setAreaInfo && setAreaInfo(newAreaInfo)
                setActiveFile && setActiveFile({...file, highLightRange})
            } else {
                // 如若为打开外部文件 则无需校验是否为审计树 直接按照文件树打开
                const fileSourceType = isOutside ? "file" : loadTreeType
                const {size, isPlainText} = await getCodeSizeByPath(path, fileSourceType)
                if (size > MAX_FILE_SIZE_BYTES) {
                    setShowFileHint(true)
                    return
                }
                // 取消上一次请求
                if (isReadingRef.current) {
                    ipcRenderer.invoke("cancel-ReadFile")
                }
                isReadingRef.current = true
                const code = await getCodeByPath(path, loadTreeType)
                isReadingRef.current = false
                const suffix = name.indexOf(".") > -1 ? name.split(".").pop() : ""
                const scratchFile: FileDetailInfo = {
                    name,
                    code,
                    icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                    isActive: true,
                    openTimestamp: moment().unix(),
                    isPlainText,
                    fileSourceType,
                    // 此处赋值 path 用于拖拽 分割布局等UI标识符操作
                    path,
                    parent: parent || null,
                    language: monacaLanguageType(suffix),
                    highLightRange
                }
                // (性能优化 为了快速打开文件 在文件打开时不注入语法检测 再文件打开后再注入语法检测)
                // const syntaxActiveFile = {...(await getDefaultActiveFile(scratchFile))}
                const {newAreaInfo, newActiveFile} = addAreaFileInfo(areaInfo, scratchFile, activeFile)
                setAreaInfo && setAreaInfo(newAreaInfo)
                setActiveFile && setActiveFile(newActiveFile)

                if (isHistory) {
                    // 创建文件时接入历史记录
                    const history: YakRunnerHistoryProps = {
                        isFile: true,
                        name,
                        path
                    }
                    setYakRunnerHistory(history)
                }
            }
        } catch (error) {
            failed(`error: ${error}`)
        }
    })

    useEffect(() => {
        // 监听文件树打开
        emiter.on("onOpenFileTree", onOpenFileTreeFun)
        // 监听审计树打开
        emiter.on("onOpenAuditTree", onOpenAuditTreeFun)
        // 刷新树
        emiter.on("onRefreshTree", onRefreshTreeFun)
        // 通过路径打开文件
        emiter.on("onOpenFileByPath", onOpenFileByPathFun)
        return () => {
            emiter.off("onOpenFileTree", onOpenFileTreeFun)
            emiter.off("onOpenAuditTree", onOpenAuditTreeFun)
            emiter.off("onRefreshTree", onRefreshTreeFun)
            emiter.off("onOpenFileByPath", onOpenFileByPathFun)
        }
    }, [])

    // 加载下一层
    const handleFileLoadData = useMemoizedFn((path: string) => {
        return new Promise((resolve, reject) => {
            // 校验其子项是否存在
            const childArr = getMapFolderDetail(path)
            if (childArr.length > 0) {
                emiter.emit("onRefreshFileTree")
                resolve("")
            } else {
                handleFetchFileList(path, (value) => {
                    if (value.length > 0) {
                        let childArr: string[] = []
                        value.forEach((item) => {
                            // 注入文件结构Map
                            childArr.push(item.path)
                            // 文件Map
                            setMapFileDetail(item.path, item)
                        })
                        setMapFolderDetail(path, childArr)
                        setTimeout(() => {
                            emiter.emit("onRefreshFileTree")
                            resolve("")
                        }, 300)
                    } else {
                        reject()
                    }
                })
            }
        })
    })

    const [isUnShow, setUnShow] = useState<boolean>(true)
    const [isShowAuditDetail, setShowAuditDetail] = useState<boolean>(false)

    // 根据历史读取上次打开的文件夹
    const onSetUnShowFun = useMemoizedFn(async () => {
        const historyData = await getYakRunnerLastFolderExpanded()
        if (historyData?.loadTreeType === "audit") {
            setLoadTreeType("audit")
            if (historyData?.folderPath) {
                const path = historyData.folderPath
                const name = path.startsWith("/") ? path.slice(1) : path
                onOpenAuditTreeFun(name)
                setUnShow(false)
            }
        } else {
            if (historyData?.folderPath) {
                onOpenFileTreeFun(historyData.folderPath)
                setUnShow(false)
            }
        }
        emiter.emit("onDefaultExpanded", JSON.stringify(historyData?.expandedKeys || []))
    })

    const onSaveYakRunnerLastFolder = useMemoizedFn(async (newPath) => {
        const historyData = await getYakRunnerLastFolderExpanded()
        const folderPath = historyData?.folderPath || ""
        if (folderPath.length === 0) {
            setYakRunnerLastFolderExpanded({
                loadTreeType,
                folderPath: newPath,
                expandedKeys: []
            })
        }

        if (folderPath.length > 0 && folderPath !== newPath) {
            setYakRunnerLastFolderExpanded({
                loadTreeType,
                folderPath: newPath,
                expandedKeys: []
            })
            // FileTree缓存清除
            emiter.emit("onResetFileTree")
        }
    })

    useUpdateEffect(() => {
        if (fileTree.length > 0) {
            onSaveYakRunnerLastFolder(fileTree[0].path)
            setUnShow(false)
        } else {
            setYakRunnerLastFolderExpanded({
                loadTreeType: "file",
                folderPath: "",
                expandedKeys: []
            })
        }
    }, [fileTree])

    useEffect(() => {
        onSetUnShowFun()
    }, [])

    const store: YakRunnerContextStore = useMemo(() => {
        return {
            fileTree: fileTree,
            projectNmae: projectNmae,
            loadTreeType: loadTreeType,
            areaInfo: areaInfo,
            activeFile: activeFile,
            runnerTabsId: runnerTabsId
        }
    }, [fileTree, projectNmae, loadTreeType, areaInfo, activeFile, runnerTabsId])

    const dispatcher: YakRunnerContextDispatcher = useMemo(() => {
        return {
            setFileTree: setFileTree,
            setProjectNmae: setProjectNmae,
            setLoadTreeType: setLoadTreeType,
            handleFileLoadData: handleFileLoadData,
            setAreaInfo: setAreaInfo,
            setActiveFile: setActiveFile,
            setRunnerTabsId: setRunnerTabsId
        }
    }, [])

    const keyDownRef = useRef<HTMLDivElement>(null)
    const unTitleCountRef = useRef<number>(1)

    const addFileTab = useThrottleFn(
        () => {
            // 新建临时文件
            const scratchFile: FileDetailInfo = {
                name: `Untitle-${unTitleCountRef.current}.yak`,
                code: "# input your yak code\nprintln(`Hello Yak World!`)",
                icon: "_f_yak",
                isActive: true,
                openTimestamp: moment().unix(),
                fileSourceType: "file",
                isPlainText: true,
                // 此处赋值 path 用于拖拽 分割布局等UI标识符操作
                path: `${uuidv4()}-Untitle-${unTitleCountRef.current}.yak`,
                parent: null,
                language: "yak",
                isUnSave: true
            }
            unTitleCountRef.current += 1
            const {newAreaInfo, newActiveFile} = addAreaFileInfo(areaInfo, scratchFile, activeFile)

            setAreaInfo(newAreaInfo)
            setActiveFile(newActiveFile)
        },
        {wait: 300}
    ).run

    const [active, setActive, getActive] = useGetState<LeftSideType>("file-tree")
    const [codePath, setCodePath] = useState<string>("")
    // 默认保存路径
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

    // 存储文件
    const ctrl_s = useMemoizedFn(() => {
        try {
            // 如若未保存 则
            if (activeFile && activeFile.isUnSave && activeFile.code.length > 0) {
                ipcRenderer
                    .invoke("show-save-dialog", `${codePath}${codePath ? "/" : ""}${activeFile.name}`)
                    .then(async (res) => {
                        const path = res.filePath
                        const name = res.name
                        if (path.length > 0) {
                            const suffix = name.split(".").pop()

                            const file: FileDetailInfo = {
                                ...activeFile,
                                path,
                                isUnSave: false,
                                language: monacaLanguageType(suffix || "")
                            }
                            const parentPath = await getPathParent(file.path)
                            const parentDetail = getMapFileDetail(parentPath)
                            const result = await grpcFetchCreateFile(
                                file.path,
                                file.code,
                                parentDetail.isReadFail ? "" : parentPath
                            )
                            // 如若保存路径为文件列表中则需要更新文件树
                            if (fileTree.length > 0 && file.path.startsWith(fileTree[0].path)) {
                                let arr: FileNodeMapProps[] = []
                                if (loadTreeType === "file") {
                                    arr = await grpcFetchFileTree(parentPath)
                                }
                                if (loadTreeType === "audit") {
                                    const {data} = await grpcFetchAuditTree(parentPath)
                                    arr = data
                                }
                                if (arr.length > 0) {
                                    let childArr: string[] = []
                                    // 文件Map
                                    arr.forEach((item) => {
                                        // 注入文件结构Map
                                        childArr.push(item.path)
                                        // 文件Map
                                        setMapFileDetail(item.path, item)
                                    })
                                    setMapFolderDetail(parentPath, childArr)
                                }
                                emiter.emit("onRefreshFileTree", parentPath)
                            }
                            if (result.length > 0) {
                                file.name = result[0].name
                                file.isDelete = false
                                success(`${result[0].name} 保存成功`)
                                const removeAreaInfo = removeAreaFileInfo(areaInfo, file)
                                const newAreaInfo = updateAreaFileInfo(removeAreaInfo, file, activeFile.path)
                                setAreaInfo && setAreaInfo(newAreaInfo)
                                setActiveFile && setActiveFile(file)

                                // 创建文件时接入历史记录
                                const history: YakRunnerHistoryProps = {
                                    isFile: true,
                                    name,
                                    path
                                }
                                setYakRunnerHistory(history)
                            }
                        }
                    })
            }
        } catch (error) {
            failed(`${activeFile?.name}保存失败`)
        }
    })

    // 关闭文件
    const ctrl_w = useMemoizedFn((event) => {
        if (activeFile) {
            event.stopPropagation()
            emiter.emit("onCloseFile", activeFile.path)
        }
    })

    // 终端
    const onOpenTermina = useMemoizedFn(() => {
        emiter.emit("onOpenTerminaDetail")
    })

    // 文件树重命名（快捷键）
    const onTreeRename = useMemoizedFn(() => {
        emiter.emit("onOperationFileTree", "rename")
    })

    // 文件树删除（快捷键）
    const onTreeDelete = useMemoizedFn(() => {
        emiter.emit("onOperationFileTree", "delete")
    })

    // 文件树复制（快捷键）
    const onTreeCopy = useMemoizedFn(() => {
        emiter.emit("onOperationFileTree", "copy")
    })

    // 文件树粘贴（快捷键）
    const onTreePaste = useMemoizedFn(() => {
        emiter.emit("onOperationFileTree", "paste")
    })

    // yakrunner全局事件(monaca中也需生效)
    const entiretyEvent = ["17-192", "17-83", "17-87", "17-78"]
    // 仅在文件树显示时生效的事件
    const fileTreeEvent = ["113", "46", "17-67", "17-86"]
    // 注入默认键盘事件
    const defaultKeyDown = useMemoizedFn(() => {
        // ctrl_n 新建临时文件
        setKeyboard("17-78", {onlyid: uuidv4(), callback: addFileTab})
        // 保存
        setKeyboard("17-83", {onlyid: uuidv4(), callback: ctrl_s})
        setKeyboard("17-87", {onlyid: uuidv4(), callback: ctrl_w})
        // 打开终端
        setKeyboard("17-192", {onlyid: uuidv4(), callback: onOpenTermina})
        // 文件树重命名
        setKeyboard("113", {onlyid: uuidv4(), callback: onTreeRename})
        // 文件树删除
        setKeyboard("46", {onlyid: uuidv4(), callback: onTreeDelete})
        // 文件树复制
        setKeyboard("17-67", {onlyid: uuidv4(), callback: onTreeCopy})
        // 文件树粘贴
        setKeyboard("17-86", {onlyid: uuidv4(), callback: onTreePaste})
    })

    useEffect(() => {
        clearKeyboard()
        defaultKeyDown()
    }, [])

    const handleKeyPress = (event) => {
        // 此处的event.stopPropagation会导致文件树重命名回车失效
        // event.stopPropagation()
        // console.log("Key keydown:", event)
        // 此处在使用key时发现字母竟区分大小写-故使用which替换
        const {shiftKey, ctrlKey, altKey, metaKey, key, which} = event
        let activeKey: number[] = []
        if (shiftKey) activeKey.push(16)
        if (ctrlKey) activeKey.push(17)
        if (altKey) activeKey.push(18)
        if (metaKey) activeKey.push(93)
        activeKey.push(which)
        const newkey = keySortHandle(activeKey).join("-")
        let arr = getKeyboard(newkey)
        // console.log("newkey---", newkey, arr)
        if (!arr) return
        // 屏蔽所有Input输入框引起的快捷键 PS:monaca/xterm 除外
        if (
            ["textarea", "input"].includes(event.target.localName) &&
            event.target?.ariaRoleDescription !== "editor" &&
            event.target?.className !== "xterm-helper-textarea"
        )
            return
        // 审计模式时 终端对应快捷键需屏蔽
        if (getLoadTreeType() === "audit" && newkey === "17-192") return
        // 文件树相关快捷键只在文件树控件展示时生效
        if (fileTreeEvent.includes(newkey) && (getActive() !== "file-tree" || getLoadTreeType() === "audit")) return
        // 在这里处理全局键盘事件(如若是monaca诱发的事件则拦截) PS:部分特殊事件除外
        if (event.target?.ariaRoleDescription === "editor" && !entiretyEvent.includes(newkey)) return
        arr.forEach((item) => {
            item.callback(event)
        })
    }
    useEffect(() => {
        if (keyDownRef.current) {
            keyDownRef.current.addEventListener("keydown", handleKeyPress)
        }
        return () => {
            // 在组件卸载时移除事件监听器
            if (keyDownRef.current) {
                keyDownRef.current.removeEventListener("keydown", handleKeyPress)
            }
        }
    }, [])

    const [isShowEditorDetails, setEditorDetails] = useState<boolean>(false)
    // 当前展示项
    const [showItem, setShowItem] = useState<ShowItemType>("output")
    // 最后焦点聚集编辑器输出
    const onFixedEditorDetails = useMemoizedFn((element: React.ReactNode): React.ReactNode => {
        // 后续此处还需要传入焦点代码/路径等信息
        return (
            <SplitView
                isVertical={true}
                isLastHidden={!isShowEditorDetails}
                elements={[
                    {element: element},
                    {
                        element: (
                            <BottomEditorDetails
                                showItem={showItem}
                                setShowItem={setShowItem}
                                isShowEditorDetails={isShowEditorDetails}
                                setEditorDetails={setEditorDetails}
                            />
                        )
                    }
                ]}
            />
        )
    })
    // 打开底部编辑器输出
    const onOpenEditorDetails = useMemoizedFn((v: ShowItemType) => {
        setShowItem(v)
        setEditorDetails(true)
    })

    const onDragStart = useMemoizedFn(() => {
        // 切换时应移除编辑器焦点(原因：拖拽会导致monaca焦点无法主动失焦)
        if (document.activeElement !== null) {
            // @ts-ignore
            document.activeElement.blur()
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

    // 拖放结束时的回调函数
    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        try {
            const {source, destination, draggableId, type, combine} = result
            if (!destination) {
                return
            }
            const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
            // 同层内拖拽
            if (source.droppableId === destination.droppableId) {
                newAreaInfo.forEach((item, index) => {
                    item.elements.forEach((itemIn, indexIn) => {
                        if (itemIn.id === source.droppableId) {
                            moveArrayElement(
                                newAreaInfo[index].elements[indexIn].files,
                                source.index,
                                destination.index
                            )
                        }
                    })
                })
            }
            // 拖拽到另一层
            else if (source.droppableId !== destination.droppableId) {
                let element: FileDetailInfo | null = null
                let indexArr: number[] = []
                newAreaInfo.forEach((item, index) => {
                    item.elements.forEach((itemIn, indexIn) => {
                        // 需要移除项
                        if (itemIn.id === source.droppableId) {
                            // 从数组中移除元素并获取拖拽元素
                            const [ele] = newAreaInfo[index].elements[indexIn].files.splice(source.index, 1)
                            element = ele

                            let filesLength = newAreaInfo[index].elements[indexIn].files.length
                            // 校验是否仅有一项 移除后是否为空 为空则删除此大项
                            if (filesLength === 0) {
                                if (item.elements.length > 1) {
                                    newAreaInfo[index].elements = newAreaInfo[index].elements.filter(
                                        (item) => item.id !== source.droppableId
                                    )
                                } else if (item.elements.length <= 1) {
                                    newAreaInfo.splice(index, 1)
                                }
                            }
                            // 由于移走激活文件 重新赋予激活文件
                            else if (filesLength !== 0 && ele.isActive) {
                                newAreaInfo[index].elements[indexIn].files[
                                    source.index - 1 < 0 ? 0 : source.index - 1
                                ].isActive = true
                            }
                        }
                        // 需要新增项
                        if (itemIn.id === destination.droppableId) {
                            indexArr = [index, indexIn]
                        }
                    })
                })
                // 新增
                if (element && indexArr.length > 0) {
                    // 如若拖拽项是已激活文件 则将拖拽后的原本激活文件变为未激活
                    if ((element as FileDetailInfo)?.isActive) {
                        newAreaInfo[indexArr[0]].elements[indexArr[1]].files = newAreaInfo[indexArr[0]].elements[
                            indexArr[1]
                        ].files.map((item) => ({...item, isActive: false}))
                        setActiveFile(element)
                    }
                    // 新增拖拽项
                    newAreaInfo[indexArr[0]].elements[indexArr[1]].files.splice(destination.index, 0, element)
                }
            }
            setAreaInfo(newAreaInfo)
        } catch (error) {}
    })

    const getTabsId = useMemoizedFn((row, col) => {
        try {
            return areaInfo[row].elements[col].id
        } catch (error) {
            return `${row}*${col}`
        }
    })

    // 布局处理
    const onChangeArea = useMemoizedFn(() => {
        if (areaInfo.length === 0) {
            return <YakRunnerWelcomePage addFileTab={addFileTab} setShowCompileModal={setShowCompileModal} />
        }
        return (
            <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
                <SplitView
                    isVertical={true}
                    isLastHidden={areaInfo.length === 1}
                    elements={[
                        {
                            element: (
                                <SplitView
                                    isLastHidden={areaInfo.length > 0 && areaInfo[0].elements.length === 1}
                                    elements={[
                                        {element: <RunnerTabs tabsId={getTabsId(0, 0)} />},
                                        {element: <RunnerTabs tabsId={getTabsId(0, 1)} />}
                                    ]}
                                />
                            )
                        },
                        {
                            element: (
                                <SplitView
                                    isLastHidden={areaInfo.length > 1 && areaInfo[1].elements.length === 1}
                                    elements={[
                                        {
                                            element: (
                                                <RunnerTabs
                                                    wrapperClassName={styles["runner-tabs-top"]}
                                                    tabsId={getTabsId(1, 0)}
                                                />
                                            )
                                        },
                                        {
                                            element: (
                                                <RunnerTabs
                                                    wrapperClassName={styles["runner-tabs-top"]}
                                                    tabsId={getTabsId(1, 1)}
                                                />
                                            )
                                        }
                                    ]}
                                />
                            )
                        }
                    ]}
                />
            </DragDropContext>
        )
    })

    useEffect(() => {
        // 执行结束
        ipcRenderer.on("client-yak-end", () => {
            setRunnerTabsId(undefined)
        })
        return () => {
            ipcRenderer.removeAllListeners("client-yak-end")
        }
    }, [])

    // initDefault是否加载表单默认值
    const onOpenAuditModalFun = useMemoizedFn((initDefault?: string) => {
        if (initDefault) {
            setInitDefault(true)
        }
        setShowCompileModal(true)
    })

    useEffect(() => {
        // 打开编译文件Modal
        emiter.on("onOpenAuditModal", onOpenAuditModalFun)
        return () => {
            emiter.off("onOpenAuditModal", onOpenAuditModalFun)
        }
    }, [])

    const onCloseCompileModal = useMemoizedFn(() => {
        setInitDefault(false)
        setShowCompileModal(false)
    })

    const [auditRightParams, setAuditRightParams] = useState<AuditEmiterYakUrlProps>()
    const onOpenAuditRightDetailFun = useMemoizedFn((value: string) => {
        try {
            const data: AuditEmiterYakUrlProps = JSON.parse(value)
            setAuditRightParams(data)
            setShowAuditDetail(true)
            emiter.emit("onRefreshAuditDetail")
        } catch (error) {}
    })

    useEffect(() => {
        // 打开编译右侧详情
        emiter.on("onOpenAuditRightDetail", onOpenAuditRightDetailFun)
        return () => {
            emiter.off("onOpenAuditRightDetail", onOpenAuditRightDetailFun)
        }
    }, [])

    const tokenRef = useRef<string>(randomString(40))
    /** 是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => {
                setIsExecuting(false)
            }, 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })
    // export-show
    const [exportStreamData, setExportStreamData] = useState<AuditCodeStreamData>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<StreamResult.Log[]>([])
    useEffect(() => {
        const progress = Math.floor((streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100) / 100
        // 当任务结束时 跳转打开编译列表
        if (progress === 1) {
            setTimeout(() => {
                logInfoRef.current = []
                setShowRunAuditModal(false)
                onOpenAuditTreeFun(`${projectNmae}`)
                emiter.emit("onRefreshAduitHistory")
            }, 300)
        }

        logInfoRef.current = streamInfo.logState.slice(0, 8)

        setExportStreamData({
            ...exportStreamData,
            Progress: progress
        })
    }, [streamInfo])
    // 执行审计
    const onStartAudit = useMemoizedFn((path: string, requestParams: DebugPluginRequest) => {
        debugPluginStreamEvent.reset()
        setRuntimeId("")
        setProjectNmae(path)
        apiDebugPlugin({params: requestParams, token: tokenRef.current}).then(() => {
            setIsExecuting(true)
            setShowCompileModal(false)
            setShowRunAuditModal(true)
            debugPluginStreamEvent.start()
        })
    })

    const onCancelAudit = () => {
        logInfoRef.current = []
        setShowRunAuditModal(false)
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
    }

    // 清除代码审计树残留数据
    const onResetAuditStatusFun = useMemoizedFn(async () => {
        clearMapAuditChildDetail()
        clearMapAuditDetail()
        setShowAuditDetail(false)
        // 移除已显示的审计树代码
        const auditPaths = await judgeAreaExistAuditPath(areaInfo)
        const newAreaInfo = removeAreaFilesInfo(areaInfo, auditPaths)
        setAreaInfo(newAreaInfo)
    })

    // 监听与初始重置审计树残留数据
    useEffect(() => {
        onResetAuditStatusFun()
        // 监听新建文件
        emiter.on("onResetAuditStatus", onResetAuditStatusFun)
        return () => {
            emiter.off("onResetAuditStatus", onResetAuditStatusFun)
        }
    }, [])

    const waterMarkStr = useMemo(() => {
        if (isCommunityEdition() && loadTreeType === "audit") {
            return "Yakit技术浏览版仅供技术交流使用"
        }
        return " "
    }, [loadTreeType])

    return (
        <WaterMark content={waterMarkStr} style={{overflow: "hidden", height: "100%"}}>
            <YakRunnerContext.Provider value={{store, dispatcher}}>
                <div className={styles["yak-runner"]} ref={keyDownRef} tabIndex={0} id='yakit-runnner-main-box-id'>
                    <div className={styles["yak-runner-body"]}>
                        <YakitResizeBox
                            freeze={!isUnShow}
                            firstRatio={isUnShow ? "25px" : "300px"}
                            firstNodeStyle={isUnShow ? {padding: 0, maxWidth: 25} : {padding: 0}}
                            lineDirection='right'
                            firstMinSize={isUnShow ? 25 : 200}
                            lineStyle={{width: 4}}
                            secondMinSize={480}
                            firstNode={
                                <LeftSideBar
                                    addFileTab={addFileTab}
                                    isUnShow={isUnShow}
                                    setUnShow={setUnShow}
                                    active={active}
                                    setActive={setActive}
                                />
                            }
                            secondNodeStyle={
                                isUnShow ? {padding: 0, minWidth: "calc(100% - 25px)"} : {overflow: "unset", padding: 0}
                            }
                            secondNode={
                                <YakitResizeBox
                                    freeze={isShowAuditDetail}
                                    secondRatio={!isShowAuditDetail ? "0px" : "300px"}
                                    lineDirection='left'
                                    firstMinSize={300}
                                    lineStyle={{width: 4}}
                                    firstNodeStyle={!isShowAuditDetail ? {padding: 0, minWidth: "100%"} : {padding: 0}}
                                    secondNodeStyle={
                                        !isShowAuditDetail
                                            ? {padding: 0, maxWidth: 0, minWidth: 0}
                                            : {overflow: "unset", padding: 0}
                                    }
                                    firstNode={
                                        <div
                                            className={classNames(styles["yak-runner-code"], {
                                                [styles["yak-runner-code-offset"]]: !isUnShow
                                            })}
                                        >
                                            <div className={styles["code-container"]}>
                                                {onFixedEditorDetails(onChangeArea())}
                                            </div>
                                        </div>
                                    }
                                    secondNode={
                                        <RightAuditDetail
                                            auditRightParams={auditRightParams}
                                            isShowAuditDetail={isShowAuditDetail}
                                            setShowAuditDetail={setShowAuditDetail}
                                        />
                                    }
                                />
                            }
                        />
                    </div>

                    <BottomSideBar onOpenEditorDetails={onOpenEditorDetails} />
                </div>
                {/* 文件过大提示框 */}
                <YakitHint
                    visible={isShowFileHint}
                    title='文件警告'
                    content='文件过大，无法使用YakRunner进行操作'
                    cancelButtonProps={{style: {display: "none"}}}
                    onOk={() => {
                        setShowFileHint(false)
                    }}
                    okButtonText={"知道了"}
                />
                {/* 编译项目弹窗 */}
                {isShowCompileModal && (
                    <YakitModal
                        visible={isShowCompileModal}
                        bodyStyle={{padding: 0}}
                        title={"编译项目"}
                        footer={null}
                        onCancel={onCloseCompileModal}
                        maskClosable={false}
                    >
                        <AuditModalForm
                            isInitDefault={isInitDefault}
                            onCancle={onCloseCompileModal}
                            isExecuting={isExecuting}
                            onStartAudit={onStartAudit}
                        />
                    </YakitModal>
                )}
                {/* 编译项目进度条弹窗 */}
                <YakitModal
                    centered
                    getContainer={document.getElementById("new-payload") || document.body}
                    visible={isShowRunAuditModal}
                    title={null}
                    footer={null}
                    width={520}
                    type='white'
                    closable={false}
                    hiddenHeader={true}
                    bodyStyle={{padding: 0}}
                >
                    <AuditCodeStatusInfo
                        title={"项目编译中..."}
                        streamData={exportStreamData}
                        cancelRun={() => {
                            onCancelAudit()
                        }}
                        logInfo={logInfoRef.current}
                        showDownloadDetail={false}
                    />
                </YakitModal>
            </YakRunnerContext.Provider>
        </WaterMark>
    )
}

// 代码审计进度信息
export const AuditCodeStatusInfo: React.FC<AuditCodeStatusInfoProps> = (props) => {
    const {title, streamData, logInfo, cancelRun, onClose, showDownloadDetail = true, autoClose} = props
    useEffect(() => {
        if (autoClose && streamData.Progress === 1) {
            onClose && onClose()
        }
    }, [autoClose, streamData.Progress])

    return (
        <div className={styles["audit-code-status-info"]}>
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
                        <div className={styles["progress-title"]}>进度 {Math.round(streamData.Progress * 100)}%</div>
                    </div>
                    {showDownloadDetail && (
                        <div className={styles["download-info-wrapper"]}>
                            <div>耗时 : {streamData.CostDurationVerbose}</div>
                        </div>
                    )}
                    <div className={styles["log-info"]}>
                        {logInfo.map((item) => {
                            if (item.level === "error") {
                                return (
                                    <div key={item.data} className={styles["log-item-error"]}>
                                        {item.data}
                                    </div>
                                )
                            }
                            if (item.level === "text") {
                                return (
                                    <div key={item.data} className={styles["log-item-text"]}>
                                        {item.data}
                                    </div>
                                )
                            }
                            return (
                                <div key={item.data} className={styles["log-item"]}>
                                    {item.data}
                                </div>
                            )
                        })}
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
