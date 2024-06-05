import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {LeftSideBar} from "./LeftSideBar/LeftSideBar"
import {BottomSideBar} from "./BottomSideBar/BottomSideBar"
import {RightSideBar} from "./RightSideBar/RightSideBar"
import {FileNodeProps} from "./FileTree/FileTreeType"
import {grpcFetchFileTree, updateFileTree} from "./utils"
import { TabFileProps, ViewsInfoProps, YakRunnerProps} from "./YakRunnerType"
import {getRemoteValue} from "@/utils/kv"
import {YakRunnerRemoteGV} from "@/enums/yakRunner"
import {yakitNotify} from "@/utils/notification"
import YakRunnerContext, {YakRunnerContextDispatcher, YakRunnerContextStore} from "./hooks/YakRunnerContext"
import {FolderDefault} from "./FileTree/icon"
import {RunnerTabs} from "./RunnerTabs/RunnerTabs"

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
import { convert,get,clear } from "./keyDown/keyDown";
import { defaultKeyDown } from "./keyDown/keyDownFun";

const {ipcRenderer} = window.require("electron")

// 模拟tabs分块及对应文件 (设想方法：区域4等分，减少其结构嵌套层数，分别用1、2、3、4标注其展示所处区域 例如全屏展示则为[1、2、3、4])
const defaultTabsFile:TabFileProps[] = [
    {
        id: "testTab",
        files:[
            {
                name: ".git",
                path: "/Users/nonight/work/yakitVersion/.git",
                icon: "_file",
                code: `yakit.AutoInitYakit()

                # Input your code!
                124
                dfddsf
                `,
                language:"yak"
            },
            {
                name: ".github",
                path: "/Users/nonight/work/yakitVersion/.github",
                icon: "_file",
                code: "123",
                language:"yak",
                isActive:true
            },
            {
                name: ".gitignore",
                path: "/Users/nonight/work/yakitVersion/.gitignore",
                icon: "_file",
                code: "456",
                language:"yak"
            },
            {
                name: "ELECTRON_GUIDE.md",
                path: "/Users/nonight/work/yakitVersion/ELECTRON_GUIDE.md",
                icon: "_file",
                code: "789",
                language:"yak"
            },
            {
                name: "LICENSE.md",
                path: "/Users/nonight/work/yakitVersion/LICENSE.md",
                icon: "_file",
                code: "1010",
                language:"yak"
            }
        ],
        layout:[1,2,3,4],

    }
]


export const YakRunner: React.FC<YakRunnerProps> = (props) => {
    const {initCode} = props

    /** ---------- 文件树 Start ---------- */
    const fileCache = useRef<Map<string, FileNodeProps[]>>(new Map())
    const [fileTree, setFileTree] = useState<FileNodeProps[]>([])
    const [tabsFile,setTabsFile] = useState<TabFileProps[]>(defaultTabsFile)

    const currentPath = useRef<FileNodeProps | undefined>()

    const handleFetchFileList = useMemoizedFn((path: string, callback?: (value: FileNodeProps[] | null) => any) => {
        grpcFetchFileTree(path)
            .then((res) => {
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
            tabsFile: tabsFile
        }
    }, [fileTree,tabsFile])

    const dispatcher: YakRunnerContextDispatcher = useMemo(() => {
        return {
            setFileTree: setFileTree,
            handleFileLoadData: handleFileLoadData,
            setTabsFile: setTabsFile
        }
    }, [])

    const keyDownRef = useRef<HTMLDivElement>(null)

    useEffect(()=>{
        clear()
        defaultKeyDown()
    },[])


    const handleKeyPress = (event) => {
        // 在这里处理全局键盘事件
        // console.log("Key keydown:",event)
        const {shiftKey,ctrlKey,altKey,metaKey,key} = event
                let activeKey: string[] = []
                if (shiftKey) activeKey.push("Shift")
                if (ctrlKey) activeKey.push("Control")
                if (altKey) activeKey.push("Alt")
                if (metaKey) activeKey.push("Meta")
                activeKey.push(key)
                const newkey = convert(activeKey)
                // console.log("newkey---",newkey);
                let arr = get(newkey)
                if(!arr) return
                event.stopPropagation()
                arr.forEach((item)=>{
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
    // 固定编辑器输出
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
                                    onClose={() => {
                                        setEditorDetails(false)
                                    }}
                                />
                            )
                        }
                    ]}
                />
            )
    })
    // 打开固定编辑器输出
    const onOpenEditorDetails = useMemoizedFn((v: ShowItemType) => {
        setShowItem(v)
        setEditorDetails(true)
    })

    return (
        <YakRunnerContext.Provider value={{store, dispatcher}}>
            <div className={styles["yak-runner"]} ref={keyDownRef} tabIndex={0}>
                <div className={styles["yak-runner-body"]}>
                    <LeftSideBar />
                    <div className={styles["yak-runner-code"]}>
                        <div className={styles["code-container"]}>
                            {/* <RunnerTabs /> */}
                            {/* <HelpInfoList list={[{key:1},{key:2},{key:3},{key:4},{key:5},]}/> */}
                            {/* <SplitView
                                elements={[
                                    {element: <SplitView isVertical={true} elements={[{element: 1}, {element: 2}]} />},
                                    {element: 2}
                                ]}
                            /> */}
                            {onFixedEditorDetails(<RunnerTabs layout={[1,2,3,4]}/>)}
                        </div>
                    </div>
                    <RightSideBar />
                </div>

                <BottomSideBar onOpenEditorDetails={onOpenEditorDetails} />
            </div>
        </YakRunnerContext.Provider>
    )
}
