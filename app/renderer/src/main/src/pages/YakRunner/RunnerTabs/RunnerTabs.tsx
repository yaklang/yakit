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
    SplitDirectionProps,
    YakitRunnerSaveModalProps
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
import {FileDefault, FileSuffix, KeyToIcon} from "../FileTree/icon"
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
import {useDebounceFn, useLongPress, useMemoizedFn, useThrottleFn, useUpdate, useUpdateEffect} from "ahooks"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {AreaInfoProps, TabFileProps, YakRunnerHistoryProps} from "../YakRunnerType"
import {IMonacoEditor} from "@/utils/editors"
import {
    addAreaFileInfo,
    getCodeByPath,
    getDefaultActiveFile,
    getOpenFileInfo,
    getYakRunnerHistory,
    onSyntaxCheck,
    removeAreaFileInfo,
    renameByFile,
    saveCodeByFile,
    setYakRunnerHistory,
    updateAreaFileInfo
} from "../utils"
import {IMonacoEditorMarker} from "@/utils/editorMarkers"
import cloneDeep from "lodash/cloneDeep"
import {failed, info, warn, success} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {Divider, Upload} from "antd"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {v4 as uuidv4} from "uuid"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {openABSFileLocated} from "@/utils/openWebsite"
import {ScrollProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {JumpToEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import moment from "moment"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"

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

    const [modalInfo, setModalInfo] = useState<FileDetailInfo>()
    const [isShowModal, setShowModal] = useState<boolean>(false)

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

    // 关闭项是否包含激活展示文件
    const isResetActiveFile = (files: FileDetailInfo[]) => {
        files.forEach((file) => {
            if (file.path === activeFile?.path) {
                setActiveFile && setActiveFile(undefined)
            }
        })
    }

    const onRemoveFun = useMemoizedFn((info: FileDetailInfo) => {
        isResetActiveFile([info])
        const newAreaInfo = removeAreaFileInfo(areaInfo, info)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 关闭当前项
    const onRemoveCurrent = useMemoizedFn((info: FileDetailInfo) => {
        if (info.isUnSave && info.code.length > 0) {
            setShowModal(true)
            setModalInfo(info)
            return
        }
        onRemoveFun(info)
    })

    // 需要用户判断是否保存的列表
    const [waitSaveList, setWaitSaveList] = useState<FileDetailInfo[]>([])
    // 关闭其他项
    const [waitRemoveOtherItem, setWaitRemoveOtherItem] = useState<FileDetailInfo>()
    // 关闭所有项
    const [waitRemoveAll, setWaitRemoveAll] = useState<boolean>(false)

    // 保存提示队列
    useUpdateEffect(() => {
        if (waitSaveList.length > 0) {
            const info = waitSaveList[waitSaveList.length - 1]
            setShowModal(true)
            setModalInfo(info)
        }
        if (waitSaveList.length === 0 && waitRemoveOtherItem) {
            onRemoveOther(waitRemoveOtherItem)
        }
        if (waitSaveList.length === 0 && waitRemoveAll) {
            onRemoveAll()
        }
    }, [waitSaveList, waitRemoveOtherItem, waitRemoveAll])

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
        // 不存在未保存项目时 直接关闭项目
        if (waitRemoveArr.length === 0) {
            isResetActiveFile(closeArr)
            setAreaInfo && setAreaInfo(newAreaInfo)
            setWaitRemoveOtherItem(undefined)
        }
        // 等待未保存项目处理完后，再调用 onRemoveOther
        else {
            setWaitSaveList(waitRemoveArr)
            setWaitRemoveOtherItem(info)
        }
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
        if (waitRemoveArr.length === 0) {
            isResetActiveFile(closeArr)
            setAreaInfo && setAreaInfo(newAreaInfo)
            setWaitRemoveAll(false)
        } else {
            setWaitSaveList(waitRemoveArr)
            setWaitRemoveAll(true)
        }
    })

    // 重命名
    const onRename = useMemoizedFn((info: FileDetailInfo) => {
        let newName: string = info.name
        const m = showYakitModal({
            title: "重命名",
            content: (
                <div style={{padding: 20}}>
                    <YakitInput
                        defaultValue={info.name}
                        placeholder='请输入新名称'
                        allowClear
                        onChange={(e) => {
                            const {value} = e.target
                            newName = value
                        }}
                    />
                </div>
            ),
            onCancel: () => {
                m.destroy()
            },
            onOk: async () => {
                if(info.name === newName){
                    m.destroy()
                    return
                }
                if (newName.length === 0) {
                    warn("请输入新名称")
                    return
                }
                // 保存后的文件需要根据路径调用改名接口
                if (!info.isUnSave) {
                    const newPath = await renameByFile(info, newName)
                    const newAreaInfo = updateAreaFileInfo(areaInfo, {...info, name: newName, path: newPath}, info.path)
                    isResetActiveFile([info])
                    setAreaInfo && setAreaInfo(newAreaInfo)
                } else {
                    // 未保存文件直接更改文件树
                    const newAreaInfo = updateAreaFileInfo(areaInfo, {...info, name: newName}, info.path)
                    isResetActiveFile([info])
                    setAreaInfo && setAreaInfo(newAreaInfo)
                }
                m.destroy()
            },
            width: 400
        })
    })

    // 在文件夹中显示
    const onOpenFolder = useMemoizedFn((info: FileDetailInfo) => {
        openABSFileLocated(info.path)
    })

    // 在文件列表显示
    const onOpenFileList = useMemoizedFn((info: FileDetailInfo) => {})

    const menuData = useMemoizedFn((info: FileDetailInfo) => {
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
                label: "重命名",
                key: "rename"
            },
            {
                label: "在文件夹中显示",
                key: "openFolder",
                disabled: info.isUnSave
            },
            {
                label: "在文件列表显示",
                key: "openFileList",
                disabled: info.isUnSave
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
                    case "rename":
                        onRename(info)
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
            {modalInfo && (
                <YakitRunnerSaveModal
                    isShowModal={isShowModal}
                    setShowModal={setShowModal}
                    info={modalInfo}
                    onRemoveFun={onRemoveFun}
                    waitSaveList={waitSaveList}
                    setWaitSaveList={setWaitSaveList}
                    setWaitRemoveOtherItem={setWaitRemoveOtherItem}
                    setWaitRemoveAll={setWaitRemoveAll}
                />
            )}
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

    // 自动保存
    const autoSaveCurrentFile = useDebounceFn(
        (newEditorInfo: FileDetailInfo) => {
            saveCodeByFile(newEditorInfo)
        },
        {
            wait: 500
        }
    )

    // 更新编辑器文件内容(activeFile-code字段在光标位置改变时就已更新，为减少渲染，则不更新)
    const updateAreaInputInfo = useMemoizedFn((content: string) => {
        const newAreaInfo = updateAreaFileInfo(areaInfo, {code: content}, editorInfo?.path)
        // console.log("更新编辑器文件内容", newAreaInfo)
        if (editorInfo) {
            const newEditorInfo = {...editorInfo, code: content}
            autoSaveCurrentFile.run(newEditorInfo)
            setEditorInfo(newEditorInfo)
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

    // 选中光标位置
    const onJumpEditorDetailFun = useMemoizedFn((data) => {
        try {
            const obj: JumpToEditorProps = JSON.parse(data)
            const {id, selections} = obj
            if (reqEditor && editorInfo?.path === id) {
                reqEditor?.setSelection(selections)
            }
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onJumpEditorDetail", onJumpEditorDetailFun)
        return () => {
            emiter.off("onJumpEditorDetail", onJumpEditorDetailFun)
        }
    }, [])

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
    const {addFileTab} = props

    const {areaInfo, activeFile} = useStore()
    const {setAreaInfo, setActiveFile} = useDispatcher()

    const [historyList, setHistoryList] = useState<YakRunnerHistoryProps[]>([])

    const getHistoryList = useMemoizedFn(async () => {
        const list = await getYakRunnerHistory()
        setHistoryList(list)
    })
    useEffect(() => {
        getHistoryList()
    }, [])

    // 通过路径打开文件
    const openFileByPath = useMemoizedFn(async (path: string, name: string) => {
        // 由于此处的打开文件 不存在已打开文件 故无需校验
        const code = await getCodeByPath(path)
        const suffix = name.indexOf(".") > -1 ? name.split(".").pop() : ""
        const scratchFile: FileDetailInfo = {
            name,
            code,
            icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
            isActive: true,
            openTimestamp: moment().unix(),
            // 此处赋值 path 用于拖拽 分割布局等UI标识符操作
            path,
            language: name.split(".").pop() === "yak" ? "yak" : "http"
        }
        // 注入语法检测
        const syntaxActiveFile = {...(await getDefaultActiveFile(scratchFile))}
        const {newAreaInfo, newActiveFile} = addAreaFileInfo(areaInfo, syntaxActiveFile, activeFile)
        setAreaInfo && setAreaInfo(newAreaInfo)
        setActiveFile && setActiveFile(newActiveFile)

        // 创建文件时接入历史记录
        const history: YakRunnerHistoryProps = {
            isFile: true,
            name,
            path
        }
        setYakRunnerHistory(history)
    })

    // 打开文件
    const openFile = useMemoizedFn(async () => {
        try {
            const openFileInfo = await getOpenFileInfo()
            if (openFileInfo) {
                const {path, name} = openFileInfo
                openFileByPath(path, name)
            }
        } catch (error) {}
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
                    emiter.emit("onOpenFolderList", absolutePath)
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
                    <div className={classNames(styles["btn-style"], styles["btn-new-file"])} onClick={addFileTab}>
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
                    {historyList.slice(0, 3).map((item, index) => {
                        return (
                            <div
                                key={item.path}
                                className={styles["list-opt"]}
                                onClick={() => {
                                    if (item.isFile) {
                                        openFileByPath(item.path, item.name)
                                    } else {
                                        emiter.emit("onOpenFolderList", item.path)
                                    }
                                }}
                            >
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

export const YakitRunnerSaveModal: React.FC<YakitRunnerSaveModalProps> = (props) => {
    const {
        isShowModal,
        setShowModal,
        info,
        onRemoveFun,
        waitSaveList,
        setWaitSaveList,
        setWaitRemoveOtherItem,
        setWaitRemoveAll
    } = props
    const {setActiveFile, setAreaInfo} = useDispatcher()
    const {areaInfo} = useStore()

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

    const onCancle = useMemoizedFn(() => {
        // 重置保存队列
        setWaitRemoveAll(false)
        setWaitRemoveOtherItem(undefined)
        setWaitSaveList([])

        setShowModal(false)
    })

    const onUnSave = useMemoizedFn(() => {
        if (waitSaveList.length > 0) {
            // 减少保存队列
            setWaitSaveList(waitSaveList.slice(0, -1))
        }

        onRemoveFun(info)
        setShowModal(false)
    })

    const onSaveFile = useMemoizedFn(() => {
        setShowModal(false)
        ipcRenderer.invoke("show-save-dialog", `${codePath}${codePath ? "/" : ""}${info.name}`).then(async (res) => {
            const path = res.filePath
            const name = res.name
            if (path.length > 0) {
                const suffix = name.split(".").pop()

                const file: FileDetailInfo = {
                    ...info,
                    path,
                    isUnSave: false,
                    language: suffix === "yak" ? suffix : "http"
                }
                await saveCodeByFile(file)
                success("保存成功")
                // 如若更改后的path与 areaInfo 中重复则需要移除原有数据
                const removeAreaInfo = removeAreaFileInfo(areaInfo, file)
                const newAreaInfo = updateAreaFileInfo(removeAreaInfo, file, info.path)
                setAreaInfo && setAreaInfo(newAreaInfo)
                setActiveFile && setActiveFile(file)

                if (waitSaveList.length > 0) {
                    // 减少保存队列
                    setWaitSaveList(waitSaveList.slice(0, -1))
                }

                // 创建文件时接入历史记录
                const history: YakRunnerHistoryProps = {
                    isFile: true,
                    name,
                    path
                }
                setYakRunnerHistory(history)
            } else {
                warn("未获取保存路径，取消保存")
                onCancle()
            }
        })
    })

    return (
        <YakitModal
            title='文件未保存'
            closable={false}
            width={400}
            type={"white"}
            visible={isShowModal}
            onCancel={() => setShowModal(false)}
            footer={null}
            className={styles["yakit-runner-save-modal"]}
            bodyStyle={{padding: 0}}
        >
            <div style={{margin: "10px 24px"}}>是否要保存{info.name}里面的内容吗？</div>
            <div style={{padding: "0px 24px 24px", display: "flex", gap: 12, justifyContent: "end"}}>
                <YakitButton type='text2' onClick={onCancle}>
                    取消
                </YakitButton>
                <YakitButton type='text' onClick={onUnSave}>
                    不保存
                </YakitButton>
                <YakitButton type='primary' onClick={onSaveFile}>
                    保存
                </YakitButton>
            </div>
        </YakitModal>
    )
}
