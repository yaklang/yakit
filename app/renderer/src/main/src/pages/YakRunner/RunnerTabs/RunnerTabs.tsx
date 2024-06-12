import React, {Fragment, memo, useEffect, useMemo, useRef, useState} from "react"
import {
    Selection,
    CursorPosition,
    FileDetailInfo,
    RunnerTabBarItemProps,
    RunnerTabBarProps,
    RunnerTabPaneProps,
    RunnerTabsProps,
    YakRunnerWelcomePageProps,
    SplitDirectionProps
} from "./RunnerTabsType"
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
import styles from "./RunnerTabs.module.scss"
import {KeyToIcon} from "../FileTree/icon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineImportIcon,
    OutlinePlayIcon,
    OutlinePlusIcon,
    OutlineSplitScreenIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {YakRunnerNewFileIcon, YakRunnerOpenFileIcon, YakRunnerOpenFolderIcon} from "../icon"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {useMemoizedFn, useThrottleFn, useUpdate, useUpdateEffect} from "ahooks"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {AreaInfoProps, TabFileProps} from "../YakRunnerType"
import {IMonacoEditor} from "@/utils/editors"
import {onSyntaxCheck} from "../utils"
import {IMonacoEditorMarker} from "@/utils/editorMarkers"
import cloneDeep from "lodash/cloneDeep"
import {info} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {Divider} from "antd"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {v4 as uuidv4} from "uuid"

const {ipcRenderer} = window.require("electron")

const layoutToString = (v: number[]) => {
    return JSON.stringify(v)
}

export const RunnerTabs: React.FC<RunnerTabsProps> = memo((props) => {
    const {tabsId} = props
    const {areaInfo} = useStore()
    const {setActiveFile, setAreaInfo} = useDispatcher()
    const [tabsList, setTabsList] = useState<FileDetailInfo[]>([])
    const [splitDirection, setSplitDirection] = useState<SplitDirectionProps[]>([])
    useEffect(() => {
        let direction: SplitDirectionProps[] = []
        let showTabs: FileDetailInfo[] = []
        areaInfo.forEach((item) => {
            item.elements.forEach((itemIn) => {
                if (itemIn.id === tabsId) {
                    showTabs = itemIn.files
                    if (itemIn.files.length >= 2) {
                        // 此项支持上下分
                        if (areaInfo.length <= 1) {
                            direction = [...direction, "top", "bottom"]
                        }
                        // 此项支持左右分
                        if (item.elements.length <= 1) {
                            direction = [...direction, "left", "right"]
                        }
                    }
                }
            })
        })
        if (showTabs.length > 0) {
            setTabsList(showTabs)
        }
        setSplitDirection(direction)
    }, [areaInfo])

    const isShowExtra = useMemo(() => {
        let val: boolean = false
        tabsList.some((item) => {
            if (item.isActive && item.language === "yak") {
                val = true
            }
            return item.isActive
        })
        return val
    }, [tabsList])

    const onActiveItem = useMemo(() => {
        const tabsItem = tabsList.filter((item) => {
            return item.isActive
        })
        if (tabsItem.length > 0) {
            return tabsItem[0]
        }
        return null
    }, [tabsList])

    const [executing, setExecuting] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer.on("client-yak-end", () => {
            setExecuting(false)
        })
        return () => {
            ipcRenderer.removeAllListeners("client-yak-end")
        }
    }, [])

    const onRunYak = useMemoizedFn(async () => {
        let newActiveFile = onActiveItem
        if (newActiveFile && setActiveFile) {
            setExecuting(true)
            setActiveFile(newActiveFile)
            // 打开底部
            emiter.emit("onOpenBottomDetail", JSON.stringify({type: "output"}))
            ipcRenderer.invoke("exec-yak", {
                Script: newActiveFile.code,
                Params: [],
                RunnerParamRaw: ""
            })
        }
    })

    // 方向转名称
    const onDirectionToName = useMemoizedFn((v: SplitDirectionProps) => {
        switch (v) {
            case "top":
                return "向上拆分"
            case "right":
                return "向右拆分"
            case "bottom":
                return "向下拆分"
            case "left":
                return "向左拆分"
            default:
                return "无法识别"
        }
    })

    // 拆分
    const onDirectionToSplit = useMemoizedFn((direction: SplitDirectionProps) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        let moveItem: TabFileProps | null = null
        let infoIndex: number = 0
        // 不论什么方向 都需要移除迁移项并重新激活未选中项
        newAreaInfo.forEach((item, index) => {
            item.elements.forEach((itemIn, indexIn) => {
                if (itemIn.id === tabsId) {
                    // 筛选出迁移项
                    let newFileDetailInfo: FileDetailInfo[] = []
                    let activeIndex: number = 0
                    itemIn.files.forEach((file, fileIndex) => {
                        if (!file.isActive) {
                            newFileDetailInfo.push(file)
                        }
                        if (file.isActive) {
                            // 构建新Tabs项
                            moveItem = {
                                id: uuidv4(),
                                files: [file]
                            }
                            activeIndex = fileIndex
                            infoIndex = index
                        }
                    })
                    // 重新激活未选中项目（因移走后当前tabs无选中项）
                    newFileDetailInfo[(activeIndex - 1 )< 0 ? 0 : activeIndex].isActive = true

                    // 赋予新值
                    newAreaInfo[index].elements[indexIn].files = newFileDetailInfo
                }
            })
        })
        if (moveItem) {
            if (direction === "top") {
                newAreaInfo.unshift({
                    elements: [moveItem]
                })
            }
            if (direction === "bottom") {
                newAreaInfo.push({
                    elements: [moveItem]
                })
            }
            if (direction === "left") {
                newAreaInfo[infoIndex].elements.unshift(moveItem)
            }
            if (direction === "right") {
                newAreaInfo[infoIndex].elements.push(moveItem)
            }
        }
        console.log("拆分", newAreaInfo, moveItem)
        setAreaInfo&&setAreaInfo(newAreaInfo)
    })

    // 拆分栏控制
    const onSplitTabBar = useMemoizedFn(() => {
        if (splitDirection.length > 0) {
            const menu = splitDirection.map((item) => {
                return {
                    key: item,
                    label: (
                        <div className={styles["extra-menu"]}>
                            <div className={styles["menu-name"]}>{onDirectionToName(item)}</div>
                        </div>
                    )
                }
            })
            return (
                <>
                    <YakitDropdownMenu
                        menu={{
                            data: menu,
                            onClick: ({key}) => {
                                switch (key) {
                                    case "top":
                                    case "right":
                                    case "bottom":
                                    case "left":
                                        onDirectionToSplit(key)
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
                        <OutlineSplitScreenIcon className={styles["extra-box-icon"]} />
                    </YakitDropdownMenu>
                    <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                </>
            )
        }
        return <></>
    })

    const extraDom = useMemoizedFn(() => {
        return (
            <div className={styles["extra-box"]}>
                {onSplitTabBar()}
                {isShowExtra && (
                    <YakitButton icon={<OutlinePlayIcon />} loading={executing} onClick={onRunYak}>
                        执行
                    </YakitButton>
                )}
            </div>
        )
    })

    return (
        <div className={styles["runner-tabs"]}>
            <RunnerTabBar tabsId={tabsId} tabsList={tabsList} extra={extraDom()} />

            <div className={styles["tabs-pane"]}>
                <RunnerTabPane tabsId={tabsId} />
            </div>
        </div>
    )
})

const RunnerTabBar: React.FC<RunnerTabBarProps> = memo((props) => {
    const {tabsId, tabsList, extra} = props
    return (
        <div className={classNames(styles["runner-tab-bar"])}>
            <div className={styles["bar-wrapper"]}>
                <Droppable droppableId={tabsId} direction='horizontal'>
                    {(provided) => {
                        return (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={classNames(styles["bar-container"])}
                            >
                                {tabsList.map((item, index) => {
                                    return (
                                        <Fragment key={item.path}>
                                            <RunnerTabBarItem index={index} info={item} tabsId={tabsId} />
                                        </Fragment>
                                    )
                                })}
                                {provided.placeholder}
                            </div>
                        )
                    }}
                </Droppable>
            </div>
            {extra}
        </div>
    )
})

const RunnerTabBarItem: React.FC<RunnerTabBarItemProps> = memo((props) => {
    const {index, info, tabsId} = props
    const {areaInfo} = useStore()
    const {setAreaInfo} = useDispatcher()
    const setActiveFile = useMemoizedFn(() => {
        try {
            // 切换时应移除编辑器焦点(原因：拖拽会导致monaca焦点无法主动失焦)
            if (document.activeElement !== null) {
                // @ts-ignore
                document.activeElement.blur()
            }
            const newAreaInfo: AreaInfoProps[] = JSON.parse(JSON.stringify(areaInfo))
            newAreaInfo.forEach((item, idx) => {
                item.elements.forEach((itemIn, idxin) => {
                    if (itemIn.id === tabsId) {
                        itemIn.files.forEach((file, idxinin) => {
                            newAreaInfo[idx].elements[idxin].files[idxinin] = {...file, isActive: idxinin === index}
                        })
                    }
                })
            })
            setAreaInfo && setAreaInfo(newAreaInfo)
        } catch (error) {}
    })

    const closeTabItem = useMemoizedFn((e) => {
        e.stopPropagation()
    })

    return (
        <Draggable key={info.path} draggableId={info.path} index={index}>
            {(provided, snapshot) => {
                const {isDragging} = snapshot
                return (
                    <div
                        ref={provided.innerRef}
                        // provided.draggableProps该处理程序可能在拖拽开始时阻止事件传播，从而防止了失焦事件的发生。
                        // (最终导致monaca在拖拽与点击时无法失焦)
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{...provided.draggableProps.style}}
                        className={classNames(styles["runner-tab-bar-item"], {
                            [styles["dragging"]]: isDragging,
                            [styles["selected"]]: info.isActive
                        })}
                    >
                        <div className={styles["item-wrapper"]} onClick={setActiveFile}>
                            <img src={KeyToIcon[info.icon].iconPath} />
                            <div className={styles["text-style"]}>{info.name}</div>
                            <YakitButton
                                className={styles["del-btn"]}
                                type='text2'
                                size='small'
                                icon={<OutlineXIcon />}
                                onClick={closeTabItem}
                            />
                        </div>
                    </div>
                )
            }}
        </Draggable>
    )
})

// 更新总布局信息
const onSetAreaInfoItem = (newElements: FileDetailInfo, areaInfo) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
            itemIn.files.forEach((file, fileIn) => {
                if (file.path === newElements.path) {
                    newAreaInfo[index].elements[indexIn].files[fileIn] = newElements
                }
            })
        })
    })
    return newAreaInfo
}

const RunnerTabPane: React.FC<RunnerTabPaneProps> = memo((props) => {
    const {tabsId} = props
    const {areaInfo, activeFile} = useStore()
    const {setAreaInfo, setActiveFile} = useDispatcher()
    const [editorInfo, setEditorInfo] = useState<FileDetailInfo>()
    // 编辑器实例
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    // 是否初次加载
    const isFirstRef = useRef<boolean>(true)
    useEffect(() => {
        areaInfo.forEach((item) => {
            item.elements.forEach((itemIn) => {
                if (itemIn.id === tabsId) {
                    itemIn.files.forEach((file) => {
                        if (file.isActive && (!editorInfo || (editorInfo && editorInfo.path !== file.path))) {
                            // 更新编辑器展示项
                            setEditorInfo(file)
                        }
                    })
                }
            })
        })
    }, [areaInfo])

    // 光标位置信息
    const positionRef = useRef<CursorPosition>()
    const selectionRef = useRef<Selection>()

    // 更新当前底部展示信息
    const updateBottomEditorDetails = useMemoizedFn(async () => {
        if (!editorInfo) return
        let newActiveFile = editorInfo
        // 注入语法检查结果
        if (newActiveFile.language === "yak") {
            const syntaxCheck = (await onSyntaxCheck(newActiveFile.code)) as IMonacoEditorMarker[]
            if (syntaxCheck) {
                newActiveFile = {...newActiveFile, syntaxCheck}
            }
        }
        // 更新位置信息
        if (positionRef.current) {
            // 此处还需要将位置信息记录至areaInfo用于下次打开时直接定位光标
            newActiveFile = {...newActiveFile, position: positionRef.current}
        }
        if (selectionRef.current) {
            // 此处还需要将位置信息记录至areaInfo用于下次打开时直接定位光标
            newActiveFile = {...newActiveFile, selections: selectionRef.current}
        }
        setActiveFile && setActiveFile(newActiveFile)
        const newAreaInfo = onSetAreaInfoItem(newActiveFile, areaInfo)
        console.log("更新当前底部展示信息", newActiveFile, newAreaInfo)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 聚焦时校验是否更新活跃文件
    const onSetActiveFileByFocus = useMemoizedFn(() => {
        if (activeFile?.path !== editorInfo?.path) {
            updateBottomEditorDetails()
        }
    })

    useEffect(() => {
        if (!reqEditor) {
            return
        }
        let isFocus = false
        // 监听光标点击位置
        const cursorPosition = reqEditor.onDidChangeCursorPosition((e) => {
            if (!isFocus) return
            const {position} = e
            console.log("当前光标位置：", position)
            positionRef.current = position
            updateBottomEditorDetails()
        })
        // 监听光标选中位置
        const cursorSelection = reqEditor.onDidChangeCursorSelection((e) => {
            if (!isFocus) return
            const selection = e.selection
            const {startLineNumber, startColumn, endLineNumber, endColumn} = selection
            console.log("当前光标选中位置", startLineNumber, startColumn, endLineNumber, endColumn)
            selectionRef.current = {startLineNumber, startColumn, endLineNumber, endColumn}
            // 选中时也调用了onDidChangeCursorPosition考虑优化掉重复调用
            // updateBottomEditorDetails()
        })
        // 监听编辑器是否聚焦
        const focusEditor = reqEditor.onDidFocusEditorWidget(() => {
            isFocus = true
            console.log("聚焦", reqEditor.getPosition())
            // 此处获取光标位置的原因是由于点击空白区域焦点获取时 onDidChangeCursorPosition 无法监听
            if (reqEditor.getPosition()) {
                const focusLineNumber = reqEditor.getPosition()?.lineNumber
                const focusColumn = reqEditor.getPosition()?.column
                if (focusLineNumber && focusColumn) {
                    positionRef.current = {
                        lineNumber: focusLineNumber,
                        column: focusColumn
                    }
                }
            }
            // 聚焦时更新目前活跃的文件展示
            onSetActiveFileByFocus()
        })
        // 监听编辑器是否失焦
        const blurEditor = reqEditor.onDidBlurEditorWidget(() => {
            isFocus = false
            console.log("失焦")
        })

        return () => {
            // 在组件销毁时移除事件监听器
            cursorPosition.dispose()
            cursorSelection.dispose()
            focusEditor.dispose()
            blurEditor.dispose()
        }
    }, [reqEditor])

    // 更新光标位置
    const updatePosition = useMemoizedFn(() => {
        console.log("更新光标位置")

        if (reqEditor && editorInfo) {
            const {position, selections} = editorInfo
            const {lineNumber, column} = position || {}
            if (lineNumber && column) {
                reqEditor.setPosition({lineNumber, column})
                reqEditor.focus()
            }
            // 记录以前缓存的值用于刷新
            if (position) {
                positionRef.current = position
            }
            if (selections) {
                selectionRef.current = selections
            }
        }
        updateBottomEditorDetails()
    })

    useUpdateEffect(() => {
        if (isFirstRef.current) {
            console.log("初次加载")
            isFirstRef.current = false
        } else {
            console.log("二次加载")
            updatePosition()
        }
    }, [editorInfo])

    return (
        <div className={styles["runner-tab-pane"]}>
            <YakitEditor
                editorDidMount={(editor) => {
                    setReqEditor(editor)
                }}
                type={editorInfo?.language || "yak"}
                value={editorInfo?.code || ""}
                setValue={() => {}}
            />
        </div>
    )
})

export const YakRunnerWelcomePage: React.FC<YakRunnerWelcomePageProps> = memo((props) => {
    return (
        <div className={styles["yak-runner-welcome-page"]}>
            <div className={styles["title"]}>
                <div className={styles["icon-style"]}>
                    <SolidYakCattleNoBackColorIcon />
                </div>
                <div className={styles["header-style"]}>欢迎使用 Yak 语言</div>
            </div>

            <div className={styles["operate"]}>
                <div className={styles["title-style"]}>快捷创建</div>
                <div className={styles["operate-btn-group"]}>
                    <div className={classNames(styles["btn-style"], styles["btn-new-file"])}>
                        <div className={styles["btn-title"]}>
                            <YakRunnerNewFileIcon />
                            新建文件
                        </div>
                        <OutlinePlusIcon className={styles["icon-style"]} />
                    </div>
                    <div className={classNames(styles["btn-style"], styles["btn-open-file"])}>
                        <div className={styles["btn-title"]}>
                            <YakRunnerOpenFileIcon />
                            打开文件
                        </div>
                        <OutlineImportIcon className={styles["icon-style"]} />
                    </div>
                    <div className={classNames(styles["btn-style"], styles["btn-open-folder"])}>
                        <div className={styles["btn-title"]}>
                            <YakRunnerOpenFolderIcon />
                            打开文件夹
                        </div>
                        <OutlineImportIcon className={styles["icon-style"]} />
                    </div>
                </div>
            </div>

            <div className={styles["recent-open"]}>
                <div className={styles["title-style"]}>最近打开</div>
                <div className={styles["recent-list"]}>
                    {[
                        {
                            name: ".git",
                            path: "/Users/nonight/work/yakitVersion/.git",
                            isFolder: false,
                            icon: "_file",
                            isLeaf: false,
                            code: "123"
                        },
                        {
                            name: ".github",
                            path: "/Users/nonight/work/yakitVersion/.github",
                            isFolder: false,
                            icon: "_file",
                            isLeaf: false,
                            code: "123"
                        },
                        {
                            name: ".gitignore",
                            path: "/Users/nonight/work/yakitVersion/.gitignore",
                            isFolder: false,
                            icon: "_file",
                            isLeaf: true,
                            code: "123"
                        }
                    ].map((item, index) => {
                        return (
                            <div key={item.path} className={styles["list-opt"]}>
                                <div className={styles["file-name"]}>{item.name}</div>
                                <div className={styles["file-path"]}>{item.path}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
})
