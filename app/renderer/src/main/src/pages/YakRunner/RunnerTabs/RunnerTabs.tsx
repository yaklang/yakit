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
    OutlineChevrondoubleleftIcon,
    OutlineChevrondoublerightIcon,
    OutlineImportIcon,
    OutlinePlayIcon,
    OutlinePlusIcon,
    OutlineSplitScreenIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {YakRunnerNewFileIcon, YakRunnerOpenFileIcon, YakRunnerOpenFolderIcon} from "../icon"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {useLongPress, useMemoizedFn, useThrottleFn, useUpdate, useUpdateEffect} from "ahooks"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {AreaInfoProps, TabFileProps} from "../YakRunnerType"
import {IMonacoEditor} from "@/utils/editors"
import {getDefaultActiveFile, onSyntaxCheck, removeAreaFileInfo, updateAreaFileInfo} from "../utils"
import {IMonacoEditorMarker} from "@/utils/editorMarkers"
import cloneDeep from "lodash/cloneDeep"
import {info} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {Divider} from "antd"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {v4 as uuidv4} from "uuid"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {openABSFileLocated} from "@/utils/openWebsite"
import {ScrollProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"

const {ipcRenderer} = window.require("electron")

const layoutToString = (v: number[]) => {
    return JSON.stringify(v)
}

export const RunnerTabs: React.FC<RunnerTabsProps> = memo((props) => {
    const {tabsId} = props
    const {areaInfo, activeFile, runnerTabsId} = useStore()
    const {setActiveFile, setAreaInfo, setRunnerTabsId} = useDispatcher()
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

    const onRunYak = useMemoizedFn(async () => {
        let newActiveFile = onActiveItem
        if (newActiveFile && setActiveFile) {
            setRunnerTabsId && setRunnerTabsId(tabsId)
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

    // 拆分(以右键选择项为准进行拆分)
    const onContextMenuToSplit = useMemoizedFn((direction: SplitDirectionProps, info: FileDetailInfo) => {
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
                        if (file.path === info.path) {
                            // 构建新Tabs项
                            moveItem = {
                                id: uuidv4(),
                                // 如若分割未激活项 则默认将其激活
                                files: [{...file, isActive: true}]
                            }
                            activeIndex = fileIndex
                            infoIndex = index
                        } else {
                            newFileDetailInfo.push(file)
                        }
                    })

                    if (info.isActive) {
                        // 重新激活未选中项目（因移走后当前tabs无选中项）
                        newFileDetailInfo[activeIndex - 1 < 0 ? 0 : activeIndex - 1].isActive = true
                    }

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
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 拆分(以激活项为准进行拆分)
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
                        if (file.isActive) {
                            // 构建新Tabs项
                            moveItem = {
                                id: uuidv4(),
                                files: [file]
                            }
                            activeIndex = fileIndex
                            infoIndex = index
                        } else {
                            newFileDetailInfo.push(file)
                        }
                    })
                    // 重新激活未选中项目（因移走后当前tabs无选中项）
                    newFileDetailInfo[activeIndex - 1 < 0 ? 0 : activeIndex - 1].isActive = true

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
        setAreaInfo && setAreaInfo(newAreaInfo)
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
            )
        }
        return <></>
    })

    const onRemoveFun = useMemoizedFn((info: FileDetailInfo) => {
        // 如若删除项为当前焦点聚集项
        if (activeFile?.path === info.path) {
            setActiveFile && setActiveFile(undefined)
        }
        const newAreaInfo = removeAreaFileInfo(areaInfo, info)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 关闭当前项
    const onRemoveCurrent = useMemoizedFn((info: FileDetailInfo) => {
        if (info.isUnSave && info.code.length > 0) {
            const m = showYakitModal({
                title: "文件未保存",
                content: <div style={{margin: "10px 24px"}}>是否要保存{info.name}里面的内容吗？</div>,
                width: 400,
                type: "white",
                closable: false,
                centered: true,
                onOkText: "保存",
                onCancelText: "不保存",
                onOk: () => {
                    ipcRenderer
                        .invoke("openDialog", {
                            title: "请选择文件夹",
                            properties: ["openDirectory"]
                        })
                        .then((data: any) => {
                            if (data.filePaths.length) {
                                let absolutePath: string = data.filePaths[0].replace(/\\/g, "\\")
                                console.log("保存路径", absolutePath)
                            }
                        })
                    m.destroy()
                },
                onCancel: () => {
                    onRemoveFun(info)
                    m.destroy()
                }
            })
            return
        }
        onRemoveFun(info)
    })

    // 关闭其他项
    const onRemoveOther = useMemoizedFn((info: FileDetailInfo) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        newAreaInfo.forEach((item, idx) => {
            item.elements.forEach((itemIn, idxin) => {
                if (itemIn.id === tabsId) {
                    itemIn.files.forEach((file, fileIndex) => {
                        if (file.path === info.path) {
                            // 剩余展示项
                            let onlyItem: FileDetailInfo | null = null
                            let onlyArr = newAreaInfo[idx].elements[idxin].files
                                .filter((item) => item.path === info.path)
                                .map((item) => ({...item, isActive: true}))
                            if (onlyArr.length > 0) {
                                onlyItem = onlyArr[0]
                            }
                            if (onlyItem) {
                                newAreaInfo[idx].elements[idxin].files = [onlyItem]
                            }
                        }
                    })
                }
            })
        })
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 关闭所有
    const onRemoveAll = useMemoizedFn((info: FileDetailInfo) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        newAreaInfo.forEach((item, idx) => {
            item.elements.forEach((itemIn, idxin) => {
                if (itemIn.id === tabsId) {
                    // 如若仅存在一项 则删除此大项并更新布局
                    if (item.elements.length > 1) {
                        newAreaInfo[idx].elements = newAreaInfo[idx].elements.filter((item) => item.id !== tabsId)
                    } else if (item.elements.length <= 1) {
                        newAreaInfo.splice(idx, 1)
                    }
                }
            })
        })
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 在文件夹中显示
    const onOpenFolder = useMemoizedFn((info: FileDetailInfo) => {
        // openABSFileLocated("")
    })

    // 在文件列表显示
    const onOpenFileList = useMemoizedFn((info: FileDetailInfo) => {})

    const menuData: YakitMenuItemType[] = useMemo(() => {
        const base: YakitMenuItemType[] = [
            {
                label: "关闭",
                key: "removeCurrent"
            },
            {
                label: "关闭其他",
                key: "removeOther"
            },
            {
                label: "关闭所有",
                key: "removeAll"
            },
            {type: "divider"},
            {
                label: "在文件夹中显示",
                key: "openFolder"
            },
            {
                label: "在文件列表显示",
                key: "openFileList"
            }
        ]
        if (splitDirection.length > 0) {
            let direction = splitDirection.map((item) => {
                return {
                    label: onDirectionToName(item),
                    key: item
                }
            })
            return [...base, {type: "divider"}, ...direction]
        }
        return [...base]
    }, [splitDirection])

    // 右键菜单
    const handleContextMenu = useMemoizedFn((info: FileDetailInfo) => {
        console.log("info===", info)

        showByRightContext({
            width: 180,
            type: "grey",
            data: [...menuData],
            onClick: ({key, keyPath}) => {
                switch (key) {
                    case "removeCurrent":
                        onRemoveCurrent(info)
                        return
                    case "removeOther":
                        onRemoveOther(info)
                        return
                    case "removeAll":
                        onRemoveAll(info)
                        return
                    case "openFolder":
                        onOpenFolder(info)
                        return
                    case "openFileList":
                        onOpenFileList(info)
                        return
                    case "top":
                    case "right":
                    case "bottom":
                    case "left":
                        onContextMenuToSplit(key, info)
                        return
                }
            }
        })
    })

    const extraDom = useMemoizedFn(() => {
        return (
            <div className={styles["extra-box"]}>
                {onSplitTabBar()}
                <>
                    {splitDirection.length > 0 && isShowExtra && (
                        <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                    )}
                </>
                {isShowExtra && (
                    <>
                        <YakitButton
                            icon={<OutlinePlayIcon />}
                            loading={runnerTabsId === tabsId}
                            disabled={!!runnerTabsId && runnerTabsId !== tabsId}
                            onClick={onRunYak}
                        >
                            执行
                        </YakitButton>
                    </>
                )}
            </div>
        )
    })

    return (
        <div className={styles["runner-tabs"]}>
            <RunnerTabBar
                tabsId={tabsId}
                tabsList={tabsList}
                extra={extraDom()}
                handleContextMenu={handleContextMenu}
                onRemoveCurrent={onRemoveCurrent}
            />

            <div className={styles["tabs-pane"]}>
                <RunnerTabPane tabsId={tabsId} />
            </div>
        </div>
    )
})

const RunnerTabBar: React.FC<RunnerTabBarProps> = memo((props) => {
    const {tabsId, tabsList, extra, handleContextMenu, onRemoveCurrent} = props
    const {activeFile} = useStore()
    const tabMenuSubRef = useRef<any>()
    const scrollLeftIconRef = useRef<any>()
    const scrollRightIconRef = useRef<any>()
    const [scroll, setScroll] = useState<ScrollProps>({
        scrollLeft: 0,
        scrollBottom: 0,
        scrollRight: 0
    })
    useLongPress(
        () => {
            if (!tabMenuSubRef.current) return
            if (!scrollLeftIconRef.current) return
            tabMenuSubRef.current.scrollLeft = 0
        },
        scrollLeftIconRef,
        {
            delay: 300,
            onClick: () => {
                if (!tabMenuSubRef.current) return
                tabMenuSubRef.current.scrollLeft -= 100
            },
            onLongPressEnd: () => {
                tabMenuSubRef.current.scrollLeft = tabMenuSubRef.current.scrollLeft + 0
            }
        }
    )
    useLongPress(
        () => {
            if (!tabMenuSubRef.current) return
            if (!scrollRightIconRef.current) return
            tabMenuSubRef.current.scrollLeft = tabMenuSubRef.current.scrollWidth
        },
        scrollRightIconRef,
        {
            delay: 300,
            onClick: () => {
                if (!tabMenuSubRef.current) return
                tabMenuSubRef.current.scrollLeft += 100
            },
            onLongPressEnd: () => {
                tabMenuSubRef.current.scrollLeft = tabMenuSubRef.current.scrollLeft - 0
            }
        }
    )

    useEffect(() => {
        if (tabsList.length === 0) return
        if (activeFile?.path === tabsList[tabsList.length - 1].path) {
            scrollToRightMost()
        }
    }, [activeFile])

    /**滚动到最后边 */
    const scrollToRightMost = useMemoizedFn(() => {
        if (!tabMenuSubRef.current) {
            const tabMenuSub = document.getElementById(`runner-tab-menu-sub-${tabsId}`)
            tabMenuSubRef.current = tabMenuSub
        }
        if (!tabMenuSubRef.current) return

        if (tabMenuSubRef.current.scrollWidth > 0) {
            tabMenuSubRef.current.scrollLeft = tabMenuSubRef.current.scrollWidth
        } else {
            setTimeout(() => {
                scrollToRightMost()
            }, 200)
        }
    })
    const onScrollTabMenu = useThrottleFn(
        (e) => {
            if (tabMenuSubRef.current) {
                const {scrollWidth, scrollLeft, clientWidth} = tabMenuSubRef.current
                const scrollRight = scrollWidth - scrollLeft - clientWidth

                setScroll({
                    ...scroll,
                    scrollLeft: scrollLeft,
                    scrollRight: scrollRight
                })
            }
        },
        {wait: 200}
    ).run
    return (
        <div className={classNames(styles["runner-tab-bar"])}>
            <div className={styles["bar-wrapper"]}>
                <Droppable droppableId={tabsId} direction='horizontal'>
                    {(provided) => {
                        return (
                            <div className={styles["runner-tab-body"]}>
                                <div
                                    className={classNames(styles["outline-chevron-double-left"], {
                                        [styles["outline-chevron-double-display-none"]]: scroll.scrollLeft <= 0
                                    })}
                                    ref={scrollLeftIconRef}
                                >
                                    <OutlineChevrondoubleleftIcon />
                                </div>
                                <div
                                    className={classNames(styles["bar-container"])}
                                    id={`runner-tab-menu-sub-${tabsId}`}
                                    ref={provided.innerRef}
                                    onScroll={onScrollTabMenu}
                                    {...provided.droppableProps}
                                >
                                    {tabsList.map((item, index) => {
                                        return (
                                            <Fragment key={item.path}>
                                                <RunnerTabBarItem
                                                    index={index}
                                                    info={item}
                                                    tabsId={tabsId}
                                                    handleContextMenu={handleContextMenu}
                                                    onRemoveCurrent={onRemoveCurrent}
                                                />
                                            </Fragment>
                                        )
                                    })}
                                    {provided.placeholder}
                                </div>
                                <div
                                    className={classNames(styles["outline-chevron-double-right"], {
                                        [styles["outline-chevron-double-display-none"]]: scroll.scrollRight <= 0
                                    })}
                                    ref={scrollRightIconRef}
                                >
                                    <OutlineChevrondoublerightIcon />
                                </div>
                                {/* {pageItem.hideAdd !== true && (
                                    <OutlinePlusIcon
                                        className={styles["outline-plus-icon"]}
                                        onClick={() => onAddSubPage()}
                                    />
                                )} */}
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
    const {index, info, tabsId, handleContextMenu, onRemoveCurrent} = props
    const {areaInfo, activeFile} = useStore()
    const {setAreaInfo, setActiveFile} = useDispatcher()
    const onActiveFile = useMemoizedFn(async () => {
        try {
            // 切换时应移除编辑器焦点(原因：拖拽会导致monaca焦点无法主动失焦)
            if (document.activeElement !== null) {
                // @ts-ignore
                document.activeElement.blur()
            }
            const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
            newAreaInfo.forEach((item, idx) => {
                item.elements.forEach((itemIn, idxin) => {
                    if (itemIn.id === tabsId) {
                        itemIn.files.forEach((file, idxinin) => {
                            newAreaInfo[idx].elements[idxin].files[idxinin] = {...file, isActive: idxinin === index}
                        })
                    }
                })
            })
            if (info.path !== activeFile?.path) {
                const newActiveFile = await getDefaultActiveFile(info)
                setActiveFile && setActiveFile(newActiveFile)
            }
            setAreaInfo && setAreaInfo(newAreaInfo)
        } catch (error) {}
    })

    const closeTabItem = useMemoizedFn((e) => {
        e.stopPropagation()
        onRemoveCurrent(info)
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
                            [styles["selected"]]: info.isActive,
                            [styles["active"]]: activeFile?.path === info.path
                        })}
                    >
                        <div
                            className={styles["item-wrapper"]}
                            onClick={onActiveFile}
                            onContextMenu={() => handleContextMenu(info)}
                        >
                            <img src={KeyToIcon[info.icon].iconPath} />
                            <div className={styles["text-style"]}>{info.name}</div>
                            <div
                                className={classNames(styles["extra-icon"], {
                                    [styles["extra-icon-dot"]]: info.isUnSave && info.code.length > 0
                                })}
                            >
                                {/* 未保存的提示点 */}
                                <div className={styles["dot"]} />
                                {/* 关闭 */}
                                <YakitButton
                                    className={styles["del-btn"]}
                                    type='text2'
                                    size='small'
                                    icon={<OutlineXIcon />}
                                    onClick={closeTabItem}
                                />
                            </div>
                        </div>
                    </div>
                )
            }}
        </Draggable>
    )
})

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
                        // 仅初次进入 或切换时更新详情
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

    // 更新编辑器文件内容(由于全局未使用到activeFile-code字段，为减少渲染，暂不更新)
    const updateAreaInputInfo = useMemoizedFn((content: string) => {
        const newAreaInfo = updateAreaFileInfo(areaInfo, {code: content}, editorInfo?.path)
        // console.log("更新编辑器文件内容", newAreaInfo)
        if (editorInfo) {
            setEditorInfo({...editorInfo, code: content})
        }
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 更新当前底部展示信息
    const updateBottomEditorDetails = useMemoizedFn(async () => {
        if (!editorInfo) return
        let newActiveFile = editorInfo
        // 注入语法检查结果
        newActiveFile = await getDefaultActiveFile(newActiveFile)
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
        const newAreaInfo = updateAreaFileInfo(areaInfo, newActiveFile, newActiveFile.path)
        // console.log("更新当前底部展示信息", newActiveFile, newAreaInfo)
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
        console.log("更新光标位置", editorInfo)

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
            isFirstRef.current = false
        } else {
            updatePosition()
        }
    }, [editorInfo?.position])

    return (
        <div className={styles["runner-tab-pane"]}>
            <YakitEditor
                editorDidMount={(editor) => {
                    setReqEditor(editor)
                }}
                type={editorInfo?.language || "yak"}
                value={editorInfo?.code || ""}
                setValue={(content: string) => {
                    updateAreaInputInfo(content)
                }}
            />
        </div>
    )
})

export const YakRunnerWelcomePage: React.FC<YakRunnerWelcomePageProps> = memo((props) => {
    // 新建文件
    const createFile = useMemoizedFn(()=>{
        
    })

    // 打开文件
    const openFile = useMemoizedFn(()=>{

    })

    // 打开文件夹
    const openFolder = useMemoizedFn(() => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件夹",
                properties: ["openDirectory"]
            })
            .then((data: any) => {
                if (data.filePaths.length) {
                    let absolutePath: string = data.filePaths[0].replace(/\\/g, "\\")
                    console.log("打开文件夹路径", absolutePath)
                }
            })
    })

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
                    <div className={classNames(styles["btn-style"], styles["btn-open-file"])} onClick={openFile}>
                        <div className={styles["btn-title"]}>
                            <YakRunnerOpenFileIcon />
                            打开文件
                        </div>
                        <OutlineImportIcon className={styles["icon-style"]} />
                    </div>
                    <div className={classNames(styles["btn-style"], styles["btn-open-folder"])} onClick={openFolder}>
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
