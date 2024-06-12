import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {LeftSideBar} from "./LeftSideBar/LeftSideBar"
import {BottomSideBar} from "./BottomSideBar/BottomSideBar"
import {RightSideBar} from "./RightSideBar/RightSideBar"
import {FileNodeProps} from "./FileTree/FileTreeType"
import {grpcFetchFileTree, updateFileTree} from "./utils"
import {AreaInfoProps, TabFileProps, ViewsInfoProps, YakRunnerProps} from "./YakRunnerType"
import {getRemoteValue} from "@/utils/kv"
import {YakRunnerRemoteGV} from "@/enums/yakRunner"
import {yakitNotify} from "@/utils/notification"
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
import {convert, get, clear} from "./keyDown/keyDown"
import {defaultKeyDown} from "./keyDown/keyDownFun"
import {FileDetailInfo} from "./RunnerTabs/RunnerTabsType"

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
                        icon: "_file",
                        code: `a() 

                        f = () => {
                        
                        }
                        
                        http.Get("")`,
                        language: "yak"
                    },
                    {
                        name: ".yaklang",
                        path: "/Users/nonight/work/yakitVersion/.yaklang",
                        icon: "_file",
                        code: "123",
                        language: "yak",
                        isActive: true
                    },
                    {
                        name: ".tt",
                        path: "/Users/nonight/work/yakitVersion/.tt",
                        icon: "_file",
                        code: "tt",
                        language: "text"
                    },
                    {
                        name: ".ttt",
                        path: "/Users/nonight/work/yakitVersion/.ttt",
                        icon: "_file",
                        code: "ttt",
                        language: "text"
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
    const [areaInfo, setAreaInfo] = useState<AreaInfoProps[]>(defaultAreaInfo)
    const [activeFile, setActiveFile] = useState<FileDetailInfo>()

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

    useEffect(() => {
        const node: FileNodeProps = {
            name: "release",
            path: "D:/Work/yakit/release",
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

    /** ---------- 焦点源码相关信息 Start ---------- */
    /** ---------- 焦点源码相关信息 End ---------- */

    const store: YakRunnerContextStore = useMemo(() => {
        return {
            fileTree: fileTree,
            areaInfo: areaInfo,
            activeFile: activeFile
        }
    }, [fileTree, areaInfo, activeFile])

    const dispatcher: YakRunnerContextDispatcher = useMemo(() => {
        return {
            setFileTree: setFileTree,
            handleFileLoadData: handleFileLoadData,
            setAreaInfo: setAreaInfo,
            setActiveFile: setActiveFile
        }
    }, [])

    const keyDownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        clear()
        defaultKeyDown()
    }, [])

    const handleKeyPress = (event) => {
        // 在这里处理全局键盘事件
        // console.log("Key keydown:",event)
        const {shiftKey, ctrlKey, altKey, metaKey, key} = event
        let activeKey: string[] = []
        if (shiftKey) activeKey.push("Shift")
        if (ctrlKey) activeKey.push("Control")
        if (altKey) activeKey.push("Alt")
        if (metaKey) activeKey.push("Meta")
        activeKey.push(key)
        const newkey = convert(activeKey)
        // console.log("newkey---",newkey);
        let arr = get(newkey)
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

    // 拖放结束时的回调函数
    const onDragEnd = useMemoizedFn((result: DropResult,provided: ResponderProvided)=>{
        try {
            console.log("onDragEnd",result, provided)
            const {source, destination, draggableId, type, combine} = result
        } catch (error) {}
        
    })

    const getTabsId = useMemoizedFn((row,col)=>{
        try {
            return areaInfo[row].elements[col].id
        } catch (error) {
            return `${row}*${col}`
        }
    })

    // 布局处理
    const onChangeArea = useMemoizedFn(() => {
        if (areaInfo.length === 0) {
            return <YakRunnerWelcomePage />
        }
        return (
            <DragDropContext
                onDragEnd={onDragEnd}
                onDragStart={onDragStart}
            >
                <SplitView
                    isVertical={true}
                    isLastHidden={areaInfo.length === 1}
                    elements={[
                        {
                            element: (
                                <SplitView
                                    isLastHidden={areaInfo.length > 0 && areaInfo[0].elements.length === 1}
                                    elements={[
                                        {element: <RunnerTabs tabsId={getTabsId(0,0)} />},
                                        {element: <RunnerTabs tabsId={getTabsId(0,1)} />}
                                    ]}
                                />
                            )
                        },
                        {
                            element: (
                                <SplitView
                                    isLastHidden={areaInfo.length > 1 && areaInfo[1].elements.length === 1}
                                    elements={[
                                        {element: <RunnerTabs tabsId={getTabsId(1,0)} />},
                                        {element: <RunnerTabs tabsId={getTabsId(1,1)} />}
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
