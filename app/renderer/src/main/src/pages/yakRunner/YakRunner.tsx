import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    useDebounceEffect,
    useGetState,
    useInViewport,
    useMemoizedFn,
    useThrottleEffect,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
import {LeftSideBar} from "./LeftSideBar/LeftSideBar"
import {BottomSideBar} from "./BottomSideBar/BottomSideBar"
import {FileNodeMapProps, FileNodeProps, FileTreeListProps, FileTreeNodeProps} from "./FileTree/FileTreeType"
import {
    addAreaFileInfo,
    excludeAreaInfoCode,
    getCodeByPath,
    getCodeSizeByPath,
    getNameByPath,
    getPathParent,
    getYakRunnerLastAreaFile,
    getYakRunnerLastFolderExpanded,
    grpcFetchCreateFile,
    grpcFetchFileTree,
    judgeAreaExistFilePath,
    judgeAreaExistFileUnSave,
    MAX_FILE_SIZE_BYTES,
    monacaLanguageType,
    removeYakRunnerAreaFileInfo,
    setAreaFileActive,
    setYakRunnerHistory,
    setYakRunnerLastAreaFile,
    setYakRunnerLastFolderExpanded,
    updateAreaFileInfo
} from "./utils"
import {
    AreaInfoProps,
    AuditCodeStatusInfoProps,
    OpenFileByPathProps,
    YakRunnerHistoryProps,
    YakRunnerProps
} from "./YakRunnerType"
import {failed, success, yakitNotify} from "@/utils/notification"
import YakRunnerContext, {YakRunnerContextDispatcher, YakRunnerContextStore} from "./hooks/YakRunnerContext"
import {FileDefault, FileSuffix, FolderDefault} from "./FileTree/icon"
import {RunnerTabs, YakRunnerWelcomePage} from "./RunnerTabs/RunnerTabs"

import {DragDropContext, ResponderProvided, DropResult} from "@hello-pangea/dnd"

import classNames from "classnames"
import styles from "./YakRunner.module.scss"
import {SplitView} from "./SplitView/SplitView"
import {BottomEditorDetails} from "./BottomEditorDetails/BottomEditorDetails"
import {ShowItemType} from "./BottomEditorDetails/BottomEditorDetailsType"
import {FileDetailInfo} from "./RunnerTabs/RunnerTabsType"
import cloneDeep from "lodash/cloneDeep"
import {v4 as uuidv4} from "uuid"
import moment from "moment"
import {keySortHandle} from "@/components/yakitUI/YakitEditor/editorUtils"
import emiter from "@/utils/eventBus/eventBus"
import {clearMapFileDetail, getMapAllFileKey, getMapFileDetail, setMapFileDetail} from "./FileTreeMap/FileMap"
import {clearMapFolderDetail, getMapFolderDetail, hasMapFolderDetail, setMapFolderDetail} from "./FileTreeMap/ChildMap"
import {sendDuplexConn} from "@/utils/duplex/duplex"
import {StringToUint8Array} from "@/utils/str"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {LeftSideType} from "./LeftSideBar/LeftSideBarType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Progress} from "antd"
import {SolidDocumentdownloadIcon} from "@/assets/icon/solid"
import {YakitRoute} from "@/enums/yakitRoute"
import {ShortcutKeyPage} from "@/utils/globalShortcutKey/events/pageMaps"
import {registerShortcutKeyHandle, unregisterShortcutKeyHandle} from "@/utils/globalShortcutKey/utils"
import {getStorageYakRunnerShortcutKeyEvents} from "@/utils/globalShortcutKey/events/page/yakRunner"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"
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
    const [areaInfo, setAreaInfo] = useState<AreaInfoProps[]>([])
    const [activeFile, setActiveFile] = useState<FileDetailInfo>()
    const [runnerTabsId, setRunnerTabsId] = useState<string>()
    const [isShowFileHint, setShowFileHint] = useState<boolean>(false)

    const handleFetchFileList = useMemoizedFn((path: string, callback?: (value: FileNodeMapProps[]) => any) => {
        if (getMapFileDetail(path).isCreate) {
            if (callback) callback([])
            return
        }
        grpcFetchFileTree(path)
            .then((res) => {
                // console.log("文件树", res)
                if (callback) callback(res)
            })
            .catch((error) => {
                yakitNotify("error", `获取文件项目失败: ${error}`)
                if (callback) callback([])
            })
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
        isFirst && emiter.emit("onResetFileTree", JSON.stringify({reset: false}))
    })

    const startMonitorFolder = useMemoizedFn((absolutePath) => {
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

    const onInitTreeFun = useMemoizedFn(async (rootPath: string, isFirst: boolean = true) => {
        try {
            // 开启文件夹监听
            startMonitorFolder(rootPath)
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
                    path: rootPath
                }
                setYakRunnerHistory(history)
            }
        } catch (error) {}
    })

    // 加载文件树(初次加载)
    const onOpenFileTreeFun = useMemoizedFn(async (absolutePath: string) => {
        // console.log("文件树---", absolutePath)
        onInitTreeFun(absolutePath)
    })

    // 刷新文件/审计树
    const onRefreshTreeFun = useMemoizedFn(() => {
        if (fileTree.length > 0) {
            const ProjectPath = fileTree[0].path
            onInitTreeFun(ProjectPath, false)
        }
    })

    // 是否正在读取中
    const isReadingRef = useRef<boolean>(false)
    const onOpenFileByPathFun = useMemoizedFn(async (data) => {
        try {
            const {params, isHistory} = JSON.parse(data) as OpenFileByPathProps
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
                const {size, isPlainText} = await getCodeSizeByPath(path)
                if (size > MAX_FILE_SIZE_BYTES) {
                    setShowFileHint(true)
                    return
                }
                // 取消上一次请求
                if (isReadingRef.current) {
                    ipcRenderer.invoke("cancel-ReadFile")
                }
                isReadingRef.current = true
                const code = await getCodeByPath(path)
                isReadingRef.current = false
                const suffix = name.indexOf(".") > -1 ? name.split(".").pop() : ""
                const scratchFile: FileDetailInfo = {
                    name,
                    code,
                    icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                    isActive: true,
                    openTimestamp: moment().unix(),
                    isPlainText,
                    // 此处赋值 path 用于拖拽 分割布局等UI标识符操作
                    path,
                    parent: parent || null,
                    language: monacaLanguageType(suffix),
                    highLightRange
                }
                // (性能优化 为了快速打开文件 在文件打开时不注入语法检测 再文件打开后再注入语法检测)
                // const syntaxActiveFile = {...(await getDefaultActiveFile(scratchFile))}
                const {newAreaInfo, newActiveFile} = addAreaFileInfo(areaInfo, scratchFile, activeFile)
                setAreaInfo(newAreaInfo)
                setActiveFile(newActiveFile)

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

    const onGetCodeByPathCacheFun = useMemoizedFn(async (data) => {
        try {
            const {params} = JSON.parse(data) as OpenFileByPathProps
            const {path, name} = params
            // 校验是否已存在 如若存在则赋予其code
            const file = await judgeAreaExistFilePath(areaInfo, path)
            if (file) {
                const {size, isPlainText} = await getCodeSizeByPath(path)
                if (size > MAX_FILE_SIZE_BYTES) {
                    !isShowFileHint && setShowFileHint(true)
                    // 如若历史文件过大 则移除展示的文件
                    if (activeFile) {
                        const {newAreaInfo, newActiveFile} = removeYakRunnerAreaFileInfo(areaInfo, activeFile)
                        setAreaInfo && setAreaInfo(newAreaInfo)
                        setActiveFile && setActiveFile(newActiveFile)
                    }
                    return
                }
                // 取消上一次请求
                if (isReadingRef.current) {
                    ipcRenderer.invoke("cancel-ReadFile")
                }
                isReadingRef.current = true
                const code = await getCodeByPath(path)
                isReadingRef.current = false
                const suffix = name.indexOf(".") > -1 ? name.split(".").pop() : ""
                const newAreaInfo = updateAreaFileInfo(
                    areaInfo,
                    {
                        code,
                        icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                        openTimestamp: moment().unix(),
                        isPlainText,
                        language: monacaLanguageType(suffix)
                    },
                    path
                )
                setAreaInfo(newAreaInfo)
                setActiveFile(
                    activeFile
                        ? {
                              ...activeFile,
                              icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                              openTimestamp: moment().unix(),
                              isPlainText,
                              language: monacaLanguageType(suffix)
                          }
                        : activeFile
                )
            }
        } catch (error) {
            failed(`error: ${error}`)
        }
    })

    const onCloseYakRunnerFun = useMemoizedFn(async () => {
        try {
            if (areaInfo.length === 0) {
                emiter.emit("closePage", JSON.stringify({route: YakitRoute.YakScript}))
                return
            }
            if (activeFile?.isUnSave) {
                emiter.emit("onCloseFile", activeFile.path)
                return
            }
            const unSaveArr = await judgeAreaExistFileUnSave(areaInfo)
            if (unSaveArr.length > 0) {
                emiter.emit("onCloseFile", unSaveArr[0])
            } else {
                emiter.emit("closePage", JSON.stringify({route: YakitRoute.YakScript}))
            }
        } catch (error) {
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.YakScript}))
        }
    })

    useEffect(() => {
        // 监听文件树打开
        emiter.on("onOpenFileTree", onOpenFileTreeFun)
        // 刷新树
        emiter.on("onRefreshTree", onRefreshTreeFun)
        // 通过路径打开文件
        emiter.on("onOpenFileByPath", onOpenFileByPathFun)
        // 通过缓存文件路径读取文件内容
        emiter.on("onGetCodeByPathCache", onGetCodeByPathCacheFun)
        // 监听一级页面关闭事件
        emiter.on("onCloseYakRunner", onCloseYakRunnerFun)
        return () => {
            emiter.off("onOpenFileTree", onOpenFileTreeFun)
            emiter.off("onRefreshTree", onRefreshTreeFun)
            emiter.off("onOpenFileByPath", onOpenFileByPathFun)
            emiter.off("onGetCodeByPathCache", onGetCodeByPathCacheFun)
            emiter.off("onCloseYakRunner", onCloseYakRunnerFun)
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

    // 根据历史读取上次打开的文件夹
    const onGetYakRunnerLastFolderExpanded = useMemoizedFn(async () => {
        try {
            const historyData = await getYakRunnerLastFolderExpanded()
            if (historyData?.folderPath) {
                onOpenFileTreeFun(historyData.folderPath)
                setUnShow(false)
            }
            emiter.emit("onDefaultExpanded", JSON.stringify(historyData?.expandedKeys || []))
        } catch (error) {}
    })

    // 获取上次打开的展示分布及文件历史
    const onGetYakRunnerLastAreaFile = useMemoizedFn(async () => {
        try {
            const historyData = await getYakRunnerLastAreaFile()
            if (historyData?.activeFile && historyData.areaInfo) {
                setActiveFile(historyData.activeFile)
                setAreaInfo(historyData.areaInfo)
                setUnShow(false)
            }
        } catch (error) {}
    })

    useEffect(() => {
        onGetYakRunnerLastFolderExpanded()
        onGetYakRunnerLastAreaFile()
    }, [])

    const onSaveYakRunnerLastFolder = useMemoizedFn(async (newPath) => {
        try {
            const historyData = await getYakRunnerLastFolderExpanded()
            const folderPath = historyData?.folderPath || ""
            if (folderPath.length === 0) {
                setYakRunnerLastFolderExpanded({
                    folderPath: newPath,
                    expandedKeys: []
                })
            }

            if (folderPath.length > 0 && folderPath !== newPath) {
                setYakRunnerLastFolderExpanded({
                    folderPath: newPath,
                    expandedKeys: []
                })
                // FileTree缓存清除
                emiter.emit("onResetFileTree", JSON.stringify({reset: true}))
            }
        } catch (error) {}
    })

    useUpdateEffect(() => {
        if (fileTree.length > 0) {
            onSaveYakRunnerLastFolder(fileTree[0].path)
            setUnShow(false)
        } else {
            setYakRunnerLastFolderExpanded({
                folderPath: "",
                expandedKeys: []
            })
        }
    }, [fileTree])

    useDebounceEffect(
        () => {
            // 由于更改分布信息时activeFile也会改变 因此两者埋点合并
            let newAreaInfo = excludeAreaInfoCode(areaInfo)
            let newActiveFile: FileDetailInfo | undefined = undefined
            if (activeFile) {
                newActiveFile = cloneDeep(activeFile)
                if (!newActiveFile.isUnSave) {
                    delete newActiveFile.code
                }
            }
            setYakRunnerLastAreaFile(newAreaInfo, newActiveFile)
        },
        [activeFile?.path],
        {wait: 300}
    )

    const store: YakRunnerContextStore = useMemo(() => {
        return {
            fileTree: fileTree,
            areaInfo: areaInfo,
            activeFile: activeFile,
            runnerTabsId: runnerTabsId
        }
    }, [fileTree, areaInfo, activeFile, runnerTabsId])

    const dispatcher: YakRunnerContextDispatcher = useMemo(() => {
        return {
            setFileTree: setFileTree,
            handleFileLoadData: handleFileLoadData,
            setAreaInfo: setAreaInfo,
            setActiveFile: setActiveFile,
            setRunnerTabsId: setRunnerTabsId
        }
    }, [])

    const shortcutRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(shortcutRef)
    const unTitleCountRef = useRef<number>(1)

    const addFileTab = useThrottleFn(
        (e?: any, params?: {name: string; code: string}) => {
            // 新建临时文件
            const scratchFile: FileDetailInfo = {
                name: `Untitle-${unTitleCountRef.current}.yak`,
                code: params?.code || "# input your yak code\nprintln(`Hello Yak World!`)",
                icon: "_f_yak",
                isActive: true,
                openTimestamp: moment().unix(),
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
            if (activeFile && activeFile.isUnSave && activeFile.code && activeFile.code.length > 0) {
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
                                arr = await grpcFetchFileTree(parentPath)
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
                                const removeAreaInfo = removeYakRunnerAreaFileInfo(areaInfo, file).newAreaInfo
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
    const ctrl_w = useMemoizedFn(() => {
        if (activeFile && areaInfo.length > 0) {
            emiter.emit("onCloseFile", activeFile.path)
        } else {
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.YakScript}))
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

    useEffect(() => {
        if (inViewport) {
            registerShortcutKeyHandle(ShortcutKeyPage.YakRunner)
            getStorageYakRunnerShortcutKeyEvents()
            return () => {
                unregisterShortcutKeyHandle(ShortcutKeyPage.YakRunner)
            }
        }
    }, [inViewport])

    useShortcutKeyTrigger("create*yakRunner", () => {
        // 新建临时文件
        addFileTab()
    })

    useShortcutKeyTrigger("save*yakRunner", () => {
        // 保存
        ctrl_s()
    })

    useShortcutKeyTrigger("close*yakRunner", () => {
        // 关闭
        ctrl_w()
    })

    useShortcutKeyTrigger("openTermina*yakRunner", () => {
        // 打开终端
        onOpenTermina()
    })

    useShortcutKeyTrigger("rename*yakRunner", () => {
        // 文件树相关快捷键只在文件树控件展示时生效
        if (getActive() !== "file-tree") return
        // 文件树重命名
        onTreeRename()
    })

    useShortcutKeyTrigger("delete*yakRunner", () => {
        // 文件树相关快捷键只在文件树控件展示时生效
        if (getActive() !== "file-tree") return
        // 文件树删除
        onTreeDelete()
    })

    useShortcutKeyTrigger("copy*yakRunner", () => {
        // 文件树相关快捷键只在文件树控件展示时生效
        if (getActive() !== "file-tree") return
        // 文件树复制
        onTreeCopy()
    })

    useShortcutKeyTrigger("paste*yakRunner", () => {
        // 文件树相关快捷键只在文件树控件展示时生效
        if (getActive() !== "file-tree") return
        // 文件树粘贴
        onTreePaste()
    })

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
            return <YakRunnerWelcomePage addFileTab={addFileTab} />
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

    useEffect(() => {
        // 调用打开临时文件
        ipcRenderer.on("fetch-send-to-yak-running", (e, res: any) => {
            const {name = "", code = ""} = res || {}
            if (!name || !code) return
            addFileTab(e, {name, code})
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-yak-running")
        }
    }, [])

    return (
        <YakRunnerContext.Provider value={{store, dispatcher}}>
            <div className={styles["yak-runner"]} ref={shortcutRef} tabIndex={0} id='yakit-runnner-main-box-id'>
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
                            <div
                                className={classNames(styles["yak-runner-code"], {
                                    [styles["yak-runner-code-offset"]]: !isUnShow
                                })}
                            >
                                <div className={styles["code-container"]}>{onFixedEditorDetails(onChangeArea())}</div>
                            </div>
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
        </YakRunnerContext.Provider>
    )
}
