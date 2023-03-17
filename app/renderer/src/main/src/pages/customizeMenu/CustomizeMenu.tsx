import React, {useEffect, useRef, useState} from "react"
import {
    CustomizeMenuProps,
    FeaturesAndPluginProps,
    FirstMenuItemProps,
    FirstMenuProps,
    PluginLocalInfoProps,
    PluginLocalItemProps,
    PluginLocalListProps,
    SecondMenuItemProps,
    SecondMenuProps,
    SystemFunctionListProps,
    SystemRouteMenuDataItemProps
} from "./CustomizeMenuType"
import style from "./CustomizeMenu.module.scss"
import {
    ChevronLeftIcon,
    BanIcon,
    RemoveIcon,
    DragSortIcon,
    PhotographIcon,
    PlusIcon,
    TrashIcon,
    ArrowLeftIcon,
    PrivatePluginIcon,
    OfficialPluginIcon,
    QuestionMarkCircleIcon,
    TerminalIcon,
    PencilAltIcon,
    ShieldExclamationIcon,
    DocumentDownloadIcon,
    CloudPluginIcon
} from "@/assets/newIcon"
import {MenuDataProps, DefaultRouteMenuData, Route} from "@/routes/routeSpec"
import classNames from "classnames"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {Button, Input, Modal, Popconfirm, Radio, Tooltip} from "antd"
import {useCreation, useDebounceEffect, useHover, useMemoizedFn, useThrottleFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {MenuDefaultPluginIcon} from "./icon/menuIcon"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {yakitFailed} from "@/utils/notification"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakEditor} from "@/utils/editors"
import {getScriptHoverIcon, getScriptIcon} from "../layout/HeardMenu/HeardMenu"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {getRemoteValue} from "@/utils/kv"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {MenuItem, MenuItemGroup} from "../MainOperator"
import {MenuByGroupProps} from "../layout/HeardMenu/HeardMenuType"

const {ipcRenderer} = window.require("electron")

const reorder = (list: MenuDataProps[], startIndex: number, endIndex: number) => {
    const result = Array.from(list)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}

export const getMenuListBySort = (menuData: MenuDataProps[], menuMode: string) => {
    const menuLists: MenuItemGroup[] = []
    menuData.forEach((item, index) => {
        let subMenuData: MenuItem[] = []
        if (item.subMenuData && item.subMenuData.length > 0) {
            item.subMenuData.forEach((subItem, subIndex) => {
                subMenuData.push({
                    Group: item.label,
                    YakScriptId: subItem.yakScriptId || 0,
                    Verbose: subItem.label,
                    GroupSort: subIndex + 1,
                    YakScriptName: subItem.yakScripName
                })
            })
            menuLists.push({
                Group: item.label,
                MenuSort: index + 1,
                Items: subMenuData,
                Mode: menuMode
            })
        } else {
            menuLists.push({
                Group: item.label,
                Items: [],
                MenuSort: index + 1,
                Mode: menuMode
            })
        }
    })
    return menuLists
}

export const getMenuListToLocal = (menuData: MenuItemGroup[]) => {
    let allSystemRouteMenuData: MenuDataProps[] = []
    DefaultRouteMenuData.forEach((ele) => {
        // allSystemRouteMenuData = [...allSystemRouteMenuData, ...(ele.subMenuData?.filter((ele) => ele.key) || [])]
        allSystemRouteMenuData = [...allSystemRouteMenuData, ...(ele.subMenuData || [])]
    })

    const menuLists: MenuDataProps[] = []
    menuData.forEach((item, index) => {
        let subMenuData: MenuDataProps[] = []
        if (item.Items && item.Items.length > 0) {
            item.Items.forEach((subItem, subIndex) => {
                const currentItemSub = allSystemRouteMenuData.find((s) => s.label === subItem.Verbose) || {
                    key: undefined,
                    icon: undefined,
                    hoverIcon: undefined,
                    describe: ""
                }
                subMenuData.push({
                    Group: item.Group,
                    key: currentItemSub.key
                        ? (currentItemSub.key as Route)
                        : (`plugin:${subItem.YakScriptId}` as Route),
                    id: `${index + 1}-${subIndex + 1}`,
                    label: subItem.Verbose,
                    yakScriptId: subItem.YakScriptId,
                    yakScripName: subItem.YakScriptName,
                    icon: currentItemSub.icon || getScriptIcon(subItem.YakScriptName || ""),
                    hoverIcon: currentItemSub.hoverIcon || getScriptHoverIcon(subItem.YakScriptName || ""),
                    describe: currentItemSub.describe
                })
            })
            menuLists.push({
                id: `${index + 1}`,
                label: item.Group,
                subMenuData
            })
        } else {
            menuLists.push({
                key: undefined,
                id: `${index + 1}`,
                label: item.Group === "UserDefined" ? "社区插件" : item.Group,
                subMenuData: []
            })
        }
    })
    return menuLists
}

const CustomizeMenu: React.FC<CustomizeMenuProps> = React.memo((props) => {
    const {visible, onClose} = props
    const [menuData, setMenuData] = useState<MenuDataProps[]>([])
    const [currentFirstMenu, setCurrentFirstMenu] = useState<MenuDataProps>()
    const [subMenuData, setSubMenuData] = useState<MenuDataProps[]>([])
    const [currentSubMenuData, setCurrentSubMenuData] = useState<MenuDataProps>()
    const [visibleSubMenu, setVisibleSubMenu] = useState<boolean>(false)
    const [emptyMenuLength, setEmptyMenuLength] = useState<number>(0)

    const [subMenuName, setSubMenuName] = useState<string>("")

    const [destinationDrag, setDestinationDrag] = useState<string>("droppable2") // 右边得系统功能和插件拖拽后得目的地
    const [tip, setTip] = useState<string>("保存")
    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")
    const [addLoading, setAddLoading] = useState<boolean>(false)

    const systemRouteMenuDataRef = useRef<MenuDataProps[]>([]) // 系统功能列表数据
    const pluginLocalDataRef = useRef<YakScript[]>([]) // 本地插件列表数据
    const defaultRouteMenuDataRef = useRef<MenuDataProps[]>(DefaultRouteMenuData)

    // 获取 系统功能菜单列表 所有 一维
    const SystemRouteMenuData = useCreation(() => {
        let data: MenuDataProps[] = []
        DefaultRouteMenuData.forEach((ele) => {
            data = [...data, ...(ele.subMenuData?.filter((ele) => ele.key) || [])]
        })
        systemRouteMenuDataRef.current = data
        return data
    }, [DefaultRouteMenuData])

    useEffect(() => {
        getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            setPatternMenu(menuMode)
            getMenuData(menuMode)
        })
    }, [])
    /**
     * @description: 获取菜单
     */
    const getMenuData = useMemoizedFn((menuMode: string) => {
        ipcRenderer
            .invoke("QueryAllMenuItem", {Mode: menuMode})
            .then((rsp: MenuByGroupProps) => {
                const list: MenuDataProps[] = getMenuListToLocal(rsp.Groups)
                defaultRouteMenuDataRef.current = list
                setMenuData([...list])
                //默认选中第一个一级菜单
                if (list.length > 0) {
                    onSelect(list[0])
                }
            })
            .catch((err) => {
                yakitFailed("获取菜单失败：" + err)
            })
    })
    const onSelect = useMemoizedFn((item: MenuDataProps) => {
        setCurrentFirstMenu(item)
        setSubMenuData([...(item.subMenuData || [])])
    })
    /**
     * @description: 新增一级菜单
     */
    const onAddFirstMenu = useMemoizedFn((value?: string) => {
        if (menuData.length >= 50) {
            yakitFailed("最多只能设置50个")
            return
        }
        const length = menuData.filter((ele) => ele.label.includes("未命名")).length
        const id = randomString(4)
        const menu: MenuDataProps = {
            id,
            label: value || `未命名${length + 1}`
        }
        setCurrentFirstMenu({...menu})
        setMenuData([...menuData, menu])
        setSubMenuData([])
    })
    /**
     * @description: 删除一级菜单
     */
    const onRemoveFirstMenu = useMemoizedFn((currentFirstMenu?: MenuDataProps) => {
        if (!currentFirstMenu) return
        const index = menuData.findIndex((ele) => ele.id === currentFirstMenu?.id)
        if (index === -1) return
        menuData.splice(index, 1)
        setCurrentFirstMenu(undefined)
        setMenuData([...menuData])
        setSubMenuData([])
    })

    /**
     * @description: 修改一级菜单以及当前选中的菜单项
     */
    const editCurrentFirstMenu = useMemoizedFn((value: string) => {
        // 如果一级菜单不存在，默认给用户创建一个一级菜单
        if (!currentFirstMenu) {
            onAddFirstMenu(value)
        }
        if (!currentFirstMenu) return
        const index = menuData.findIndex((ele) => ele.id === currentFirstMenu?.id)
        if (index === -1) return
        menuData[index].label = value
        setCurrentFirstMenu({...currentFirstMenu, label: value})
        setMenuData([...menuData])
    })
    /**
     * @description: 拖拽结束后的计算
     */
    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        // 如果一级菜单不存在，默认给用户创建一个一级菜单
        if (!currentFirstMenu) {
            onAddFirstMenu()
        }
        // if (!currentFirstMenu?.id) {
        //     yakitFailed("请先选择左边一级菜单")
        //     return
        // }
        if (result.source.droppableId === "droppable2" && result.destination.droppableId === "droppable2") {
            const subMenuList: MenuDataProps[] = reorder(subMenuData, result.source.index, result.destination.index)
            // setSubMenuData(subMenuList)
            updateData(subMenuList)
        }
        if (subMenuData.length > 50) {
            yakitFailed("最多只能设置50个")
            return
        }
        if (result.source.droppableId === "droppable3" && result.destination.droppableId === "droppable2") {
            // 系统功能拖拽到此处
            const currentSystemMenuItem = systemRouteMenuDataRef.current[result.source.index]
            const destinationIndex = result.destination.index
            subMenuData.splice(destinationIndex, 0, currentSystemMenuItem)
            updateData(subMenuData)
        }
        if (result.source.droppableId === "droppable4" && result.destination.droppableId === "droppable2") {
            // 插件拖拽到此处
            const currentPluginMenuItem = pluginLocalDataRef.current[result.source.index]
            const menuItem: MenuDataProps = {
                id: `${currentPluginMenuItem.Id}`,
                key: `plugin:${currentPluginMenuItem.Id}` as Route,
                label: currentPluginMenuItem.ScriptName,
                icon: getScriptIcon(currentPluginMenuItem.ScriptName),
                describe: currentPluginMenuItem.Help,
                yakScripName: currentPluginMenuItem.ScriptName
                // yakScriptId: currentPluginMenuItem.Id
            }
            const destinationIndex = result.destination.index
            subMenuData.splice(destinationIndex, 0, menuItem)
            updateData(subMenuData)
        }
    })
    /**
     * @description: 根据变化的二级菜单，修改菜单数据、一级菜单数据
     * @param {*} subMenuList 当前得二级菜单
     */
    const updateData = useMemoizedFn((subMenuList: MenuDataProps[]) => {
        if (!currentFirstMenu?.id) return
        const index = menuData.findIndex((item) => item.id === currentFirstMenu.id)
        menuData[index] = {
            ...menuData[index],
            subMenuData: subMenuList
        }
        const newCurrentFirstMenu: MenuDataProps = {
            ...currentFirstMenu,
            subMenuData: subMenuList
        }
        setSubMenuData([...subMenuList])
        setMenuData([...menuData])
        setCurrentFirstMenu(newCurrentFirstMenu)
    })
    /**
     * @description: 计算移动的范围是否在目标范围类
     */
    const onDragUpdate = useThrottleFn(
        (result) => {
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    const onAddMenuData = useMemoizedFn((item: MenuDataProps) => {
        if (!currentFirstMenu?.id) {
            yakitFailed("请先选择左边一级菜单")
            return
        }
        if (subMenuData.length > 50) {
            yakitFailed("最多只能设置50个")
            return
        }

        subMenuData.splice(subMenuData.length, 0, item)
        setSubMenuData([...subMenuData])
        updateData(subMenuData)
    })
    const onRemoveSecondMenu = useMemoizedFn((item: MenuDataProps) => {
        const index = subMenuData.findIndex((i) => i.id === item.id)
        if (index === -1) return
        subMenuData.splice(index, 1)
        setSubMenuData([...subMenuData])
        updateData(subMenuData)
    })
    /**
     * @description: 完成
     */
    const onSave = useMemoizedFn(() => {
        let length = 0
        menuData.forEach((item) => {
            if (!item.subMenuData || item.subMenuData.length === 0) {
                length += 1
            }
        })
        if (length === 0) {
            // 保存
            onSaveLocal()
        } else {
            setTip("保存")
            setEmptyMenuLength(length)
        }
    })
    /**
     * @description: 保存至引擎
     */
    const onSaveLocal = useMemoizedFn(() => {
        let firstStageMenu = menuData.map((ele) => ele.label).sort()
        if (firstStageMenu.filter((ele) => !ele).length > 0) {
            yakitFailed(`一级菜单名称不能为空`)
            return
        }
        let repeatMenu = ""
        for (let i = 0; i < firstStageMenu.length; i++) {
            if (firstStageMenu[i] == firstStageMenu[i + 1]) {
                repeatMenu = firstStageMenu[i]
                break
            }
        }
        if (repeatMenu) {
            yakitFailed(`【${repeatMenu}】名称重复，请修改`)
            return
        }
        setAddLoading(true)
        const menuLists = getMenuListBySort(menuData, patternMenu)

        ipcRenderer
            .invoke("DeleteAllMenu", {Mode: patternMenu})
            .then(() => {
                ipcRenderer
                    .invoke("AddMenus", {Data: menuLists})
                    .then(() => {
                        onClose()
                        ipcRenderer.invoke("change-main-menu")
                    })
                    .catch((err) => {
                        yakitFailed("保存菜单失败：" + err)
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setAddLoading(false)
                        }, 300)
                    })
            })
            .catch((e: any) => {
                yakitFailed(`删除菜单失败:${e}`)
            })
    })
    const onTip = useMemoizedFn(() => {
        if (JSON.stringify(defaultRouteMenuDataRef.current) === JSON.stringify(menuData)) {
            onClose()
        } else {
            Modal.confirm({
                title: "温馨提示",
                icon: <ExclamationCircleOutlined />,
                content: "请问是否要保存菜单并关闭页面？",
                okText: "保存",
                cancelText: "不保存",
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className={style["remove-icon"]}
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => {
                    onSave()
                },
                onCancel: () => {
                    onClose()
                },
                cancelButtonProps: {size: "small", className: style["cancel-button"]},
                okButtonProps: {size: "small", className: style["ok-button"]}
            })
        }
    })
    const onEditSecondMenu = useMemoizedFn((item: MenuDataProps) => {
        setVisibleSubMenu(true)
        setCurrentSubMenuData(item)
        setSubMenuName(item.label)
    })
    const onEditSubMenuName = useMemoizedFn(() => {
        if (!currentSubMenuData?.id) return
        const index = subMenuData.findIndex((item) => item.id === currentSubMenuData?.id)
        if (index === -1) return
        subMenuData[index] = {
            ...subMenuData[index],
            label: subMenuName
        }
        updateData(subMenuData)
        setVisibleSubMenu(false)
    })

    const onImportJSON = useMemoizedFn(() => {
        let length = 0
        menuData.forEach((item) => {
            if (!item.subMenuData || item.subMenuData.length === 0) {
                length += 1
            }
        })
        if (length === 0) {
            // 导出 JSON
            const newMenu: MenuItemGroup[] = getMenuListBySort(menuData, "")
            const menuString = JSON.stringify(newMenu)
            saveABSFileToOpen(`menuData-${randomString(10)}.json`, menuString)
        } else {
            setTip("导出")
            setEmptyMenuLength(length)
        }
    })

    return (
        <div
            className={classNames(style["content"], {
                [style["content-show"]]: visible
            })}
        >
            <div className={style["left"]}>
                <div className={style["left-heard"]}>
                    <div className={style["display-flex"]}>
                        <ArrowLeftIcon className={style["content-icon"]} onClick={() => onTip()} />
                        <div className={style["left-title"]}>
                            {patternMenu === "expert" ? "编辑专家模式" : "编辑扫描模式"}
                        </div>
                        <div className={style["left-number"]}>{menuData.length}/50</div>
                    </div>
                    <div>
                        {/* <Popconfirm
                            title='确定清空菜单吗？'
                            onConfirm={() => onRemoveAll()}
                            okText='Yes'
                            cancelText='No'
                        >
                            <TrashIcon className={style["remove-icon"]} />
                        </Popconfirm> */}
                        <PlusIcon className={style["content-icon"]} onClick={() => onAddFirstMenu()} />
                    </div>
                </div>
                <div className={style["left-content"]}>
                    <FirstMenu
                        menuData={menuData}
                        setMenuData={setMenuData}
                        currentFirstMenu={currentFirstMenu}
                        onSelect={onSelect}
                        onRemove={onRemoveFirstMenu}
                    />
                </div>
                <div className={style["left-footer"]}>
                    <YakitButton type='outline2' onClick={() => onTip()}>
                        取消
                    </YakitButton>
                    <div>
                        <YakitButton type='outline1' onClick={() => onImportJSON()}>
                            导出 JSON
                        </YakitButton>
                        <YakitButton type='primary' onClick={() => onSave()} loading={addLoading}>
                            完成
                        </YakitButton>
                    </div>
                </div>
            </div>
            <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
                <div className={style["middle"]}>
                    <SecondMenu
                        currentFirstMenu={currentFirstMenu}
                        editCurrentFirstMenu={editCurrentFirstMenu}
                        subMenuData={subMenuData}
                        onRemoveFirstMenu={() => onRemoveFirstMenu(currentFirstMenu)}
                        onRemoveSecondMenu={onRemoveSecondMenu}
                        onEdit={onEditSecondMenu}
                    />
                </div>
                <div className={style["right"]}>
                    <FeaturesAndPlugin
                        destinationDrag={destinationDrag}
                        setPluginList={(list) => (pluginLocalDataRef.current = list)}
                        onAddMenuData={onAddMenuData}
                        subMenuData={subMenuData}
                        onRemoveMenu={onRemoveSecondMenu}
                        SystemRouteMenuData={SystemRouteMenuData}
                    />
                </div>
            </DragDropContext>
            <YakitModal
                closable={false}
                footer={null}
                visible={visibleSubMenu}
                onCancel={() => setVisibleSubMenu(false)}
            >
                <div className={style["subMenu-edit-modal"]}>
                    <div className={style["subMenu-edit-modal-heard"]}>
                        <div className={style["subMenu-edit-modal-title"]}>修改菜单名称</div>
                        <div className={style["close-icon"]} onClick={() => setVisibleSubMenu(false)}>
                            <RemoveIcon />
                        </div>
                    </div>
                    <div className={style["subMenu-edit-modal-body"]}>
                        <YakitInput.TextArea
                            autoSize={{minRows: 3, maxRows: 3}}
                            showCount
                            value={subMenuName}
                            maxLength={50}
                            onChange={(e) => setSubMenuName(e.target.value)}
                        />
                    </div>
                    <div className={style["subMenu-edit-modal-footer"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setVisibleSubMenu(false)
                                setSubMenuName("")
                            }}
                        >
                            取消
                        </YakitButton>
                        <YakitButton type='primary' onClick={() => onEditSubMenuName()}>
                            确定
                        </YakitButton>
                    </div>
                </div>
            </YakitModal>
            <YakitModal
                closable={true}
                footer={null}
                visible={emptyMenuLength > 0}
                onCancel={() => setEmptyMenuLength(0)}
                width={431}
            >
                <div className={style["confirm-modal"]}>
                    <ShieldExclamationIcon className={style["confirm-icon"]} />
                    <div className={style["confirm-text"]}>检测到有空菜单</div>
                    <div className={style["confirm-tip"]}>
                        有<span>{emptyMenuLength}</span>个菜单功能为空，空菜单不会{tip}，是否仍要继续{tip}？
                    </div>
                    <div className={style["confirm-buttons"]}>
                        <YakitButton
                            type='outline2'
                            size='large'
                            className={style["confirm-btn"]}
                            onClick={() => setEmptyMenuLength(0)}
                        >
                            取消
                        </YakitButton>
                        <YakitButton type='primary' size='large' onClick={() => onSaveLocal()}>
                            {tip}
                        </YakitButton>
                    </div>
                </div>
            </YakitModal>
        </div>
    )
})

export default CustomizeMenu

const getItemStyle = (isDragging, draggableStyle) => ({
    ...draggableStyle
})

const getItemStyleSecond = (isDragging, draggableStyle) => ({
    background: isDragging ? "red" : "",
    ...draggableStyle
})

const FirstMenu: React.FC<FirstMenuProps> = React.memo((props) => {
    const {menuData, setMenuData, currentFirstMenu, onSelect, onRemove} = props

    const [destinationDrag, setDestinationDrag] = useState<string>("droppable1")

    /**
     * @description: 拖拽结束后的计算
     */
    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const menuList: MenuDataProps[] = reorder(menuData, result.source.index, result.destination.index)
            setMenuData(menuList)
        }
    })
    /**
     * @description: 计算移动的范围是否在目标范围类
     */
    const onDragUpdate = useThrottleFn(
        (result) => {
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    return (
        <div className={style["first-menu-list"]}>
            <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
                <Droppable droppableId='droppable1'>
                    {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                            {menuData.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                        >
                                            <FirstMenuItem
                                                key={item.id}
                                                menuItem={item}
                                                currentMenuItem={currentFirstMenu}
                                                isDragging={snapshot.isDragging}
                                                onSelect={onSelect}
                                                destinationDrag={destinationDrag}
                                                onRemove={onRemove}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    )
})

const FirstMenuItem: React.FC<FirstMenuItemProps> = React.memo((props) => {
    const {menuItem, currentMenuItem, isDragging, onSelect, destinationDrag, onRemove} = props
    return (
        <div
            className={classNames(style["first-menu-item"], {
                [style["first-menu-item-select"]]: menuItem.id === currentMenuItem?.id,
                [style["menu-item-drag"]]: isDragging
            })}
            onClick={() => onSelect(menuItem)}
        >
            <div className={classNames(style["display-flex"], style["first-menu-item-left"])}>
                <DragSortIcon
                    className={classNames(style["content-icon"], {
                        [style["content-icon-active"]]: isDragging
                    })}
                />
                <div className={style["first-menu-item-label"]} title={menuItem.label}>
                    {menuItem.label}
                </div>
            </div>
            <div className={style["first-sub-menu-number"]}>{menuItem.subMenuData?.length || 0}</div>
            <TrashIcon
                className={style["trash-icon"]}
                onClick={(e) => {
                    e.stopPropagation()
                    onRemove(menuItem)
                }}
            />
            {!destinationDrag && isDragging && (
                <div className={style["first-drag-state"]}>
                    <BanIcon />
                </div>
            )}
        </div>
    )
})

const SecondMenu: React.FC<SecondMenuProps> = React.memo((props) => {
    const {currentFirstMenu, subMenuData, editCurrentFirstMenu, onRemoveFirstMenu, onRemoveSecondMenu, onEdit} = props
    return (
        <div className={style["second-menu"]}>
            <div className={style["second-menu-heard"]}>
                <div className={style["second-menu-heard-input"]}>
                    <Input
                        placeholder='未命名1 (菜单名建议 4-16 个英文字符内最佳)'
                        bordered={false}
                        suffix={
                            <div onClick={onRemoveFirstMenu}>
                                <TrashIcon />
                            </div>
                        }
                        value={currentFirstMenu?.label}
                        onChange={(e) => {
                            editCurrentFirstMenu(e.target.value)
                        }}
                    />
                </div>
                <div className={style["second-menu-heard-tip"]}>已添加功能 {subMenuData.length}/50</div>
            </div>

            <div className={style["second-menu-list"]}>
                <Droppable droppableId='droppable2'>
                    {(provided, snapshot) => {
                        return (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={style["second-menu-drop"]}
                                style={{marginBottom: 70}}
                            >
                                {subMenuData.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                            >
                                                <SecondMenuItem
                                                    key={item.id}
                                                    menuItem={item}
                                                    isDragging={snapshot.isDragging}
                                                    onRemoveSecondMenu={onRemoveSecondMenu}
                                                    onEdit={onEdit}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {subMenuData.length === 0 && (
                                    <div className={style["second-menu-no-data"]}>
                                        <PhotographIcon className={style["second-menu-photograph-icon"]} />
                                        <div>
                                            <div
                                                className={classNames(
                                                    style["second-menu-text"],
                                                    style["second-menu-text-bold"]
                                                )}
                                            >
                                                暂未未添加功能
                                            </div>
                                            <div className={style["second-menu-text"]}>
                                                可通过拖拽或点击添加按钮，将功能添加至此处
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {provided.placeholder}
                            </div>
                        )
                    }}
                </Droppable>
            </div>
        </div>
    )
})

const SecondMenuItem: React.FC<SecondMenuItemProps> = React.memo((props) => {
    const {menuItem, isDragging, onRemoveSecondMenu, onEdit} = props
    const isShowRemove = useCreation<boolean>(() => {
        const subMenuList: MenuDataProps[] =
            DefaultRouteMenuData.find((ele) => ele.label === menuItem.Group)?.subMenuData || []
        const index = subMenuList.findIndex(
            (ele) => menuItem.label === ele.label && ele.key && !ele.key.includes("plugin")
        )
        return index === -1
    }, [menuItem.label])
    return (
        <div className={style["second-menu-item-content"]}>
            <div
                className={classNames(style["second-menu-item"], {
                    [style["menu-item-drag"]]: isDragging
                })}
            >
                <DragSortIcon
                    className={classNames({
                        [style["content-icon-active"]]: isDragging
                    })}
                />
                {menuItem.icon || <MenuDefaultPluginIcon />}
                <div className={style["second-menu-label-body"]}>
                    <div className={style["second-menu-label-content"]}>
                        <span className={style["second-menu-label"]}>{menuItem.label}</span>
                        {menuItem.key?.includes("plugin") && (
                            <PencilAltIcon
                                className={style["second-menu-edit-icon"]}
                                onClick={() => onEdit(menuItem)}
                            />
                        )}
                    </div>
                    <div className={style["second-menu-describe"]}>
                        {menuItem.describe || "No Description about it."}
                    </div>
                </div>
                {isShowRemove && (
                    <div className={style["close-icon"]} onClick={() => onRemoveSecondMenu(menuItem)}>
                        <RemoveIcon />
                    </div>
                )}
            </div>
        </div>
    )
})

const FeaturesAndPlugin: React.FC<FeaturesAndPluginProps> = React.memo((props) => {
    const [type, setType] = useState<"system" | "plugin">("system")
    const [keywords, setKeyWords] = useState<string>("")
    const [isSearch, setIsSearch] = useState<boolean>(false)
    return (
        <>
            <div className={style["right-heard"]}>
                <YakitRadioButtons
                    value={type}
                    onChange={(e) => {
                        setKeyWords("")
                        setType(e.target.value)
                    }}
                    buttonStyle='solid'
                    options={[
                        {
                            value: "system",
                            label: "系统功能"
                        },
                        {
                            value: "plugin",
                            label: "插件"
                        }
                    ]}
                />
                <YakitInput.Search
                    placeholder='请输入关键词搜索'
                    value={keywords}
                    onChange={(e) => setKeyWords(e.target.value)}
                    style={{maxWidth: 200}}
                    onSearch={() => setIsSearch(!isSearch)}
                    onPressEnter={() => setIsSearch(!isSearch)}
                />
            </div>
            <div className={style["right-help"]}>可通过拖拽或点击添加按钮，将功能添加至左侧菜单内</div>
            {type === "system" && (
                <SystemFunctionList
                    destinationDrag={props.destinationDrag}
                    onAddMenuData={props.onAddMenuData}
                    subMenuData={props.subMenuData}
                    keywords={keywords}
                    isSearch={isSearch}
                    onRemoveMenu={props.onRemoveMenu}
                    SystemRouteMenuData={props.SystemRouteMenuData}
                />
            )}
            {type === "plugin" && (
                <PluginLocalList
                    keywords={keywords}
                    isSearch={isSearch}
                    destinationDrag={props.destinationDrag}
                    setPluginList={props.setPluginList}
                    onAddMenuData={props.onAddMenuData}
                    subMenuData={props.subMenuData}
                    onRemoveMenu={props.onRemoveMenu}
                />
            )}
        </>
    )
})

const SystemFunctionList: React.FC<SystemFunctionListProps> = React.memo((props) => {
    const {SystemRouteMenuData} = props
    const [keyword, setKeyword] = useState<string>("")
    const [systemRouteMenuData, setSystemRouteMenuData] = useState(SystemRouteMenuData)
    useDebounceEffect(
        () => {
            setKeyword(props.keywords)
        },
        [props.keywords],
        {
            wait: 200
        }
    )
    useEffect(() => {
        const newList = SystemRouteMenuData.filter((item) => item.label.includes(keyword))
        setSystemRouteMenuData(newList)
    }, [props.isSearch])
    return (
        <Droppable droppableId='droppable3'>
            {(provided, snapshot) => {
                return (
                    <div {...provided.droppableProps} ref={provided.innerRef} className={style["system-function-list"]}>
                        {systemRouteMenuData.map((item, index) => {
                            const isDragDisabled =
                                props.subMenuData.findIndex((i) => (i.yakScripName || i.label) === item.label) !== -1
                            return (
                                <Draggable
                                    key={item.id}
                                    draggableId={`${item.id}-system`}
                                    index={index}
                                    isDragDisabled={isDragDisabled}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                        >
                                            <SystemRouteMenuDataItem
                                                item={item}
                                                isDragging={snapshot.isDragging}
                                                destinationDrag={props.destinationDrag}
                                                onAddMenuData={props.onAddMenuData}
                                                isDragDisabled={isDragDisabled}
                                                onRemoveMenu={props.onRemoveMenu}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            )
                        })}
                        {provided.placeholder}
                    </div>
                )
            }}
        </Droppable>
    )
})

const SystemRouteMenuDataItem: React.FC<SystemRouteMenuDataItemProps> = React.memo((props) => {
    const {item, isDragging, destinationDrag, onAddMenuData, isDragDisabled, onRemoveMenu} = props
    const systemRef = useRef(null)
    const isHovering = useHover(systemRef)
    return (
        <div
            className={classNames(style["system-function-item"], {
                [style["system-function-item-isDragging"]]: isDragging
            })}
            ref={systemRef}
        >
            <div className={style["display-flex"]}>
                <span className={classNames(style["menu-icon"], {[style["menu-item-isDragDisabled"]]: isDragDisabled})}>
                    {item.icon}
                </span>
                <span
                    className={classNames(style["menu-label"], {[style["menu-item-isDragDisabled"]]: isDragDisabled})}
                >
                    {item.label}
                </span>
                <Tooltip title={item.describe} placement='topRight' overlayClassName={style["question-tooltip"]}>
                    <QuestionMarkCircleIcon className={style["menu-question-icon"]} />
                </Tooltip>
            </div>
            {(isDragDisabled && (
                <>
                    {isHovering ? (
                        <div className={style["menu-cancel"]} onClick={() => onRemoveMenu(item)}>
                            取&nbsp;消
                        </div>
                    ) : (
                        <div className={style["have-add"]}>已添加</div>
                    )}
                </>
            )) || (
                <YakitButton
                    type='text'
                    onClick={() => {
                        onAddMenuData(item)
                    }}
                >
                    添加
                </YakitButton>
            )}
            {destinationDrag === "droppable3" && isDragging && (
                <div className={style["first-drag-state"]}>
                    <BanIcon />
                </div>
            )}
        </div>
    )
})

const PluginLocalList: React.FC<PluginLocalListProps> = React.memo((props) => {
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: {
            Limit: 20,
            Page: 0,
            Order: "desc",
            OrderBy: "updated_at"
        },
        Total: 0
    })
    const [loading, setLoading] = useState<boolean>(false)
    const [keyword, setKeyword] = useState<string>("")
    const [hasMore, setHasMore] = useState(false)
    const [isRef, setIsRef] = useState(false)
    useDebounceEffect(
        () => {
            setKeyword(props.keywords)
        },
        [props.keywords],
        {
            wait: 200
        }
    )
    useEffect(() => {
        getYakScriptList(1, 20)
    }, [props.isSearch])
    const getYakScriptList = (page?: number, limit?: number) => {
        const newParams = {
            // Tag: [],
            // Type: "yak,mitm,codec,packet-hack,port-scan,nuclei", //不传查所有
            Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"},
            Keyword: keyword
        }
        if (page) newParams.Pagination.Page = page
        if (limit) newParams.Pagination.Limit = limit
        setLoading(true)
        ipcRenderer
            .invoke("QueryYakScript", newParams)
            .then((item: QueryYakScriptsResponse) => {
                const data = page === 1 ? item.Data : response.Data.concat(item.Data)
                const isMore = item.Data.length < item.Pagination.Limit || data.length === response.Total
                setHasMore(!isMore)
                setResponse({
                    ...item,
                    Data: [...data]
                })
                props.setPluginList(data)
                if (page === 1) {
                    setIsRef(!isRef)
                }
            })
            .catch((e: any) => {
                yakitFailed("Query Local Yak Script yakitFailed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }
    const loadMoreData = useMemoizedFn(() => {
        getYakScriptList(parseInt(`${response.Pagination.Page}`) + 1, 20)
    })

    return (
        <Droppable droppableId='droppable4'>
            {(provided, snapshot) => {
                return (
                    <div className={style["plugin-local-list"]} {...provided.droppableProps} ref={provided.innerRef}>
                        <RollingLoadList<YakScript>
                            isRef={isRef}
                            data={response.Data}
                            page={response.Pagination.Page}
                            hasMore={hasMore}
                            loading={loading}
                            loadMoreData={loadMoreData}
                            defItemHeight={44}
                            renderRow={(data: YakScript, index) => {
                                const isDragDisabled =
                                    props.subMenuData.findIndex((i) => i.yakScripName == data.ScriptName) !== -1
                                return (
                                    <Draggable
                                        key={data.Id}
                                        draggableId={`${data.Id}-plugin`}
                                        index={index}
                                        isDragDisabled={isDragDisabled}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                            >
                                                <PluginLocalItem
                                                    key={data.Id}
                                                    plugin={data}
                                                    isDragging={snapshot.isDragging}
                                                    destinationDrag={props.destinationDrag}
                                                    onAddMenuData={props.onAddMenuData}
                                                    isDragDisabled={isDragDisabled}
                                                    onRemoveMenu={props.onRemoveMenu}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                )
                            }}
                        />
                        {provided.placeholder}
                    </div>
                )
            }}
        </Droppable>
    )
})

const PluginLocalItem: React.FC<PluginLocalItemProps> = React.memo((props) => {
    const {plugin, isDragging, destinationDrag, onAddMenuData, isDragDisabled, onRemoveMenu} = props
    const pluginRef = useRef(null)
    const isHovering = useHover(pluginRef)
    const onAdd = useMemoizedFn(() => {
        const menuItem: MenuDataProps = {
            id: `${plugin.Id}`,
            key: `plugin:${plugin.Id}` as Route,
            label: plugin.ScriptName,
            icon: getScriptIcon(plugin.ScriptName),
            describe: plugin.Help,
            yakScripName: plugin.ScriptName
            // yakScriptId: plugin.Id
        }
        onAddMenuData(menuItem)
    })
    const onRemove = useMemoizedFn(() => {
        const menuItem: MenuDataProps = {
            id: `${plugin.Id}`,
            key: `plugin:${plugin.Id}` as Route,
            label: plugin.ScriptName,
            icon: getScriptIcon(plugin.ScriptName),
            describe: plugin.Help,
            yakScripName: plugin.ScriptName
            // yakScriptId: plugin.Id
        }
        onRemoveMenu(menuItem)
    })

    return (
        <div
            className={classNames(style["plugin-local-item"], {
                [style["plugin-local-item-isDragging"]]: isDragging
            })}
            ref={pluginRef}
        >
            <div className={style["plugin-local-item-left"]}>
                <img
                    alt=''
                    src={plugin.HeadImg}
                    className={classNames(style["plugin-local-headImg"], {
                        [style["menu-item-isDragDisabled"]]: isDragDisabled
                    })}
                />
                <span
                    className={classNames(style["plugin-local-scriptName"], {
                        [style["menu-item-isDragDisabled"]]: isDragDisabled
                    })}
                >
                    {plugin.ScriptName}
                </span>
                <PluginLocalInfoIcon plugin={plugin} />
            </div>
            {(isDragDisabled && (
                <>
                    {isHovering ? (
                        <div className={style["menu-cancel"]} onClick={() => onRemove()}>
                            取&nbsp;消
                        </div>
                    ) : (
                        <div className={style["have-add"]}>已添加</div>
                    )}
                </>
            )) || (
                <YakitButton type='text' onClick={() => onAdd()}>
                    添加
                </YakitButton>
            )}

            {destinationDrag === "droppable4" && isDragging && (
                <div className={style["first-drag-state"]}>
                    <BanIcon />
                </div>
            )}
        </div>
    )
})

export const PluginLocalInfoIcon: React.FC<PluginLocalInfoProps> = React.memo((props) => {
    const {plugin, getScriptInfo} = props
    const renderIcon = useMemoizedFn(() => {
        if (plugin.OnlineOfficial) {
            return (
                <Tooltip title='官方插件'>
                    <OfficialPluginIcon className={style["plugin-local-icon"]} />
                </Tooltip>
            )
        }
        if (plugin.OnlineIsPrivate) {
            return  <Tooltip title='私有插件'><PrivatePluginIcon className={style["plugin-local-icon"]} /></Tooltip>
        }
        if (plugin.UUID) {
            return <Tooltip title='云端插件'><CloudPluginIcon className={style["plugin-local-icon"]} /></Tooltip>
        }
    })
    return (
        <>
            {/* {plugin.OnlineIsPrivate && <PrivatePluginIcon className={style["plugin-local-icon"]} />}
            {plugin.OnlineOfficial && <OfficialPluginIcon className={style["plugin-local-icon"]} />} */}
            {renderIcon()}
            <Tooltip
                title={plugin.Help || "No Description about it."}
                placement='topRight'
                overlayClassName={style["question-tooltip"]}
                onVisibleChange={(v) => {
                    if (v && !plugin.Help) {
                        if (getScriptInfo) getScriptInfo(plugin)
                    }
                }}
            >
                <QuestionMarkCircleIcon className={style["plugin-local-icon"]} />
            </Tooltip>
            <YakitPopover
                placement='topRight'
                overlayClassName={style["terminal-popover"]}
                content={<YakEditor type={"yak"} value={plugin.Content} readOnly={true} />}
                onVisibleChange={(v) => {
                    if (v && !plugin.Content) {
                        if (getScriptInfo) getScriptInfo(plugin)
                    }
                }}
            >
                <TerminalIcon className={style["plugin-local-icon"]} />
            </YakitPopover>
        </>
    )
})
