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
    YakitRunnerSaveModalProps,
    AuditCodeWelcomePageProps,
    WidgetClickTypeProps,
    CodeScanMonacoWidgetProps,
    WidgetControlProps
} from "./RunnerTabsType"
import {Droppable, Draggable} from "@hello-pangea/dnd"

import classNames from "classnames"
import styles from "./RunnerTabs.module.scss"
import {KeyToIcon} from "../FileTree/icon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlinCompileIcon,
    OutlineChevrondoubleleftIcon,
    OutlineChevrondoublerightIcon,
    OutlineImportIcon,
    OutlineSplitScreenIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {RuleManagementAuditIcon, SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {YakRunnerOpenAuditIcon, YakRunnerOpenFileIcon} from "@/pages/yakRunner/icon"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {useDebounceFn, useLongPress, useMemoizedFn, useSize, useThrottleFn, useUpdate, useUpdateEffect} from "ahooks"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {AreaInfoProps, OpenFileByPathProps, TabFileProps, YakRunnerHistoryProps} from "../YakRunnerAuditCodeType"
import {IMonacoEditor} from "@/utils/editors"
import cloneDeep from "lodash/cloneDeep"
import {failed, info, warn, success} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {Divider, Result, Upload} from "antd"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {v4 as uuidv4} from "uuid"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {openABSFileLocated} from "@/utils/openWebsite"
import {ScrollProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {getMapFileDetail, removeMapFileDetail, setMapFileDetail} from "../FileTreeMap/FileMap"
import {getMapFolderDetail, setMapFolderDetail} from "../FileTreeMap/ChildMap"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {FileNodeMapProps} from "../FileTree/FileTreeType"
import {Position} from "monaco-editor"
import {
    getWordWithPointAtPosition,
    YaklangLanguageFindResponse,
    YaklangLanguageSuggestionRequest
} from "@/utils/monacoSpec/yakCompletionSchema"
import {getModelContext} from "@/utils/monacoSpec/yakEditor"
import {
    getDefaultActiveFile,
    getOpenFileInfo,
    getPathParent,
    getYakRunnerHistory,
    grpcFetchAuditTree,
    grpcFetchCreateFile,
    grpcFetchRenameFileTree,
    grpcFetchSaveFile,
    isResetActiveFile,
    judgeAreaExistFilePath,
    monacaLanguageType,
    removeAreaFileInfo,
    setYakRunnerHistory,
    updateAreaFileInfo
} from "../utils"
import {editor as newEditor} from "monaco-editor"
import {YakitIMonacoEditor} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {createRoot} from "react-dom/client"
import MonacoEditor, {monaco} from "react-monaco-editor"
import {JumpToAuditEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {getMapAllResultKey, getMapResultDetail} from "../RightAuditDetail/ResultMap"
import {GraphInfoProps, JumpSourceDataProps, onJumpRunnerFile} from "../RightAuditDetail/RightAuditDetail"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {CountDirectionProps} from "@/pages/fuzzer/HTTPFuzzerEditorMenu"

const {ipcRenderer} = window.require("electron")

export const RunnerTabs: React.FC<RunnerTabsProps> = memo((props) => {
    const {tabsId, wrapperClassName} = props
    const {areaInfo, activeFile} = useStore()
    const {setActiveFile, setAreaInfo} = useDispatcher()
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
        const newActiveFile = isResetActiveFile([info], activeFile)
        const newAreaInfo = removeAreaFileInfo(areaInfo, info)
        setActiveFile && setActiveFile(newActiveFile)
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

    const onCloseFileFun = useMemoizedFn((path: string) => {
        tabsList.some((file) => {
            if (file.path === path) {
                onRemoveCurrent(file)
            }
            return file.path === path
        })
    })

    useEffect(() => {
        emiter.on("onCodeAuditCloseFile", onCloseFileFun)
        return () => {
            emiter.off("onCodeAuditCloseFile", onCloseFileFun)
        }
    }, [])

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
            const newActiveFile = isResetActiveFile(closeArr, activeFile)
            setActiveFile && setActiveFile(newActiveFile)
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
            const newActiveFile = isResetActiveFile(closeArr, activeFile)
            setActiveFile && setActiveFile(newActiveFile)
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
                <RenameYakitModalBox
                    name={info.name}
                    setName={(value) => {
                        newName = value
                    }}
                />
            ),
            onCancel: () => {
                m.destroy()
            },
            onOk: async () => {
                if (info.name === newName) {
                    m.destroy()
                    return
                }
                if (newName.length === 0) {
                    warn("请输入新名称")
                    return
                }
                // 保存后的文件需要根据路径调用改名接口
                if (!info.isUnSave) {
                    try {
                        const result = await grpcFetchRenameFileTree(info.path, newName, info.parent)
                        const {path, name, parent} = result[0]
                        // 存在则更改
                        const fileMap = getMapFileDetail(info.path)
                        if (fileMap.name !== "读取文件失败" && !fileMap.path.endsWith("-fail")) {
                            // 移除原有文件数据
                            removeMapFileDetail(info.path)
                            // 新增文件树数据
                            setMapFileDetail(path, result[0])
                        }

                        let cacheAreaInfo = areaInfo

                        // 获取重命名文件所在存储结构
                        if (info.parent) {
                            let folderMap = getMapFolderDetail(info.parent)
                            // 如若重命名为已有名称 则覆盖
                            if (folderMap.includes(path)) {
                                const file = await judgeAreaExistFilePath(areaInfo, path)
                                if (file) {
                                    cacheAreaInfo = removeAreaFileInfo(areaInfo, file)
                                }
                                folderMap = folderMap.filter((item) => item !== path)
                            }
                            const newFolderMap = folderMap.map((item) => {
                                if (item === info.path) return path
                                return item
                            })
                            setMapFolderDetail(info.parent, newFolderMap)
                        }

                        // 修改分栏数据
                        const newAreaInfo = updateAreaFileInfo(cacheAreaInfo, {...info, name, path}, info.path)
                        // 更名后重置激活元素
                        const newActiveFile = isResetActiveFile([info], activeFile)
                        setActiveFile && setActiveFile(newActiveFile)
                        setAreaInfo && setAreaInfo(newAreaInfo)
                        emiter.emit("onCodeAuditRefreshFileTree")
                    } catch (error) {
                        failed("保存失败")
                    }
                } else {
                    // 未保存文件直接更改文件树
                    const newAreaInfo = updateAreaFileInfo(areaInfo, {...info, name: newName}, info.path)
                    const newActiveFile = isResetActiveFile([info], activeFile)
                    setActiveFile && setActiveFile(newActiveFile)
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
                const newActiveFile = await getDefaultActiveFile(info)
                setActiveFile && setActiveFile(newActiveFile)
                if (info.parent || info.fileSourceType === "audit") {
                    emiter.emit("onCodeAuditScrollToFileTree", info.path)
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
    const {areaInfo, activeFile, projectName} = useStore()
    const {setAreaInfo, setActiveFile} = useDispatcher()
    const [editorInfo, setEditorInfo] = useState<FileDetailInfo>()
    // 编辑器实例
    const [editor, setEditor] = useState<IMonacoEditor>()
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
    }, [areaInfo, editor])

    // 光标位置信息
    const positionRef = useRef<CursorPosition>()
    const selectionRef = useRef<Selection>()

    // 自动保存
    const autoSaveCurrentFile = useDebounceFn(
        (newEditorInfo: FileDetailInfo) => {
            const {path, code} = newEditorInfo
            grpcFetchSaveFile(path, code)
        },
        {
            wait: 500
        }
    )

    // 优化性能 减少卡顿
    const updateAreaFun = useDebounceFn(
        (content: string) => {
            if (editorInfo?.path) {
                const newAreaInfo = updateAreaFileInfo(areaInfo, {code: content}, editorInfo.path)
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
            // 未保存文件不用自动保存 审计树文件不用自动保存
            if (!editorInfo?.isUnSave && editorInfo.fileSourceType === "file") {
                autoSaveCurrentFile.run(newEditorInfo)
            }
            setEditorInfo(newEditorInfo)
        }
        updateAreaFun(content)
    })

    // 更新当前底部展示信息
    const updateBottomEditorDetails = useDebounceFn(
        async () => {
            if (!editorInfo) return
            let newActiveFile = editorInfo
            // 注入语法检查结果
            newActiveFile = await getDefaultActiveFile(newActiveFile)
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
            const newAreaInfo = updateAreaFileInfo(areaInfo, newActiveFile, newActiveFile.path)
            // console.log("更新当前底部展示信息", newActiveFile, newAreaInfo)
            setAreaInfo && setAreaInfo(newAreaInfo)
        },
        {
            wait: 200
        }
    ).run

    const [highLightFind, setHighLightFind] = useState<Selection[]>([])
    // 获取编辑器中关联字符
    const getOtherRangeByPosition = useDebounceFn(
        async (position: Position) => {
            const model = editor?.getModel()
            if (!model || !editorInfo || editorInfo.fileSourceType === "file") return
            const iWord = getWordWithPointAtPosition(model, position)
            const type = getModelContext(model, "plugin") || "yak"
            if (iWord.word.length === 0) return

            await ipcRenderer
                .invoke("YaklangLanguageFind", {
                    InspectType: "reference",
                    YakScriptType: type,
                    YakScriptCode: "",
                    ModelID: model.id,
                    Range: {
                        Code: iWord.word,
                        StartLine: position.lineNumber,
                        StartColumn: iWord.startColumn,
                        EndLine: position.lineNumber,
                        EndColumn: iWord.endColumn
                    },
                    ProgramName: projectName,
                    FileName: editorInfo.path
                } as YaklangLanguageSuggestionRequest)
                .then((r: YaklangLanguageFindResponse) => {
                    const newFind = r.Ranges.map(({StartColumn, StartLine, EndColumn, EndLine}) => ({
                        startLineNumber: Number(StartLine),
                        startColumn: Number(StartColumn),
                        endLineNumber: Number(EndLine),
                        endColumn: Number(EndColumn)
                    }))
                    setHighLightFind(newFind)
                })
                .catch((err) => {
                    setHighLightFind([])
                })
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
        if (!editor) {
            return
        }
        let isFocus = false
        // 监听光标点击位置
        const cursorPosition = editor.onDidChangeCursorPosition((e) => {
            if (!isFocus) return
            const {position} = e
            // console.log("当前光标位置：", position)
            getOtherRangeByPosition(position)
            positionRef.current = position
            updateBottomEditorDetails()
        })
        // 监听光标选中位置
        const cursorSelection = editor.onDidChangeCursorSelection((e) => {
            if (!isFocus) return
            const selection = e.selection
            const {startLineNumber, startColumn, endLineNumber, endColumn} = selection
            // console.log("当前光标选中位置", startLineNumber, startColumn, endLineNumber, endColumn)
            selectionRef.current = {startLineNumber, startColumn, endLineNumber, endColumn}
            // 选中时也调用了onDidChangeCursorPosition考虑优化掉重复调用
            // updateBottomEditorDetails()
        })
        // 监听编辑器是否聚焦
        const focusEditor = editor.onDidFocusEditorWidget(() => {
            isFocus = true
            // console.log("聚焦", reqEditor.getPosition())
            // 此处获取光标位置的原因是由于点击空白区域焦点获取时 onDidChangeCursorPosition 无法监听
            if (editor.getPosition()) {
                const focusLineNumber = editor.getPosition()?.lineNumber
                const focusColumn = editor.getPosition()?.column
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
        const blurEditor = editor.onDidBlurEditorWidget(() => {
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
    }, [editor])

    // 更新光标位置
    const updatePosition = useMemoizedFn(() => {
        // console.log("更新光标位置", editorInfo)
        if (editor && editorInfo) {
            // 如若没有记录 默认1行1列
            const {position = {lineNumber: 1, column: 1}, selections} = editorInfo
            const {lineNumber, column} = position
            if (lineNumber && column) {
                editor.setPosition({lineNumber, column})
                editor.focus()
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
        if (editor && editorInfo) {
            editor.setValue(editorInfo.code)
            updatePosition()
        }
    }, [editorInfo?.path])

    // 选中光标位置
    const onJumpEditorDetailFun = useMemoizedFn((data) => {
        try {
            const obj: JumpToAuditEditorProps = JSON.parse(data)
            const {path, isSelect = true, selections} = obj

            if (editor && editorInfo?.path === path) {
                if (isSelect) {
                    editor.setSelection(selections)
                }
                editor.revealLineInCenter(selections.startLineNumber)
            }
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onCodeAuditJumpEditorDetail", onJumpEditorDetailFun)
        return () => {
            emiter.off("onCodeAuditJumpEditorDetail", onJumpEditorDetailFun)
        }
    }, [])

    // 打开二进制文件
    const onOpenBinary = useMemoizedFn(() => {
        if (!editorInfo) return
        setAllowBinary(true)
        const newAreaInfo = updateAreaFileInfo(areaInfo, {...editorInfo, isPlainText: true}, editorInfo.path)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    // 当前展示项
    const nowShowRef = useRef<FileDetailInfo>()
    // 代码扫描编辑器提示
    const editerMenuFun = (editor: YakitIMonacoEditor) => {
        if (!editorInfo?.highLightRange || !nowShowRef.current?.highLightRange?.source) return
        // 编辑器选中弹窗的唯一Id
        const rangeId: string = `monaco.range.code.scan.widget`

        // 动态计算Widget显示位置 尽可能显示齐全
        const editorContainer = editor.getDomNode()
        // 获取特定行和列的坐标
        let lineNumber: number = nowShowRef.current?.highLightRange?.endLineNumber || 0
        let column: number = nowShowRef.current?.highLightRange?.endColumn || 0
        const position = {lineNumber, column}
        const visiblePosition = editor.getScrolledVisiblePosition(position)
        // 位置信息
        let direction: CountDirectionProps = {}
        if (editorContainer && visiblePosition) {
            // editorContainerInfo为编辑器在页面中的位置
            const editorContainerInfo = editorContainer.getBoundingClientRect()
            const {top, bottom, left, right} = editorContainerInfo
            // visiblePosition为具体位置
            const {left: x, top: y} = visiblePosition
            // 判断焦点位置
            const isTopHalf = y < (bottom - top) / 2
            const isLeftHalf = x < (right - left) / 2
            if (isTopHalf) {
                // 位于编辑器上半部分
                direction.y = "top"
            } else {
                // 位于编辑器下半部分
                direction.y = "bottom"
            }
            if (Math.abs(x - (right - left) / 2) < 50) {
                // 位于编辑器中间部分
                direction.x = "middle"
            } else if (isLeftHalf) {
                // 位于编辑器左半部分
                direction.x = "left"
            } else {
                // 位于编辑器右半部分
                direction.x = "right"
            }
        }

        if (direction.x === "right" || direction.y === "bottom") {
            lineNumber = nowShowRef.current?.highLightRange?.startLineNumber || 0
            column = nowShowRef.current?.highLightRange?.startColumn || 0
        }

        // 编辑器选中显示的内容
        const fizzRangeWidget = {
            isOpen: false,
            // 在可能溢出编辑器视图dom节点的位置呈现此内容小部件
            allowEditorOverflow: true,
            getId: function () {
                return rangeId
            },
            getDomNode: function () {
                // 将TSX转换为DOM节点
                const domNode = document.createElement("div")
                // 解决弹窗内鼠标滑轮无法滚动的问题
                domNode.onwheel = (e) => e.stopPropagation()
                createRoot(domNode).render(
                    <CodeScanMonacoWidget
                        source={nowShowRef.current?.highLightRange?.source}
                        closeFizzRangeWidget={closeFizzRangeWidget}
                    />
                )
                return domNode
            },
            getPosition: function () {
                return {
                    position: {
                        lineNumber,
                        column
                    },
                    preference: [1]
                }
            },
            update: function () {
                // 更新小部件的位置
                this.getPosition()
                editor.layoutContentWidget(this)
            }
        }
        // 关闭选中的内容
        const closeFizzRangeWidget = () => {
            fizzRangeWidget.isOpen = false
            editor.removeContentWidget(fizzRangeWidget)
        }

        // 打开选中的内容
        const openFizzRangeWidget = () => {
            closeFizzRangeWidget()
            editor.addContentWidget(fizzRangeWidget)
            fizzRangeWidget.isOpen = true
        }

        // 编辑器更新 关闭之前展示
        closeFizzRangeWidget()
        openFizzRangeWidget()
        editor?.getModel()?.pushEOL(newEditor.EndOfLineSequence.CRLF)
    }

    const onRefreshWidgetFun = useMemoizedFn((value) => {
        try {
            if (!editorInfo) return
            const source: JumpSourceDataProps = JSON.parse(value)
            const {highLightRange} = editorInfo
            // 判断是否需要初始化 当关闭右侧审计结果重新打开时 无需重新恢复为第一项
            if (
                highLightRange &&
                highLightRange.source &&
                JSON.stringify(highLightRange.source.auditRightParams) === JSON.stringify(source.auditRightParams)
            )
                return

            if (highLightRange) {
                nowShowRef.current = {...editorInfo, highLightRange: {...highLightRange, source}}
            }
            editor && editerMenuFun(editor)
        } catch (error) {}
    })

    const onWidgetOpenAgainFun = useMemoizedFn((path) => {
        if (!editor) return
        if (activeFile?.path === path) {
            editerMenuFun(editor)
        }
    })

    useEffect(() => {
        emiter.on("onInitWidget", onRefreshWidgetFun)
        emiter.on("onWidgetOpenAgain", onWidgetOpenAgainFun)
        return () => {
            emiter.off("onInitWidget", onRefreshWidgetFun)
            emiter.off("onWidgetOpenAgain", onWidgetOpenAgainFun)
        }
    }, [])

    useEffect(() => {
        if (!editor) return
        nowShowRef.current = editorInfo
        setTimeout(() => {
            // 此处定时器作用为多文件切换时 需等待其内容渲染完毕，否则会导致位置信息错误
            editerMenuFun(editor)
        }, 50)
    }, [editor, editorInfo])

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
                    readOnly={editorInfo?.fileSourceType === "audit"}
                    editorOperationRecord='YAK_RUNNNER_EDITOR_RECORF'
                    editorDidMount={(editor) => {
                        setEditor(editor)
                    }}
                    type={editorInfo?.language}
                    value={editorInfo?.code || ""}
                    setValue={(content: string) => {
                        updateAreaInputInfo(content)
                    }}
                    highLightText={editorInfo?.highLightRange ? [editorInfo?.highLightRange] : undefined}
                    highLightClass='hight-light-yak-runner-color'
                    highLightFind={highLightFind}
                />
            )}
        </div>
    )
})

export const AuditCodeWelcomePage: React.FC<AuditCodeWelcomePageProps> = memo((props) => {
    const {setShowCompileModal} = props
    const ref = useRef<HTMLDivElement>(null)
    const size = useSize(ref)
    const [historyList, setHistoryList] = useState<YakRunnerHistoryProps[]>([])

    const getHistoryList = useMemoizedFn(async () => {
        const list = await getYakRunnerHistory()
        setHistoryList(list)
    })
    useEffect(() => {
        getHistoryList()
    }, [])

    // 打开已有项目
    const openHistoryExpanded = useMemoizedFn(async () => {
        emiter.emit("onCodeAuditHistoryExpanded")
    })

    // 打开编译项目
    const openCompileProject = useMemoizedFn(() => {
        setShowCompileModal(true)
    })

    return (
        <div className={styles["yak-runner-welcome-page"]} ref={ref}>
            <div className={styles["title"]}>
                <div className={styles["icon-style"]}>
                    <RuleManagementAuditIcon />
                </div>
                <div className={styles["header-style"]}>欢迎使用SyntaxFlow代码审计</div>
            </div>
            <div className={styles["operate-box"]} style={size && size.width < 600 ? {padding: "0px 20px"} : {}}>
                <div className={styles["operate"]}>
                    <div className={styles["title-style"]}>快捷创建</div>
                    <div className={styles["operate-btn-group"]}>
                        <div
                            className={classNames(styles["btn-style"], styles["btn-open-compile"])}
                            onClick={openCompileProject}
                        >
                            <div className={styles["btn-title"]}>
                                <YakRunnerOpenAuditIcon />
                                编译项目
                            </div>
                            <OutlinCompileIcon className={styles["icon-style"]} />
                        </div>
                        <div
                            className={classNames(styles["btn-style"], styles["btn-open-file"])}
                            onClick={openHistoryExpanded}
                        >
                            <div className={styles["btn-title"]}>
                                <YakRunnerOpenFileIcon />
                                打开已有项目
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
                                            const OpenFileByPathParams: OpenFileByPathProps = {
                                                params: {
                                                    path: item.path,
                                                    name: item.name
                                                },
                                                isHistory: true,
                                                isOutside: true
                                            }
                                            emiter.emit(
                                                "onCodeAuditOpenFileByPath",
                                                JSON.stringify(OpenFileByPathParams)
                                            )
                                        } else {
                                            emiter.emit("onCodeAuditOpenAuditTree", item.name)
                                        }
                                    }}
                                >
                                    <div className={styles["file-name"]}>{item.name}</div>
                                    <div className={classNames(styles["file-path"], "yakit-single-line-ellipsis")}>
                                        {item.loadTreeType === "audit" ? "（已编译项目）" : item.path}
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
    const {fileTree, areaInfo} = useStore()

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
                    language: monacaLanguageType(suffix)
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
                    const {data} = await grpcFetchAuditTree(parentPath)
                    arr = data
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
                    emiter.emit("onCodeAuditRefreshFileTree", parentPath)
                }
                if (result.length > 0) {
                    file.name = result[0].name
                    file.isDelete = false
                    success(`${file.name} 保存成功`)
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
                }
            } else {
                warn("未获取保存路径，取消保存")
                onCancle()
            }
        })
    })

    return (
        <YakitHint
            visible={isShowModal}
            title={"文件未保存"}
            content={`是否要保存${info.name}里面的内容吗？`}
            footer={
                <div className={styles["hint-right-btn"]}>
                    <YakitButton size='max' type='outline2' onClick={onCancle}>
                        取消
                    </YakitButton>
                    <div className={styles["btn-group-wrapper"]}>
                        <YakitButton size='max' type='outline2' onClick={onUnSave}>
                            不保存
                        </YakitButton>
                        <YakitButton size='max' onClick={onSaveFile}>
                            保存
                        </YakitButton>
                    </div>
                </div>
            }
        />
    )
}

interface RenameYakitModalBoxProps {
    name: string
    setName: (v: string) => void
}
const RenameYakitModalBox: React.FC<RenameYakitModalBoxProps> = (props) => {
    const {name, setName} = props
    const inputRef = useRef<any>(null)
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.setSelectionRange(0, name.lastIndexOf("."))
        }
    }, [])
    return (
        <div style={{padding: 20}}>
            <YakitInput
                ref={inputRef}
                defaultValue={name}
                autoFocus
                placeholder='请输入新名称'
                allowClear
                onChange={(e) => {
                    const {value} = e.target
                    setName(value)
                }}
            />
        </div>
    )
}

const CodeScanMonacoWidget: React.FC<CodeScanMonacoWidgetProps> = (props) => {
    const {source, closeFizzRangeWidget} = props
    const [widgetControl, setWidgetControl] = useState<WidgetControlProps | null>(null)

    // 判断数组中某一项后面或者前面有没有值
    const checkArrayValues = useMemoizedFn((arr: GraphInfoProps[], node_id: string) => {
        // 查找值的索引
        const index = arr.findIndex((item) => item.node_id === node_id)

        if (index === -1) {
            return null
        }

        const hasPrevious = index > 0 // 判断前面是否有值
        const hasNext = index < arr.length - 1 // 判断后面是否有值

        return {
            hasPrevious: hasPrevious,
            hasNext: hasNext,
            previousValue: hasPrevious ? arr[index - 1] : null,
            nextValue: hasNext ? arr[index + 1] : null
        }
    })

    useEffect(() => {
        if (source) {
            const graphInfo = getMapResultDetail(source.title)
            const result = checkArrayValues(graphInfo, source.node_id)
            setWidgetControl(result)
        } else {
            closeFizzRangeWidget()
        }
    }, [source])

    // 监听 Monaco Widget 点击
    const onWidgetClick = useMemoizedFn((type: WidgetClickTypeProps) => {
        switch (type) {
            case "previous":
                closeFizzRangeWidget()
                let previousItem = widgetControl?.previousValue as GraphInfoProps | null
                if (previousItem) {
                    onJumpRunnerFile(previousItem, source)
                }
                break
            case "next":
                closeFizzRangeWidget()
                let nextItem = widgetControl?.nextValue as GraphInfoProps | null
                if (nextItem) {
                    onJumpRunnerFile(nextItem, source)
                }
                break
            default:
                if (source) {
                    emiter.emit("onWidgetOpenRightAudit", JSON.stringify(source))
                }
                break
        }
    })

    const getSelectOptions = useMemo(() => {
        if (getMapAllResultKey().length <= 1) {
            return null
        }
        return getMapAllResultKey().map((item) => ({
            label: item,
            value: item
        }))
    }, [])

    const onChangeTitle = useMemoizedFn((data: string) => {
        const arr = getMapResultDetail(data)
        if (arr.length > 0 && source) {
            const newSource = {
                title: data,
                node_id: arr[0].node_id,
                auditRightParams: source.auditRightParams
            }
            closeFizzRangeWidget()
            onJumpRunnerFile(arr[0], newSource)
        }
    })

    return (
        <div className={classNames(styles["code-scan-monaco-widget"])}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>这里的代码有点问题</div>
                <div className={styles["extra"]} onClick={closeFizzRangeWidget}>
                    <OutlineXIcon />
                </div>
            </div>
            <div className={styles["content"]}>
                {getSelectOptions && (
                    <YakitSelect
                        size='small'
                        value={source?.title}
                        options={getSelectOptions}
                        onChange={(item: string) => {
                            onChangeTitle(item)
                        }}
                    />
                )}
            </div>
            <div className={styles["option"]}>
                {widgetControl?.hasPrevious && (
                    <YakitButton onClick={() => onWidgetClick("previous")} size='small'>
                        上一个
                    </YakitButton>
                )}
                {widgetControl?.hasNext && (
                    <YakitButton onClick={() => onWidgetClick("next")} size='small'>
                        下一个
                    </YakitButton>
                )}
                <YakitButton onClick={() => onWidgetClick("detail")} size='small'>
                    查看详情
                </YakitButton>
            </div>
        </div>
    )
}
