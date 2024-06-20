import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {LeftSideBar} from "./LeftSideBar/LeftSideBar"
import {BottomSideBar} from "./BottomSideBar/BottomSideBar"
import {RightSideBar} from "./RightSideBar/RightSideBar"
import {FileNodeProps} from "./FileTree/FileTreeType"
import {
    addAreaFileInfo,
    grpcFetchFileTree,
    removeAreaFileInfo,
    saveCodeByFile,
    setYakRunnerHistory,
    updateAreaFileInfo,
    updateFileTree
} from "./utils"
import {AreaInfoProps, TabFileProps, ViewsInfoProps, YakRunnerHistoryProps, YakRunnerProps} from "./YakRunnerType"
import {getRemoteValue} from "@/utils/kv"
import {YakRunnerRemoteGV} from "@/enums/yakRunner"
import {failed, success, yakitNotify} from "@/utils/notification"
import YakRunnerContext, {YakRunnerContextDispatcher, YakRunnerContextStore} from "./hooks/YakRunnerContext"
import {FolderDefault} from "./FileTree/icon"
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
const defaultAreaInfo: AreaInfoProps[] = [
    {
        elements: [
            {
                id: "test1",
                files: [
                    {
                        name: ".yak",
                        path: "/Users/nonight/work/yakitVersion/.yak",
                        icon: "_f_yak",
                        code: `a() 

                        f = () => {
                        
                        }
                        
                        http.Get("")`,
                        language: "yak",
                        openTimestamp: 1718604560
                    },
                    {
                        name: ".yaklang",
                        path: "/Users/nonight/work/yakitVersion/.yaklang",
                        icon: "_f_yak",
                        code: "123",
                        language: "yak",
                        isActive: true,
                        openTimestamp: 1718604561
                    },
                    {
                        name: ".tt",
                        path: "/Users/nonight/work/yakitVersion/.tt",
                        icon: "_file",
                        code: "tt",
                        language: "text",
                        openTimestamp: 1718604562
                    },
                    {
                        name: ".ttt",
                        path: "/Users/nonight/work/yakitVersion/.ttt",
                        icon: "_f_markdown",
                        code: "ttt",
                        language: "text",
                        openTimestamp: 1718604563
                    }
                ]
            }
            // {
            //     id: "test2",
            //     files: [
            //         {
            //             name: ".gitignore",
            //             path: "/Users/nonight/work/yakitVersion/.gitignore",
            //             icon: "_file",
            //             code: "456",
            //             language: "git",
            //             isActive: true
            //         }
            //     ]
            // }
        ]
    }
    // {
    //     elements: [
    //         {
    //             id: "test3",
    //             files: [
    //                 {
    //                     name: "ELECTRON_GUIDE.md",
    //                     path: "/Users/nonight/work/yakitVersion/ELECTRON_GUIDE.md",
    //                     icon: "_file",
    //                     code: "789",
    //                     language: "md",
    //                     isActive: true
    //                 }
    //             ]
    //         },
    //         {
    //             id: "test4",
    //             files:[
    //                 {
    //                     name: "LICENSE.md",
    //                     path: "/Users/nonight/work/yakitVersion/LICENSE.md",
    //                     icon: "_file",
    //                     code: "1010",
    //                     language:"yak",
    //                     isActive:true
    //                 }
    //             ]
    //         }
    //     ]
    // }
]

export const YakRunner: React.FC<YakRunnerProps> = (props) => {
    const {initCode} = props

    /** ---------- 文件树 Start ---------- */
    const fileCache = useRef<Map<string, FileNodeProps[]>>(new Map())
    const [fileTree, setFileTree] = useState<FileNodeProps[]>([])
    const [areaInfo, setAreaInfo] = useState<AreaInfoProps[]>([])
    const [activeFile, setActiveFile] = useState<FileDetailInfo>()
    const [runnerTabsId, setRunnerTabsId] = useState<string>()

    const currentPath = useRef<FileNodeProps | undefined>()

    const handleFetchFileList = useMemoizedFn((path: string, callback?: (value: FileNodeProps[] | null) => any) => {
        grpcFetchFileTree(path)
            .then((res) => {
                console.log("文件树", res)

                if (callback) callback(res)
            })
            .catch((error) => {
                yakitNotify("error", `获取文件列表失败: ${error}`)
                if (callback) callback(null)
            })
    })

    // 加载文件列表
    const onOpenFolderListFun = useMemoizedFn((absolutePath: string) => {
        console.log("onOpenFolderListFun", absolutePath)
        const folders = absolutePath.split("\\") // 使用双反斜杠对路径进行分割
        const lastFolder = folders[folders.length - 1] // 获取数组中的最后一个元素
        if (absolutePath.length > 0 && lastFolder.length > 0) {
            const node: FileNodeProps = {
                name: lastFolder,
                path: absolutePath,
                isFolder: true,
                icon: FolderDefault
            }

            currentPath.current = {...node}
            handleFetchFileList(node.path, (value) => {
                if (value) setFileTree([{...node, children: value}])
            })
            getRemoteValue(YakRunnerRemoteGV.CurrentOpenPath)
                .then((info?: string) => {
                    if (info) {
                        try {
                            const file: FileNodeProps = JSON.parse(info)
                            currentPath.current = {...file}
                            handleFetchFileList(file.path, (value) => {
                                if (value) setFileTree([{...file, children: value}])
                            })
                        } catch (error) {}
                    }
                })
                .catch(() => {})

            // 打开文件夹时接入历史记录
            const history: YakRunnerHistoryProps = {
                isFile: false,
                name: lastFolder,
                path: absolutePath
            }
            setYakRunnerHistory(history)
        }
    })

    useEffect(() => {
        emiter.on("onOpenFolderList", onOpenFolderListFun)
        return () => {
            emiter.off("onOpenFolderList", onOpenFolderListFun)
        }
    }, [])

    // 加载下一层
    const handleFileLoadData = useMemoizedFn((node: FileNodeProps) => {
        return new Promise((resolve, reject) => {
            handleFetchFileList(node.path, (value) => {
                if (value) {
                    setTimeout(() => {
                        setFileTree((old) => {
                            return updateFileTree(old, node.path, value)
                        })
                        resolve("")
                    }, 300)
                } else {
                    reject()
                }
            })
        })
    })
    /** ---------- 文件树 End ---------- */

    /** ---------- 选中文件 Start ---------- */
    /** 新建文件 */
    const handleNewFile = useMemoizedFn(() => {})
    /** 打开文件 */
    const handleOpenFile = useMemoizedFn(() => {})
    /** 打开文件夹 */
    const handleOpenFolder = useMemoizedFn(() => {})
    /** ---------- 选中文件 End ---------- */

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

    const keyDownRef = useRef<HTMLDivElement>(null)
    const unTitleCountRef = useRef<number>(1)

    const addFileTab = useMemoizedFn(() => {
        // 新建临时文件
        console.log("ctrl_n")
        const scratchFile: FileDetailInfo = {
            name: `Untitle-${unTitleCountRef.current}.yak`,
            code: "# input your yak code\nprintln(`Hello Yak World!`)",
            icon: "_f_yak",
            isActive: true,
            openTimestamp: moment().unix(),
            // 此处赋值 path 用于拖拽 分割布局等UI标识符操作
            path: `${uuidv4()}-Untitle-${unTitleCountRef.current}.yak`,
            language: "yak",
            isUnSave: true
        }
        unTitleCountRef.current += 1
        const {newAreaInfo, newActiveFile} = addAreaFileInfo(areaInfo, scratchFile, activeFile)

        setAreaInfo(newAreaInfo)
        setActiveFile(newActiveFile)
    })

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
    const ctrl_s = useMemoizedFn(() => {
        // 存储文件
        try {
            // 如若未保存 则
            if (activeFile && activeFile.isUnSave && activeFile.code.length > 0) {
                ipcRenderer
                    .invoke("show-save-dialog", `${codePath}${codePath ? "/" : ""}${activeFile.name}`)
                    .then(async (res) => {
                        console.log("res---", res)

                        const path = res.filePath
                        const name = res.name
                        if (path.length > 0) {
                            const suffix = name.split(".").pop()

                            const file: FileDetailInfo = {
                                ...activeFile,
                                path,
                                isUnSave: false,
                                language: suffix === "yak" ? suffix : "http"
                            }
                            await saveCodeByFile(file)
                            success("保存成功")
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
                    })
            }
        } catch (error) {
            failed(`${activeFile?.name}保存失败`)
        }
    })

    // 注入默认键盘事件
    const defaultKeyDown = useMemoizedFn(() => {
        setKeyboard("17-78", {onlyid: uuidv4(), callback: addFileTab})
        setKeyboard("17-83", {onlyid: uuidv4(), callback: ctrl_s})
    })

    useEffect(() => {
        clearKeyboard()
        defaultKeyDown()
    }, [])

    const handleKeyPress = (event) => {
        // 在这里处理全局键盘事件
        // console.log("Key keydown:",event)
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
        event.stopPropagation()
        arr.forEach((item) => {
            item.callback()
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
            console.log("onDragEnd-0_0", newAreaInfo)
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
                                        {element: <RunnerTabs tabsId={getTabsId(1, 0)} />},
                                        {element: <RunnerTabs tabsId={getTabsId(1, 1)} />}
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
    return (
        <YakRunnerContext.Provider value={{store, dispatcher}}>
            <div className={styles["yak-runner"]} ref={keyDownRef} tabIndex={0}>
                <div className={styles["yak-runner-body"]}>
                    <LeftSideBar />
                    <div className={styles["yak-runner-code"]}>
                        <div className={styles["code-container"]}>
                            {/* <SplitView
                                elements={[
                                    {element: <SplitView isVertical={true} elements={[{element: 1}, {element: 2}]} />},
                                    {element: 2}
                                ]}
                            /> */}
                            {onFixedEditorDetails(onChangeArea())}
                        </div>
                    </div>
                    <RightSideBar />
                </div>

                <BottomSideBar onOpenEditorDetails={onOpenEditorDetails} />
            </div>
        </YakRunnerContext.Provider>
    )
}
