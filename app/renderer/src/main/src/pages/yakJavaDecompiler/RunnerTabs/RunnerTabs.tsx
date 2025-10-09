import React, {Fragment, memo, useEffect, useMemo, useRef, useState} from "react"
import {
    Selection,
    CursorPosition,
    FileDetailInfo,
    RunnerTabBarItemProps,
    RunnerTabBarProps,
    RunnerTabPaneProps,
    RunnerTabsProps,
    SplitDirectionProps,
    YakJavaDecompilerWelcomePageProps
} from "./RunnerTabsType"
import {Droppable, Draggable} from "@hello-pangea/dnd"

import classNames from "classnames"
import styles from "./RunnerTabs.module.scss"
import {KeyToIcon} from "../../yakRunner/FileTree/icon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineChevrondoubleleftIcon,
    OutlineChevrondoublerightIcon,
    OutlineImportIcon,
    OutlineSplitScreenIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {YakRunnerOpenFileIcon, YakRunnerOpenFolderIcon} from "../icon"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {useDebounceFn, useLongPress, useMemoizedFn, useSize, useThrottleFn, useUpdate, useUpdateEffect} from "ahooks"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {AreaInfoProps, TabFileProps, YakJavaDecompilerHistoryProps} from "../YakJavaDecompilerType.d"
import {IMonacoEditor} from "@/utils/editors"
import {
    getYakJavaDecompilerHistory,
    isResetJavaDecompilerActiveFile,
    removeJavaDecompilerAreaFileInfo,
    updateJavaDecompilerAreaFileInfo
} from "../utils"
import cloneDeep from "lodash/cloneDeep"
import {failed, info, warn, success} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {Divider, Result, Upload} from "antd"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {v4 as uuidv4} from "uuid"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {ScrollProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {getMapFileDetail} from "../FileTreeMap/FileMap"
import {isAcceptEligible} from "@/components/yakitUI/YakitForm/YakitForm"
import {getOpenFileInfo} from "@/pages/yakRunner/utils"

export const RunnerTabs: React.FC<RunnerTabsProps> = memo((props) => {
    const {tabsId, wrapperClassName} = props
    const {areaInfo, activeFile} = useStore()
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

    const onActiveItem = useMemo(() => {
        const tabsItem = tabsList.filter((item) => {
            return item.isActive
        })
        if (tabsItem.length > 0) {
            return tabsItem[0]
        }
        return null
    }, [tabsList])

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
                if (newAreaInfo.length <= 1) {
                    newAreaInfo.unshift({
                        elements: [moveItem]
                    })
                } else {
                    newAreaInfo[0].elements.push(moveItem)
                }
            }
            if (direction === "bottom") {
                if (newAreaInfo.length <= 1) {
                    newAreaInfo.push({
                        elements: [moveItem]
                    })
                } else {
                    newAreaInfo[1].elements.push(moveItem)
                }
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
        const {newAreaInfo, newActiveFile} = removeJavaDecompilerAreaFileInfo(areaInfo, info)
        setActiveFile && setActiveFile(newActiveFile)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 关闭当前项
    const onRemoveCurrent = useMemoizedFn((info: FileDetailInfo) => {
        onRemoveFun(info)
    })

    // 关闭其他项
    const onRemoveOther = useMemoizedFn((info: FileDetailInfo) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        let closeArr: FileDetailInfo[] = []
        let waitRemoveArr: FileDetailInfo[] = []
        newAreaInfo.forEach((item, idx) => {
            item.elements.forEach((itemIn, idxin) => {
                if (itemIn.id === tabsId) {
                    itemIn.files.forEach((file, fileIndex) => {
                        if (file.path === info.path) {
                            // 存在未保存项时暂不关闭(等待队列依次询问是否保存后关闭，如若点击取消则停止关闭)
                            waitRemoveArr = itemIn.files.filter((item) => item.path !== info.path && item.isUnSave)
                            // 需关闭项
                            closeArr = itemIn.files.filter((item) => item.path !== info.path)

                            // 剩余展示项
                            let onlyArr = itemIn.files
                                .filter((item) => item.path === info.path)
                                .map((item) => {
                                    if (item.path === info.path) {
                                        return {...item, isActive: true}
                                    }
                                    return {...item, isActive: false}
                                })
                            newAreaInfo[idx].elements[idxin].files = onlyArr
                        }
                    })
                }
            })
        })

        const newActiveFile = isResetJavaDecompilerActiveFile(closeArr, activeFile)
        setActiveFile && setActiveFile(newActiveFile)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 关闭所有
    const onRemoveAll = useMemoizedFn(() => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        let closeArr: FileDetailInfo[] = []
        let waitRemoveArr: FileDetailInfo[] = []
        newAreaInfo.forEach((item, idx) => {
            item.elements.forEach((itemIn, idxin) => {
                if (itemIn.id === tabsId) {
                    // 存在未保存项时暂不关闭(等待队列依次询问是否保存后关闭，如若点击取消则停止关闭)
                    waitRemoveArr = itemIn.files.filter((item) => item.isUnSave)
                    // 需关闭项
                    closeArr = itemIn.files
                    // 如若仅存在一项 则删除此大项并更新布局
                    if (item.elements.length > 1) {
                        newAreaInfo[idx].elements = item.elements.filter((item) => item.id !== tabsId)
                    } else if (item.elements.length <= 1) {
                        newAreaInfo.splice(idx, 1)
                    }
                }
            })
        })

        const newActiveFile = isResetJavaDecompilerActiveFile(closeArr, activeFile)
        setActiveFile && setActiveFile(newActiveFile)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    const menuData = useMemoizedFn((info: FileDetailInfo) => {
        const inFileTree = getMapFileDetail(info.path)
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
            }
        ]
        if (splitDirection.length > 0) {
            let direction: YakitMenuItemType[] = splitDirection.map((item) => {
                return {
                    label: onDirectionToName(item),
                    key: item
                }
            })
            return [...base, {type: "divider"}, ...direction] as YakitMenuItemType[]
        }
        return [...base]
    })

    // 右键菜单
    const handleContextMenu = useMemoizedFn((info: FileDetailInfo) => {
        showByRightContext({
            width: 180,
            type: "grey",
            data: menuData(info),
            onClick: ({key, keyPath}) => {
                switch (key) {
                    case "removeCurrent":
                        onRemoveCurrent(info)
                        return
                    case "removeOther":
                        onRemoveOther(info)
                        return
                    case "removeAll":
                        onRemoveAll()
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
        return <div className={styles["extra-box"]}>{onSplitTabBar()}</div>
    })

    return (
        <div className={classNames(styles["runner-tabs"], wrapperClassName || "")}>
            {tabsList.length > 0 ? (
                <>
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
                </>
            ) : (
                <></>
            )}
            <></>
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

    const ref = useRef(null)
    const size = useSize(ref)
    const onScrollTabMenu = useThrottleFn(
        () => {
            if (tabMenuSubRef.current) {
                const {scrollWidth, scrollLeft, clientWidth} = tabMenuSubRef.current
                const scrollRight = scrollWidth - scrollLeft - clientWidth
                setScroll({
                    ...scroll,
                    scrollLeft,
                    scrollRight
                })
            }
        },
        {wait: 200}
    ).run

    useUpdateEffect(() => {
        onScrollTabMenu()
    }, [tabsList, size?.width])

    return (
        <div className={classNames(styles["runner-tab-bar"])} ref={ref}>
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
                setActiveFile && setActiveFile(info)
                if (info.parent) {
                    emiter.emit("onScrollToDecompilerTree", info.path)
                }
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
                            <div
                                className={classNames(styles["text-style"], {
                                    [styles["text-style-delete"]]: info.isDelete
                                })}
                            >
                                {info.name}
                            </div>
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
    // 是否允许展示二进制
    const [allowBinary, setAllowBinary] = useState<boolean>(false)

    const nowPathRef = useRef<string>()
    useEffect(() => {
        areaInfo.forEach((item) => {
            item.elements.forEach((itemIn) => {
                if (itemIn.id === tabsId) {
                    itemIn.files.forEach((file) => {
                        // 仅初次进入 或(切换/更新高亮显示区域)时更新详情
                        if (
                            file.isActive &&
                            (!editorInfo ||
                                (editorInfo && editorInfo.path !== file.path) ||
                                (editorInfo &&
                                    JSON.stringify(editorInfo.highLightRange) !== JSON.stringify(file.highLightRange)))
                        ) {
                            // 更新编辑器展示项
                            nowPathRef.current = file.path
                            setEditorInfo(file)
                            setAllowBinary(false)
                        }
                    })
                }
            })
        })
    }, [areaInfo, reqEditor])

    // 光标位置信息
    const positionRef = useRef<CursorPosition>()
    const selectionRef = useRef<Selection>()

    // 优化性能 减少卡顿
    const updateAreaFun = useDebounceFn(
        (content: string) => {
            if (editorInfo?.path) {
                const newAreaInfo = updateJavaDecompilerAreaFileInfo(areaInfo, {code: content}, editorInfo.path)
                // console.log("更新编辑器文件内容", newAreaInfo)
                setAreaInfo && setAreaInfo(newAreaInfo)
            }
        },
        {
            wait: 200
        }
    ).run

    // 更新编辑器文件内容(activeFile-code字段在光标位置改变时就已更新，为减少渲染，则不更新)
    const updateAreaInputInfo = useMemoizedFn((content: string) => {
        if (editorInfo) {
            const newEditorInfo = {...editorInfo, code: content}
            setEditorInfo(newEditorInfo)
        }
        if(content !== editorInfo?.code){
            updateAreaFun(content)
        }
    })

    // 更新当前底部展示信息
    const updateBottomEditorDetails = useDebounceFn(
        async () => {
            if (!editorInfo) return
            let newActiveFile = editorInfo
            // 如若文件检查结果出来时 文件已被切走 则不再更新
            if (newActiveFile.path !== nowPathRef.current) return
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
            const newAreaInfo = updateJavaDecompilerAreaFileInfo(areaInfo, newActiveFile, newActiveFile.path)
            // console.log("更新当前底部展示信息", newActiveFile, newAreaInfo)
            setAreaInfo && setAreaInfo(newAreaInfo)
        },
        {
            wait: 200
        }
    ).run

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
            // console.log("当前光标位置：", position)
            positionRef.current = position
            updateBottomEditorDetails()
        })
        // 监听光标选中位置
        const cursorSelection = reqEditor.onDidChangeCursorSelection((e) => {
            if (!isFocus) return
            const selection = e.selection
            const {startLineNumber, startColumn, endLineNumber, endColumn} = selection
            // console.log("当前光标选中位置", startLineNumber, startColumn, endLineNumber, endColumn)
            selectionRef.current = {startLineNumber, startColumn, endLineNumber, endColumn}
            // 选中时也调用了onDidChangeCursorPosition考虑优化掉重复调用
            // updateBottomEditorDetails()
        })
        // 监听编辑器是否聚焦
        const focusEditor = reqEditor.onDidFocusEditorWidget(() => {
            isFocus = true
            // console.log("聚焦", reqEditor.getPosition())
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
            // console.log("失焦")
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
        // console.log("更新光标位置", editorInfo)
        if (reqEditor && editorInfo) {
            // 如若没有记录 默认1行1列
            const {position = {lineNumber: 1, column: 1}, selections} = editorInfo
            const {lineNumber, column} = position
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

    // 此处ref存在意义为清除ctrl + z缓存 同时更新光标位置
    useUpdateEffect(() => {
        if (reqEditor && editorInfo) {
            reqEditor.setValue(editorInfo.code)
            updatePosition()
        }
    }, [editorInfo?.path])

    // 打开二进制文件
    const onOpenBinary = useMemoizedFn(() => {
        if (!editorInfo) return
        setAllowBinary(true)
        const newAreaInfo = updateJavaDecompilerAreaFileInfo(
            areaInfo,
            {...editorInfo, isPlainText: true},
            editorInfo.path
        )
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 下载当前活动标签页的内容
    const downloadDecompiledFile = useMemoizedFn(() => {
        if (!activeFile) {
            return
        }
        const fileName = activeFile.name
        const a = document.createElement("a")
        const blob = new Blob([activeFile.code], {type: "text/plain"})
        a.href = URL.createObjectURL(blob)

        // 如果是class文件，将下载的文件名改为.java
        const downloadName = fileName.endsWith(".class") ? fileName.replace(".class", ".java") : fileName

        a.download = downloadName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    })

    const setReqEditorFun = useMemoizedFn((editor: IMonacoEditor) => {
        setReqEditor(editor)
    })

    return (
        <div className={styles["runner-tab-pane"]}>
            {editorInfo && !editorInfo.isPlainText && !allowBinary ? (
                <div className={styles["warning-editor"]}>
                    <Result
                        status={"warning"}
                        // title={"此文件是二进制文件或使用了不受支持的文本编码，所以无法在文本编辑器中显示。"}
                        subTitle={"此文件是二进制文件或使用了不受支持的文本编码，所以无法在文本编辑器中显示。"}
                        extra={[
                            <YakitButton size='max' type='primary' onClick={onOpenBinary}>
                                仍然打开
                            </YakitButton>
                        ]}
                    />
                </div>
            ) : (
                <YakitEditor
                    readOnly={true}
                    editorOperationRecord='YAK_RUNNNER_EDITOR_RECORF'
                    editorDidMount={setReqEditorFun}
                    type={editorInfo?.language}
                    value={editorInfo?.code || ""}
                    setValue={updateAreaInputInfo}
                    highLightText={editorInfo?.highLightRange ? [editorInfo?.highLightRange] : undefined}
                    highLightClass='hight-light-yak-runner-color'
                    contextMenu={{
                        download: {
                            menu: [{key: "download", label: "下载"}],
                            onRun: (editor, key) => {
                                downloadDecompiledFile()
                            }
                        }
                    }}
                />
            )}
        </div>
    )
})

export const YakJavaDecompilerWelcomePage: React.FC<YakJavaDecompilerWelcomePageProps> = memo((props) => {
    const ref = useRef<HTMLDivElement>(null)
    const size = useSize(ref)
    const [historyList, setHistoryList] = useState<YakJavaDecompilerHistoryProps[]>([])

    const getHistoryList = useMemoizedFn(async () => {
        try {
            const list = await getYakJavaDecompilerHistory()
            setHistoryList(list)
        } catch (error) {}
    })
    useEffect(() => {
        getHistoryList()
    }, [])

    // 打开文件
    const openFile = useMemoizedFn(async () => {
        try {
            const openFileInfo = await getOpenFileInfo()
            if (openFileInfo) {
                const {path, name} = openFileInfo
                if (!isAcceptEligible(path, ".jar,.war,.ear")) {
                    failed(`仅支持.jar,.war,.ear格式的文件`)
                    return
                }
                emiter.emit("onOpenDecompilerTree", path)
            }
        } catch (error) {}
    })

    return (
        <div className={styles["yak-runner-welcome-page"]} ref={ref}>
            <div className={styles["title"]}>
                <div className={styles["icon-style"]}>
                    <SolidYakCattleNoBackColorIcon />
                </div>
                <div className={styles["header-style"]}>欢迎使用 Java 反编译</div>
            </div>
            <div className={styles["operate-box"]} style={size && size.width < 600 ? {padding: "0px 20px"} : {}}>
                <div className={styles["operate"]}>
                    <div className={styles["title-style"]}>快捷创建</div>
                    <div className={styles["operate-btn-group"]}>
                        <div className={classNames(styles["btn-style"], styles["btn-open-file"])} onClick={openFile}>
                            <div className={styles["btn-title"]}>
                                <YakRunnerOpenFileIcon />
                                点击 JAR 文件到此处反编译
                                <span className={styles["sub-title"]}>支持 .jar, .war, .ear 文件</span>
                            </div>
                            <OutlineImportIcon className={styles["icon-style"]} />
                        </div>
                    </div>
                </div>

                <div className={styles["recent-open"]}>
                    <div className={styles["title-style"]}>最近打开</div>
                    <div className={styles["recent-list"]}>
                        {historyList.slice(0, 3).map((item, index) => {
                            return (
                                <div
                                    key={item.path}
                                    className={styles["list-opt"]}
                                    onClick={() => {
                                        emiter.emit("onOpenDecompilerTree", item.path)
                                    }}
                                >
                                    <div className={styles["file-name"]}>{item.name}</div>
                                    <div className={classNames(styles["file-path"], "yakit-single-line-ellipsis")}>
                                        {item.path}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
})
