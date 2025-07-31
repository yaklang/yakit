import React, {useEffect, useMemo, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./YakJavaDecompiler.module.scss"
import {failed, success, warn, info, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {FileNodeMapProps, FileTreeListProps} from "./FileTree/FileTreeType"
import {AreaInfoProps, OpenFileByPathProps, YakJavaDecompilerHistoryProps} from "./YakJavaDecompilerType"
import {FileDetailInfo} from "./RunnerTabs/RunnerTabsType"
import YakRunnerContext, {YakRunnerContextDispatcher, YakRunnerContextStore} from "./hooks/YakRunnerContext"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {LeftSideBar} from "./LeftSideBar/LeftSideBar"
import {SplitView} from "../yakRunner/SplitView/SplitView"
import {DragDropContext, DropResult, ResponderProvided} from "@hello-pangea/dnd"
import cloneDeep from "lodash/cloneDeep"
import {BottomSideBar} from "./BottomSideBar/BottomSideBar"
import {BottomEditorDetails} from "./BottomEditorDetails/BottomEditorDetails"
import {ShowItemType} from "./BottomEditorDetails/BottomEditorDetailsType"
import {LeftSideType} from "./LeftSideBar/LeftSideBarType"
import {RunnerTabs, YakJavaDecompilerWelcomePage} from "./RunnerTabs/RunnerTabs"
import emiter from "@/utils/eventBus/eventBus"
import {clearMapFileDetail, getMapAllFileKey, getMapFileDetail, setMapFileDetail} from "./FileTreeMap/FileMap"
import {clearMapFolderDetail, getMapFolderDetail, hasMapFolderDetail, setMapFolderDetail} from "./FileTreeMap/ChildMap"
import {
    addAreaFileInfo,
    getCodeByPath,
    getNameByPath,
    grpcFetchFileTree,
    judgeAreaExistFilePath,
    setAreaFileActive,
    setYakRunnerHistory,
    updateAreaFileInfo
} from "./utils"
import {FileDefault, FileSuffix, FolderDefault} from "../yakRunner/FileTree/icon"
import moment from "moment"
import {YakURLResource} from "../yakURLTree/data"
import { monacaLanguageType } from "../yakRunner/utils"
const {ipcRenderer} = window.require("electron")
export interface YakJavaDecompilerProps {}
export const YakJavaDecompiler: React.FC<YakJavaDecompilerProps> = (props) => {
    /** ---------- 文件树 ---------- */
    const [fileTree, setFileTree] = useState<FileTreeListProps[]>([])
    const [projectName, setProjectName,getProjectName] = useGetState<string>()
    const [areaInfo, setAreaInfo] = useState<AreaInfoProps[]>([])
    const [activeFile, setActiveFile] = useState<FileDetailInfo>()
    const [runnerTabsId, setRunnerTabsId] = useState<string>()

    const [isUnShow, setUnShow] = useState<boolean>(false)
    const [active, setActive] = useGetState<LeftSideType>("file-tree")

    const handleFetchFileList = useMemoizedFn((path, callback: (value: FileNodeMapProps[]) => any) => {
        const rootPath = getProjectName()
        if(!rootPath) {
            callback([])
            return
        }
        grpcFetchFileTree({
            jarPath:rootPath,
            innerPath:path
        })
            .then((res) => {
                callback(res)
            })
            .catch((error) => {
                yakitNotify("error", `获取文件项目失败: ${error}`)
                callback([])
            })
    })

    // 加载下一层
    const handleFileLoadData = useMemoizedFn((path: string) => {
        return new Promise((resolve, reject) => {
            // 校验其子项是否存在
            const childArr = getMapFolderDetail(path)
            if (childArr.length > 0) {
                emiter.emit("onDecompilerRefreshFileTree")
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
                            emiter.emit("onDecompilerRefreshFileTree")
                            resolve("")
                        }, 300)
                    } else {
                        reject()
                    }
                })
            }
        })
    })

    const store: YakRunnerContextStore = useMemo(() => {
        return {
            fileTree: fileTree,
            projectName: projectName,
            areaInfo: areaInfo,
            activeFile: activeFile,
            runnerTabsId: runnerTabsId
        }
    }, [fileTree, projectName, areaInfo, activeFile, runnerTabsId])

    const dispatcher: YakRunnerContextDispatcher = useMemo(() => {
        return {
            setFileTree: setFileTree,
            setProjectName: setProjectName,
            handleFileLoadData: handleFileLoadData,
            setAreaInfo: setAreaInfo,
            setActiveFile: setActiveFile,
            setRunnerTabsId: setRunnerTabsId
        }
    }, [])

    // 轮询下标
    const loadIndexRef = useRef<number>(0)
    // 接口是否运行中
    const isFetchRef = useRef<boolean>(false)

    const clearMap = useMemoizedFn(() => {
        clearMapFileDetail()
        clearMapFolderDetail()
    })

    // 提前注入Map
    const insertFileMap = useMemoizedFn((path) => {
        isFetchRef.current = true
        loadIndexRef.current += 1

        handleFetchFileList(path, (value) => {
            isFetchRef.current = false
            if (value.length > 0) {
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
        if (!projectName) return
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
        isFirst && emiter.emit("onResetDecompilerFileTree")
    })

    const onInitTreeFun = useMemoizedFn(async (rootPath: string, isFirst: boolean = true) => {
        // console.log("onOpenFileTreeFun", rootPath)
        const lastFolder = await getNameByPath(rootPath)
        setProjectName(rootPath)
        if (rootPath.length > 0 && lastFolder.length > 0) {
            resetMap(isFirst)
            const node: FileNodeMapProps = {
                parent: null,
                name: lastFolder,
                path: rootPath,
                isFolder: true,
                icon: FolderDefault
            }

            handleFetchFileList("/", (list) => {
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
                if (list) setFileTree(childArr.map((path) => ({path})))
            })

            // 打开文件夹时接入历史记录
            const history: YakJavaDecompilerHistoryProps = {
                isFile: false,
                name: lastFolder,
                path: rootPath
            }
            setYakRunnerHistory(history)
        }
    })

    // 加载文件树(初次加载)
    const onOpenDecompilerTreeFun = useMemoizedFn(async (absolutePath: string) => {
        onInitTreeFun(absolutePath)
    })

    // 刷新文件/审计树
    const onDecompilerRefreshTreeFun = useMemoizedFn(() => {
        if (projectName) {
            onInitTreeFun(projectName, false)
        }
    })

    const onOpenDecompilerFileByPathFun = useMemoizedFn(async (res) => {
        try {
            const {params, isHistory} = JSON.parse(res) as OpenFileByPathProps
            const {path, name, parent, highLightRange, data} = params
            if (!data) {
                warn("数据缺失")
                return
            }
            const resource = data as YakURLResource
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
                // 根据文件类型决定加载方式
                const classPath = resource.Path
                const innerClassList: string[] = []
                resource.Extra.forEach((kv) => {
                    if (kv.Key === "innerClass") {
                        innerClassList.push(kv.Value)
                    }
                })
                const code = await getCodeByPath(
                    `javadec:///class-aifix?class=${classPath}&jar=${projectName}&innerClasses=${innerClassList.join(
                        ","
                    )}`
                )
                const suffix = name.indexOf(".") > -1 ? name.split(".").pop() : ""
                const scratchFile: FileDetailInfo = {
                    name,
                    code,
                    icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                    isActive: true,
                    openTimestamp: moment().unix(),
                    isPlainText: true,
                    // 此处赋值 path 用于拖拽 分割布局等UI标识符操作
                    path,
                    parent: parent || null,
                    language: monacaLanguageType(suffix),
                    highLightRange
                }
                const {newAreaInfo, newActiveFile} = addAreaFileInfo(areaInfo, scratchFile, activeFile)
                setAreaInfo && setAreaInfo(newAreaInfo)
                setActiveFile && setActiveFile(newActiveFile)

                if (isHistory) {
                    // 创建文件时接入历史记录
                    const history: YakJavaDecompilerHistoryProps = {
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

    const onCloseDecompilerTreeFun = useMemoizedFn(()=>{
        setProjectName(undefined)
        setFileTree([])
        setAreaInfo([])
        resetMap(true)
    })

    useEffect(() => {
        // 监听反编译树打开
        emiter.on("onOpenDecompilerTree", onOpenDecompilerTreeFun)
        // 监听反编译树关闭
        emiter.on("onCloseDecompilerTree", onCloseDecompilerTreeFun)
        // 刷新树(重置)
        emiter.on("onRefreshDecompilerTree", onDecompilerRefreshTreeFun)
        // 通过路径打开文件
        emiter.on("onOpenDecompilerFileByPath", onOpenDecompilerFileByPathFun)
        
        return () => {
            emiter.off("onOpenDecompilerTree", onOpenDecompilerTreeFun)
            emiter.off("onCloseDecompilerTree", onCloseDecompilerTreeFun)
            emiter.off("onRefreshDecompilerTree", onDecompilerRefreshTreeFun)
            emiter.off("onOpenDecompilerFileByPath", onOpenDecompilerFileByPathFun)
        }
    }, [])

    const [isShowEditorDetails, setEditorDetails] = useState<boolean>(false)
    // 当前展示项
    const [showItem, setShowItem] = useState<ShowItemType>("ruleEditor")

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
            return <YakJavaDecompilerWelcomePage />
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

    return (
        <YakRunnerContext.Provider value={{store, dispatcher}}>
            <div className={styles["yak-java-decompiler"]} tabIndex={0} id='yakit-decompiler-main-box-id'>
                <div className={styles["yak-java-decompiler-body"]}>
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
                                className={classNames(styles["yak-java-decompiler-code"], {
                                    [styles["yak-java-decompiler-code-offset"]]: !isUnShow
                                })}
                            >
                                <div className={styles["code-container"]}>{onFixedEditorDetails(onChangeArea())}</div>
                            </div>
                        }
                    />
                </div>

                <BottomSideBar onOpenEditorDetails={onOpenEditorDetails} />
            </div>
        </YakRunnerContext.Provider>
    )
}
