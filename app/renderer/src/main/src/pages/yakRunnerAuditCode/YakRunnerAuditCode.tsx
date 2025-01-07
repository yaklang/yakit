import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    AreaInfoProps,
    AuditCodeStatusInfoProps,
    AuditCodeStreamData,
    AuditEmiterYakUrlProps,
    OpenFileByPathProps,
    YakRunnerAuditCodeProps,
    YakRunnerHistoryProps
} from "./YakRunnerAuditCodeType"
import {Divider, Progress, Tooltip} from "antd"
import {AuditModalForm, AuditModalFormModal} from "./AuditCode/AuditCode"
import {useMemoizedFn} from "ahooks"
import {
    addAreaFileInfo,
    getCodeByPath,
    getCodeSizeByPath,
    getNameByPath,
    grpcFetchAuditTree,
    judgeAreaExistAuditPath,
    judgeAreaExistFilePath,
    monacaLanguageType,
    removeAreaFilesInfo,
    setAreaFileActive,
    setYakRunnerHistory,
    updateAreaFileInfo
} from "./utils"
import styles from "./YakRunnerAuditCode.module.scss"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinCompileIcon} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SavePayloadProgress, UploadStatusInfo} from "../payloadManager/newPayload"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {failed, yakitNotify} from "@/utils/notification"
import {apiDebugPlugin, DebugPluginRequest} from "../plugins/utils"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import YakRunnerContext, {YakRunnerContextDispatcher, YakRunnerContextStore} from "./hooks/YakRunnerContext"
import {clearMapAuditChildDetail} from "./AuditCode/AuditTree/ChildMap"
import {clearMapAuditDetail} from "./AuditCode/AuditTree/AuditMap"
import {clearMapFileDetail, getMapAllFileKey, getMapFileDetail, setMapFileDetail} from "./FileTreeMap/FileMap"
import {clearMapFolderDetail, getMapFolderDetail, hasMapFolderDetail, setMapFolderDetail} from "./FileTreeMap/ChildMap"
import {FileDefault, FileSuffix, FolderDefault} from "../yakRunner/FileTree/icon"
import moment from "moment"
import {WaterMark} from "@ant-design/pro-layout"
import {isCommunityEdition} from "@/utils/envfile"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {JumpSourceDataProps, RightAuditDetail} from "./RightAuditDetail/RightAuditDetail"
import classNames from "classnames"
import {DragDropContext, DropResult, ResponderProvided} from "@hello-pangea/dnd"
import cloneDeep from "lodash/cloneDeep"
import {SplitView} from "../yakRunner/SplitView/SplitView"

import {LeftAudit} from "./LeftAudit/LeftAudit"
import {BottomEditorDetails} from "./BottomEditorDetails/BottomEditorDetails"
import {ShowItemType} from "./BottomEditorDetails/BottomEditorDetailsType"
import {AuditCodeWelcomePage, RunnerTabs} from "./RunnerTabs/RunnerTabs"
import {BottomSideBar} from "./BottomSideBar/BottomSideBar"
import {SolidDocumentdownloadIcon} from "@/assets/icon/solid"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AuditCodePageInfoProps} from "@/store/pageInfo"
import {FileDetailInfo} from "./RunnerTabs/RunnerTabsType"
import {FileNodeMapProps, FileTreeListProps} from "./FileTree/FileTreeType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
const {ipcRenderer} = window.require("electron")
export const YakRunnerAuditCode: React.FC<YakRunnerAuditCodeProps> = (props) => {
    const {auditCodePageInfo} = props
    // 页面数据
    const [pageInfo, setPageInfo] = useState<AuditCodePageInfoProps | undefined>(auditCodePageInfo)
    /** ---------- 文件树 ---------- */
    const [fileTree, setFileTree] = useState<FileTreeListProps[]>([])
    /** ---------- 审计树 ---------- */
    const [projectName, setProjectName] = useState<string | undefined>(auditCodePageInfo?.Location)
    const [areaInfo, setAreaInfo] = useState<AreaInfoProps[]>([])
    const [activeFile, setActiveFile] = useState<FileDetailInfo>()
    /** ---------- 审计规则 ---------- */
    const [auditRule, setAuditRule] = useState<string>("")
    /** ---------- 审计运行状态 ---------- */
    const [auditExecuting, setAuditExecuting] = useState<boolean>(false)

    const [isShowCompileModal, setShowCompileModal] = useState<boolean>(false)

    const [isShowModal, setShowModal] = useState<boolean>(false)
    const setAuditCodePageInfo = useMemoizedFn((auditCodePageInfo: string) => {
        try {
            if (auditExecuting) {
                setShowModal(true)
                return
            }
            const newPageInfo: AuditCodePageInfoProps = JSON.parse(auditCodePageInfo)
            setPageInfo(newPageInfo)
            setAuditRule("")
            const {Location} = newPageInfo
            setProjectName(Location)
            onInitTreeFun(`/${Location}`)
        } catch (error) {}
    })
    useEffect(() => {
        if (pageInfo) {
            onInitTreeFun(`/${pageInfo.Location}`)
        }
        emiter.on("onAuditCodePageInfo", setAuditCodePageInfo)
        return () => {
            emiter.off("onAuditCodePageInfo", setAuditCodePageInfo)
        }
    }, [])

    const onCloseCompileModal = useMemoizedFn(() => {
        setShowCompileModal(false)
    })

    const onInitTreeFun = useMemoizedFn(async (rootPath: string, isFirst: boolean = true) => {
        resetMap(isFirst)
        onResetAuditStatusFun()
        const lastFolder = await getNameByPath(rootPath)
        if (rootPath.length > 0 && lastFolder.length > 0) {
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
                loadTreeType: "audit"
            }
            setYakRunnerHistory(history)
        }
    })

    const [isShowAuditDetail, setShowAuditDetail] = useState<boolean>(false)

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

    const handleFetchFileList = useMemoizedFn((path: string, callback?: (value: FileNodeMapProps[]) => any) => {
        if (getMapFileDetail(path).isCreate) {
            if (callback) callback([])
            return
        }
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
    })

    // 轮询下标
    const loadIndexRef = useRef<number>(0)
    // 是否轮询预加载文件树
    const loadFileLoopRef = useRef<boolean>(false)
    // 接口是否运行中
    const isFetchRef = useRef<boolean>(false)
    // 当前文件树是否加载中
    const [fileTreeLoad, setFileTreeLoad] = useState<boolean>(false)

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
        const keys = getMapAllFileKey()
        const index = loadIndexRef.current
        if (keys.length === 0) return
        if (!keys[index]) {
            // 预加载完成
            loadFileLoopRef.current = false
            setFileTreeLoad(false)
            return
        }
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
            if (!loadFileLoopRef.current) return
            loadFileMap()
        }, 100)
        return () => clearInterval(id)
    }, [])

    // 重置Map与轮询
    const resetMap = useMemoizedFn((isFirst) => {
        loadIndexRef.current = 0
        loadFileLoopRef.current = true
        clearMap()
        setFileTreeLoad(true)
        // FileTree缓存清除
        isFirst && emiter.emit("onCodeAuditResetFileTree")
    })

    // 加载审计树(初次加载)
    const onOpenAuditTreeFun = useMemoizedFn(async (name: string) => {
        setPageInfo(undefined)
        setProjectName(name)
        onInitTreeFun(`/${name}`)
    })

    // 刷新审计树
    const onCodeAuditRefreshTreeFun = useMemoizedFn(() => {
        projectName && onInitTreeFun(`/${projectName}`, false)
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
                // 完全一样且存在widget数据 通知再次打开widget
                if(JSON.stringify(file) === JSON.stringify({...file, highLightRange}) && file.highLightRange?.source){
                    emiter.emit("onWidgetOpenAgain",file.path)
                }
            } else {
                // 如若为打开外部文件 则无需校验是否为审计树 直接按照文件树打开
                const fileSourceType = isOutside ? "file" : "audit"
                const {size, isPlainText} = await getCodeSizeByPath(path, fileSourceType)
                //  if (size > MAX_FILE_SIZE_BYTES) {
                //      setShowFileHint(true)
                //      return
                //  }
                // 取消上一次请求
                if (isReadingRef.current) {
                    ipcRenderer.invoke("cancel-ReadFile")
                }
                isReadingRef.current = true
                const code = await getCodeByPath(path, "audit")
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

    // 重置页面
    const onInitAuditCodePageFun = useMemoizedFn(() => {
        setPageInfo(undefined)
        setFileTree([])
        setProjectName(undefined)
        setAreaInfo([])
        setActiveFile(undefined)
        setAuditRule("")
    })

    useEffect(() => {
        // 监听审计树打开
        emiter.on("onCodeAuditOpenAuditTree", onOpenAuditTreeFun)
        // 刷新树
        emiter.on("onCodeAuditRefreshTree", onCodeAuditRefreshTreeFun)
        // 通过路径打开文件
        emiter.on("onCodeAuditOpenFileByPath", onOpenFileByPathFun)
        // 重置整个页面（暂时弃用）
        emiter.on("onInitAuditCodePage", onInitAuditCodePageFun)
        return () => {
            emiter.off("onCodeAuditOpenAuditTree", onOpenAuditTreeFun)
            emiter.off("onCodeAuditRefreshTree", onCodeAuditRefreshTreeFun)
            emiter.off("onCodeAuditOpenFileByPath", onOpenFileByPathFun)
            emiter.off("onInitAuditCodePage", onInitAuditCodePageFun)
        }
    }, [])

    const [isShowEditorDetails, setEditorDetails] = useState<boolean>(true)
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
            return <AuditCodeWelcomePage setShowCompileModal={setShowCompileModal} />
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

    // initDefault是否加载表单默认值
    const onOpenAuditModalFun = useMemoizedFn(() => {
        setShowCompileModal(true)
    })

    useEffect(() => {
        // 打开编译文件Modal
        emiter.on("onExecuteAuditModal", onOpenAuditModalFun)
        return () => {
            emiter.off("onExecuteAuditModal", onOpenAuditModalFun)
        }
    }, [])

    // 加载下一层
    const handleFileLoadData = useMemoizedFn((path: string) => {
        return new Promise((resolve, reject) => {
            // 校验其子项是否存在
            const childArr = getMapFolderDetail(path)
            if (childArr.length > 0) {
                emiter.emit("onCodeAuditRefreshFileTree")
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
                            emiter.emit("onCodeAuditRefreshFileTree")
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
            pageInfo: pageInfo,
            fileTree: fileTree,
            projectName: projectName,
            areaInfo: areaInfo,
            activeFile: activeFile,
            auditRule: auditRule,
            auditExecuting: auditExecuting
        }
    }, [pageInfo, fileTree, projectName, areaInfo, activeFile, auditRule, auditExecuting])

    const dispatcher: YakRunnerContextDispatcher = useMemo(() => {
        return {
            setPageInfo: setPageInfo,
            setFileTree: setFileTree,
            setProjectName: setProjectName,
            handleFileLoadData: handleFileLoadData,
            setAreaInfo: setAreaInfo,
            setActiveFile: setActiveFile,
            setAuditRule: setAuditRule,
            setAuditExecuting: setAuditExecuting
        }
    }, [])

    const [auditRightParams, setAuditRightParams] = useState<AuditEmiterYakUrlProps>()

    const onOpenAuditRightDetailFun = useMemoizedFn((value: string) => {
        try {
            const data: AuditEmiterYakUrlProps = JSON.parse(value)
            setAuditRightParams(data)
            setShowAuditDetail(true)
            setTimeout(() => {
                emiter.emit("onCodeAuditRefreshAuditDetail")
            }, 200)
        } catch (error) {}
    })

    const onWidgetOpenRightAuditFun = useMemoizedFn((value: string) => {
        try {
            const data: JumpSourceDataProps = JSON.parse(value)
            if (!isShowAuditDetail) {
                setAuditRightParams(data.auditRightParams)
                setShowAuditDetail(true)
            }
            setTimeout(() => {
                // 展开对应路径
                emiter.emit("onExpendRightPath", value)
                // 展开节点信息
                emiter.emit("onCodeAuditRefreshAuditDetail", data.node_id)
            }, 200)
        } catch (error) {}
    })

    useEffect(() => {
        // 正常打开编译右侧详情
        emiter.on("onCodeAuditOpenRightDetail", onOpenAuditRightDetailFun)
        // monaco查看详情 展开对应审计结果、审计过程
        emiter.on("onWidgetOpenRightAudit", onWidgetOpenRightAuditFun)
        return () => {
            emiter.off("onCodeAuditOpenRightDetail", onOpenAuditRightDetailFun)
            emiter.off("onWidgetOpenRightAudit", onWidgetOpenRightAuditFun)
        }
    }, [])

    const waterMarkStr = useMemo(() => {
        if (isCommunityEdition()) {
            return "Yakit技术浏览版仅供技术交流使用"
        }
        return " "
    }, [])

    const onSuccee = (path: string) => {
        onCloseCompileModal()
        setProjectName(path)
        onOpenAuditTreeFun(`${path}`)
        setPageInfo(undefined)
        emiter.emit("onCodeAuditRefreshAduitHistory")
    }

    return (
        <WaterMark content={waterMarkStr} style={{overflow: "hidden", height: "100%"}}>
            <YakRunnerContext.Provider value={{store, dispatcher}}>
                <div className={styles["audit-code"]} id='audit-code'>
                    <div className={styles["audit-code-page"]}>
                        <div className={styles["audit-code-body"]}>
                            <YakitResizeBox
                                // freeze={!isUnShow}
                                firstRatio={"300px"}
                                firstNodeStyle={{padding: 0}}
                                lineDirection='right'
                                firstMinSize={200}
                                lineStyle={{width: 4}}
                                secondMinSize={480}
                                firstNode={
                                    <LeftAudit fileTreeLoad={fileTreeLoad} onOpenEditorDetails={onOpenEditorDetails} />
                                }
                                secondNodeStyle={{overflow: "unset", padding: 0}}
                                secondNode={
                                    <YakitResizeBox
                                        freeze={isShowAuditDetail}
                                        secondRatio={!isShowAuditDetail ? "0px" : "300px"}
                                        lineDirection='left'
                                        firstMinSize={300}
                                        lineStyle={{width: 4}}
                                        firstNodeStyle={
                                            !isShowAuditDetail ? {padding: 0, minWidth: "100%"} : {padding: 0}
                                        }
                                        secondNodeStyle={
                                            !isShowAuditDetail
                                                ? {padding: 0, maxWidth: 0, minWidth: 0}
                                                : {overflow: "unset", padding: 0}
                                        }
                                        firstNode={
                                            <div className={classNames(styles["audit-code-code"])}>
                                                <div className={styles["code-container"]}>
                                                    {onFixedEditorDetails(onChangeArea())}
                                                </div>
                                            </div>
                                        }
                                        secondNode={
                                            <>
                                                {isShowAuditDetail && (
                                                    <RightAuditDetail
                                                        auditRightParams={auditRightParams}
                                                        isShowAuditDetail={isShowAuditDetail}
                                                        setShowAuditDetail={setShowAuditDetail}
                                                    />
                                                )}
                                            </>
                                        }
                                    />
                                }
                            />
                        </div>
                        <BottomSideBar onOpenEditorDetails={onOpenEditorDetails} />
                    </div>

                    {isShowCompileModal && <AuditModalFormModal onCancel={onCloseCompileModal} onSuccee={onSuccee} />}
                    <YakitHint
                        visible={isShowModal}
                        title={"代码审计执行中"}
                        content={"请等待执行完成后重试"}
                        okButtonProps={{style: {display: "none"}}}
                        onCancel={() => setShowModal(false)}
                    />
                </div>
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
