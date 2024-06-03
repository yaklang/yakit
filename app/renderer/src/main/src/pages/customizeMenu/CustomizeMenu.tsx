import React, {useEffect, useMemo, useRef, useState} from "react"
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
    BanIcon,
    RemoveIcon,
    DragSortIcon,
    PhotographIcon,
    PlusIcon,
    TrashIcon,
    ArrowLeftIcon,
    QuestionMarkCircleIcon,
    TerminalIcon,
    PencilAltIcon,
    ShieldExclamationIcon
} from "@/assets/newIcon"
import {SolidCloudpluginIcon, SolidOfficialpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import classNames from "classnames"
import {DragDropContext, Droppable, Draggable, DragUpdate, ResponderProvided, DropResult} from "@hello-pangea/dnd"
import {Avatar, Input, Modal, Tooltip} from "antd"
import {useCreation, useDebounceEffect, useHover, useMemoizedFn, useThrottleFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakEditor} from "@/utils/editors"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {
    EnhancedPrivateRouteMenuProps,
    privateConvertDatabase,
    privateExchangeProps,
    privateUnionMenus
} from "../layout/HeardMenu/HeardMenuType"
import {
    DatabaseFirstMenuProps,
    DatabaseMenuItemProps,
    InvalidFirstMenuItem,
    InvalidPageMenuItem,
    PrivateAllMenus,
    PrivateExpertRouteMenu,
    PrivateScanRouteMenu,
    PublicCommonPlugins,
    databaseConvertData,
    getFixedPluginHoverIcon,
    getFixedPluginIcon
} from "@/routes/newRoute"
import {CodeGV, RemoteGV} from "@/yakitGV"
import {isCommunityEdition} from "@/utils/envfile"
import {publicConvertDatabase, publicExchangeProps, publicUnionMenus} from "../layout/publicMenu/utils"
import {PrivateOutlineDefaultPluginIcon} from "@/routes/privateIcon"
import {EnhancedCustomRouteMenuProps, filterCodeMenus, menusConvertJsonData} from "./utils"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitRoute} from "@/enums/yakitRoute"

const {ipcRenderer} = window.require("electron")

// 替换指定位置的功能
const reorder = (list: EnhancedCustomRouteMenuProps[], startIndex: number, endIndex: number) => {
    const result = [...list]
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}

// 将菜单数据中的label提取出来(进行用户是否修改的对比)
const convertMenuLabel = (menus: EnhancedCustomRouteMenuProps[]) => {
    const newMenus: string[] = []
    try {
        for (let item of menus) {
            newMenus.push(item.label)
            if (item.children && item.children.length > 0) {
                for (let subItem of item.children) newMenus.push(subItem.label)
            }
        }
        return newMenus
    } catch (error) {
        return newMenus
    }
}

const CustomizeMenu: React.FC<CustomizeMenuProps> = React.memo((props) => {
    const {visible, onClose} = props

    // 一级和二级菜单项数量上限
    const UpperLimit = useMemo(() => {
        if (isCommunityEdition()) return 20
        return 50
    }, [])

    // public版本常用插件数据
    const defaultPluginMenu = useMemo(() => publicExchangeProps(PublicCommonPlugins), [])
    // 专家模式菜单数据
    const ExpertMenus = useMemo(() => {
        return privateExchangeProps(PrivateExpertRouteMenu)
    }, [])
    // 扫描模式菜单数据
    const ScanMenus = useMemo(() => {
        return privateExchangeProps(PrivateScanRouteMenu)
    }, [])

    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")
    const [menuData, setMenuData] = useState<EnhancedCustomRouteMenuProps[]>([])
    const [currentFirstMenu, setCurrentFirstMenu] = useState<EnhancedCustomRouteMenuProps>()
    const [subMenuData, setSubMenuData] = useState<EnhancedCustomRouteMenuProps[]>([])

    const [addLoading, setAddLoading] = useState<boolean>(false)
    const [emptyMenuLength, setEmptyMenuLength] = useState<number>(0)

    const [destinationDrag, setDestinationDrag] = useState<string>("droppable2") // 右边得系统功能和插件拖拽后得目的地
    const [tip, setTip] = useState<string>("保存")

    const systemRouteMenuDataRef = useRef<EnhancedCustomRouteMenuProps[]>([]) // 系统功能列表数据
    const pluginLocalDataRef = useRef<YakScript[]>([]) // 本地插件列表数据
    const defaultRouteMenuDataRef = useRef<EnhancedCustomRouteMenuProps[]>([])

    // 缓存-用户删除系统的内定菜单项的数据
    const deleteCache = useRef<Record<string, string[]>>({})

    /** 获取系统功能菜单列表所有一维(仅适配private版本)  */
    const SystemRouteMenuData = useCreation(() => {
        let data: EnhancedCustomRouteMenuProps[] = privateExchangeProps(Object.values(PrivateAllMenus))
        systemRouteMenuDataRef.current = data
        return data
    }, [PrivateAllMenus])

    // 获取数据库里菜单的所有数据
    useEffect(() => {
        if (isCommunityEdition()) {
            getMenuData(CodeGV.PublicMenuModeValue, defaultPluginMenu)
        } else {
            getRemoteValue(RemoteGV.PatternMenu).then((patternMenu) => {
                const menuMode = patternMenu || "expert"
                setPatternMenu(menuMode)
                getMenuData(menuMode, menuMode === "new" ? ScanMenus : ExpertMenus)
            })
        }
    }, [])
    /** @description: 获取数据库菜单数据 */
    const getMenuData = useMemoizedFn((menuMode: string, localMenus: EnhancedCustomRouteMenuProps[]) => {
        ipcRenderer
            .invoke("GetAllNavigationItem", {Mode: menuMode})
            .then((res: {Data: DatabaseFirstMenuProps[]}) => {
                const database = databaseConvertData(res.Data || [])
                const caches: DatabaseMenuItemProps[] = []
                for (let item of database) {
                    // 过滤代码中无效的一级菜单项
                    if (InvalidFirstMenuItem.indexOf(item.menuName) > -1) continue

                    const menus: DatabaseMenuItemProps = {...item}
                    if (item.children && item.children.length > 0) {
                        menus.children = item.children.filter(
                            // 过滤代码中无效的二级菜单项
                            (item) => InvalidPageMenuItem.indexOf(item.menuName) === -1
                        )
                    }
                    caches.push(menus)
                }

                // 过滤掉用户删除的系统内定菜单
                let filterLocal: EnhancedCustomRouteMenuProps[] = []
                getRemoteValue(RemoteGV.UserDeleteMenu)
                    .then((val) => {
                        if (val !== "{}") {
                            let filters: string[] = []
                            try {
                                deleteCache.current = JSON.parse(val) || {}
                                filters = deleteCache.current[menuMode] || []
                            } catch (error) {}
                            for (let item of localMenus) {
                                if (filters.includes(item.label)) continue
                                const menu: EnhancedCustomRouteMenuProps = {...item, children: []}
                                if (item.children && item.children.length > 0) {
                                    for (let subitem of item.children) {
                                        if (!filters.includes(`${item.label}-${subitem.label}`)) {
                                            menu.children?.push({...subitem})
                                        }
                                    }
                                }
                                filterLocal.push(menu)
                            }
                        } else {
                            filterLocal = [...localMenus]
                        }
                    })
                    .catch(() => {
                        filterLocal = [...localMenus]
                    })
                    .finally(() => {
                        let newMenus: EnhancedCustomRouteMenuProps[] = []
                        if (menuMode === CodeGV.PublicMenuModeValue) {
                            const {menus} = publicUnionMenus(filterLocal, caches)
                            newMenus = menus
                        } else {
                            const {menus} = privateUnionMenus(filterLocal, caches)
                            newMenus = menus
                        }
                        // 给一级菜单项加上唯一标识符
                        newMenus.map((item) => {
                            item.id = randomString(6)
                            return item
                        })

                        defaultRouteMenuDataRef.current = [...newMenus]
                        setMenuData([...newMenus])
                        //默认选中第一个一级菜单
                        if (newMenus.length > 0) {
                            onSelect(newMenus[0])
                        }
                    })
            })
            .catch((err) => {
                yakitFailed("获取菜单失败：" + err)
            })
    })
    /** @description 选中一级菜单项并展示该菜单项下的所有二级菜单 */
    const onSelect = useMemoizedFn((item: EnhancedCustomRouteMenuProps) => {
        setCurrentFirstMenu(item)
        setSubMenuData([...(item.children || [])])
    })
    /** @description: 新增一级菜单 */
    const onAddFirstMenu = useMemoizedFn((value?: string) => {
        if (menuData.length >= UpperLimit) {
            yakitNotify("error", `最多只能设置${UpperLimit}个`)
            return
        }
        const length = menuData.filter((ele) => ele.label.includes("未命名")).length
        const menu: EnhancedCustomRouteMenuProps = {
            id: randomString(6),
            page: undefined,
            label: value || `未命名${length + 1}`,
            menuName: value || `未命名${length + 1}`,
            isNew: true
        }
        setCurrentFirstMenu({...menu})
        setMenuData([...menuData, menu])
        setSubMenuData([])
    })
    /** @description: 删除一级菜单项 */
    const onRemoveFirstMenu = useMemoizedFn((firstMenu: EnhancedCustomRouteMenuProps) => {
        if (!firstMenu.label) return
        const index = menuData.findIndex((ele) => ele.id === firstMenu.id && ele.label === firstMenu.label)
        if (index === -1) return
        menuData.splice(index, 1)
        setCurrentFirstMenu(undefined)
        setMenuData([...menuData])
        setSubMenuData([])
    })
    /** @description: 修改一级菜单项的展示名称,同时在不存在时的修改变更为新增一级菜单项操作 */
    const editCurrentFirstMenu = useMemoizedFn((value: string) => {
        // 如果一级菜单不存在，默认给用户创建一个一级菜单
        if (!currentFirstMenu) {
            onAddFirstMenu(value)
            return
        }
        const index = menuData.findIndex(
            (ele) => ele.id === currentFirstMenu?.id && ele.label === currentFirstMenu?.label
        )
        if (index === -1) return
        menuData[index].label = value
        if (menuData[index].isNew) menuData[index].menuName = value
        setCurrentFirstMenu({
            ...currentFirstMenu,
            label: value,
            menuName: currentFirstMenu.isNew ? value : currentFirstMenu.menuName
        })
        setMenuData([...menuData])
    })
    /** @description 中间和右侧菜单-拖拽结束后的计算 */
    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        if (!result.destination) {
            return
        }
        // 如果一级菜单不存在，默认给用户创建一个一级菜单
        if (!currentFirstMenu) {
            onAddFirstMenu()
        }
        // 同层内顺序调换
        if (result.source.droppableId === "droppable2" && result.destination.droppableId === "droppable2") {
            const subMenuList: EnhancedPrivateRouteMenuProps[] = reorder(
                subMenuData,
                result.source.index,
                result.destination.index
            )
            updateData(subMenuList)
        }
        // 添加-上限判断
        if (subMenuData.length >= UpperLimit) {
            yakitNotify("error", `最多只能设置${UpperLimit}个`)
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
            const menuItem: EnhancedCustomRouteMenuProps = {
                page: YakitRoute.Plugin_OP,
                label: currentPluginMenuItem.ScriptName,
                menuName: currentPluginMenuItem.ScriptName,
                icon: getFixedPluginIcon(currentPluginMenuItem.ScriptName),
                hoverIcon: getFixedPluginHoverIcon(currentPluginMenuItem.ScriptName),
                describe: currentPluginMenuItem.Help,
                yakScriptId: +currentPluginMenuItem.Id || 0,
                yakScripName: currentPluginMenuItem.ScriptName,
                headImg: currentPluginMenuItem.HeadImg || ""
            }
            const destinationIndex = result.destination.index
            subMenuData.splice(destinationIndex, 0, menuItem)
            updateData(subMenuData)
        }
    })
    /**
     * @description 根据二级菜单栏时，同步更新当前选中的一级菜单项和整体菜单数据
     * @param subMenuList 当前得二级菜单
     */
    const updateData = useMemoizedFn((subMenuList: EnhancedCustomRouteMenuProps[]) => {
        if (!currentFirstMenu?.label) return
        const index = menuData.findIndex(
            (item) => item.id === currentFirstMenu.id && item.label === currentFirstMenu.label
        )
        if (index === -1) return
        menuData[index] = {
            ...menuData[index],
            children: subMenuList
        }
        const newCurrentFirstMenu: EnhancedCustomRouteMenuProps = {
            ...currentFirstMenu,
            children: subMenuList
        }
        setSubMenuData([...subMenuList])
        setMenuData([...menuData])
        setCurrentFirstMenu(newCurrentFirstMenu)
    })
    /** @description 中间和右侧菜单-计算移动的范围是否在目标范围类 */
    const onDragUpdate = useThrottleFn(
        (result: DragUpdate, provided: ResponderProvided) => {
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    /** @description 添加二级菜单项(按钮的添加功能) */
    const onAddMenuData = useMemoizedFn((item: EnhancedCustomRouteMenuProps) => {
        if (!currentFirstMenu?.label) {
            yakitNotify("error", "请先选择左边一级菜单")
            return
        }
        if (subMenuData.length >= UpperLimit) {
            yakitNotify("error", `最多只能设置${UpperLimit}个`)
            return
        }

        subMenuData.splice(subMenuData.length, 0, item)
        setSubMenuData([...subMenuData])
        updateData(subMenuData)
    })
    /** @description 删除二级菜单项 */
    const onRemoveSecondMenu = useMemoizedFn((item: EnhancedPrivateRouteMenuProps) => {
        let index = -1
        if (item.page === YakitRoute.Plugin_OP) {
            index = subMenuData.findIndex((i) => i.yakScripName === item.yakScripName)
        } else {
            index = subMenuData.findIndex((i) => i.menuName === item.menuName)
        }
        if (index === -1) return
        subMenuData.splice(index, 1)
        setSubMenuData([...subMenuData])
        updateData(subMenuData)
    })
    // (导出 JSON/完成)按钮
    const onSave = useMemoizedFn((type?: string) => {
        let length = 0

        menuData.forEach((item) => {
            // 查找每个一级菜单下的二级菜单组是否有为空的情况
            if (!item.children || item.children.length === 0) {
                length += 1
            }
        })
        if (length === 0) {
            type === "export" ? onImportJSON() : onSaveLocal()
        } else {
            setTip(type === "export" ? "导出" : "保存")
            setEmptyMenuLength(length)
        }
    })
    /** 保存到数据库和更新前端渲染的菜单数据 */
    const onSaveLocal = useMemoizedFn(() => {
        let firstStageMenu = menuData.map((ele) => ele.label).sort()
        if (firstStageMenu.filter((ele) => !ele).length > 0) {
            yakitNotify("error", `一级菜单名称不能为空`)
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
            yakitNotify("error", `【${repeatMenu}】名称重复，请修改`)
            return
        }

        const menus = isCommunityEdition()
            ? publicConvertDatabase(menuData)
            : privateConvertDatabase(menuData, patternMenu)
        setAddLoading(true)
        // 过滤出用户删除的系统内定菜单
        const names = filterCodeMenus(menus, isCommunityEdition() ? "public" : patternMenu)

        ipcRenderer
            .invoke("DeleteAllNavigation", {Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : patternMenu})
            .then(() => {
                ipcRenderer
                    .invoke("AddToNavigation", {Data: menus})
                    .then((rsp) => {
                        const cache = {...deleteCache.current}
                        cache[isCommunityEdition() ? "public" : patternMenu] = names || []
                        setRemoteValue(RemoteGV.UserDeleteMenu, JSON.stringify(cache)).finally(async () => {
                            onClose()
                            let allowModify = await getRemoteValue(RemoteGV.IsImportJSONMenu)
                            try {
                                allowModify = JSON.parse(allowModify) || {}
                            } catch (error) {
                                allowModify = {}
                            }
                            delete allowModify[patternMenu]
                            setRemoteValue(RemoteGV.IsImportJSONMenu, JSON.stringify(allowModify))
                            if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                            else ipcRenderer.invoke("change-main-menu")
                        })
                    })
                    .catch((e) => {
                        yakitNotify("error", `保存菜单失败：${e}`)
                    })
                    .finally(() => {
                        setTimeout(() => setAddLoading(false), 300)
                    })
            })
            .catch((e: any) => {
                yakitNotify("error", `更新菜单失败:${e}`)
                setTimeout(() => setAddLoading(false), 300)
            })
    })
    /** 导出菜单数据为JSON文件 */
    const onImportJSON = useMemoizedFn(() => {
        const newMenu: DatabaseMenuItemProps[] = menusConvertJsonData(menuData)
        const menuString = JSON.stringify(newMenu)
        saveABSFileToOpen(`menuData-${randomString(10)}.json`, menuString)
    })
    // 取消按钮
    const onTip = useMemoizedFn(() => {
        const defaultMenus = convertMenuLabel(defaultRouteMenuDataRef.current).join("|")
        const newMenus = convertMenuLabel(menuData).join("|")
        if (defaultMenus === newMenus) {
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
                        className='modal-remove-icon'
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => onSave(),
                onCancel: () => onClose(),
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        }
    })

    // 编辑二级菜单项展示名称时使用
    const [currentSubMenuData, setCurrentSubMenuData] = useState<EnhancedCustomRouteMenuProps>()
    // 编辑的二级菜单项展示名称
    const [subMenuName, setSubMenuName] = useState<string>("")
    // 编辑二级菜单项展示名称的弹框
    const [visibleSubMenu, setVisibleSubMenu] = useState<boolean>(false)
    // 编辑二级菜单项展示名称
    const onEditSecondMenu = useMemoizedFn((item: EnhancedCustomRouteMenuProps) => {
        setVisibleSubMenu(true)
        setCurrentSubMenuData(item)
        setSubMenuName(item.label)
    })
    // 编辑二级菜单项展示名称-完成的回调
    const onEditSubMenuName = useMemoizedFn(() => {
        if (!currentSubMenuData?.label) return
        const index = subMenuData.findIndex((item) => item.label === currentSubMenuData?.label)
        if (index === -1) return
        subMenuData[index] = {
            ...subMenuData[index],
            label: subMenuName
        }
        updateData(subMenuData)
        setVisibleSubMenu(false)
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
                            {isCommunityEdition()
                                ? "编辑常用插件"
                                : patternMenu === "expert"
                                ? "编辑专家模式"
                                : "编辑扫描模式"}
                        </div>
                        <div className={style["left-number"]}>
                            {menuData.length}/{UpperLimit}
                        </div>
                    </div>
                    <div>
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
                        {!isCommunityEdition() && (
                            <YakitButton type='outline1' onClick={() => onSave("export")}>
                                导出 JSON
                            </YakitButton>
                        )}
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
                        onRemoveFirstMenu={() => {
                            if (currentFirstMenu && currentFirstMenu.label) onRemoveFirstMenu(currentFirstMenu)
                        }}
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
                hiddenHeader={true}
                closable={false}
                footer={null}
                visible={visibleSubMenu}
                onCancel={() => setVisibleSubMenu(false)}
                bodyStyle={{padding: 0}}
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
                hiddenHeader={true}
                footer={null}
                visible={emptyMenuLength > 0}
                onCancel={() => setEmptyMenuLength(0)}
                width={431}
                bodyStyle={{padding: 0}}
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
                        <YakitButton
                            type='primary'
                            size='large'
                            onClick={() => {
                                if (tip === "导出") onImportJSON()
                                else onSaveLocal()
                            }}
                        >
                            {tip}
                        </YakitButton>
                    </div>
                </div>
            </YakitModal>
        </div>
    )
})

export default CustomizeMenu

// 拖拽功能所需
const getItemStyle = (isDragging, draggableStyle) => ({
    ...draggableStyle
})

const getItemStyleSecond = (isDragging, draggableStyle) => ({
    background: isDragging ? "red" : "",
    ...draggableStyle
})
/** @name 左侧一级菜单栏 */
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
            const menuList: EnhancedPrivateRouteMenuProps[] = reorder(
                menuData,
                result.source.index,
                result.destination.index
            )
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
                                <Draggable
                                    key={`${item.id || ""}-${item.menuName}-${index}`}
                                    draggableId={item.id || item.menuName}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                        >
                                            <FirstMenuItem
                                                key={`${item.id || ""}-${item.menuName}-${index}`}
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
/** @name 左侧一级菜单项 */
const FirstMenuItem: React.FC<FirstMenuItemProps> = React.memo((props) => {
    const {menuItem, currentMenuItem, isDragging, onSelect, destinationDrag, onRemove} = props

    return (
        <div
            className={classNames(style["first-menu-item"], {
                [style["first-menu-item-select"]]:
                    menuItem.id === currentMenuItem?.id && menuItem.label === currentMenuItem?.label,
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
            <div className={style["first-sub-menu-number"]}>{menuItem.children?.length || 0}</div>
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
/** @name 中间二级菜单栏 */
const SecondMenu: React.FC<SecondMenuProps> = React.memo((props) => {
    const {currentFirstMenu, subMenuData, editCurrentFirstMenu, onRemoveFirstMenu, onRemoveSecondMenu, onEdit} = props
    // 一级和二级菜单项数量上限
    const UpperLimit = useMemo(() => {
        if (isCommunityEdition()) return 20
        return 50
    }, [])

    return (
        <div className={style["second-menu"]}>
            <div className={style["second-menu-heard"]}>
                <div className={style["second-menu-heard-input"]}>
                    <Input
                        placeholder='未命名1 (菜单名建议 4-16 个英文字符内最佳)'
                        bordered={false}
                        suffix={
                            <YakitPopconfirm
                                title='是否要删除该菜单'
                                onConfirm={onRemoveFirstMenu}
                                placement='bottomRight'
                            >
                                <div className={style["trash-style"]}>
                                    <TrashIcon />
                                </div>
                            </YakitPopconfirm>
                        }
                        value={currentFirstMenu?.label}
                        onChange={(e) => {
                            editCurrentFirstMenu(e.target.value)
                        }}
                    />
                </div>
                <div className={style["second-menu-heard-tip"]}>
                    已添加功能 {subMenuData.length}/{UpperLimit}
                </div>
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
                                    <Draggable key={item.label} draggableId={item.label} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                            >
                                                <SecondMenuItem
                                                    key={item.label}
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
/** @name 中间二级菜单项 */
const SecondMenuItem: React.FC<SecondMenuItemProps> = React.memo((props) => {
    const {menuItem, isDragging, onRemoveSecondMenu, onEdit} = props

    const showIcon = useMemo(() => {
        if (isCommunityEdition()) {
            return (
                (
                    <Avatar
                        className={style["avatar-style"]}
                        src={menuItem.headImg || ""}
                        icon={<PrivateOutlineDefaultPluginIcon />}
                    />
                ) || <PrivateOutlineDefaultPluginIcon />
            )
        } else {
            return menuItem.icon || <PrivateOutlineDefaultPluginIcon />
        }
    }, [menuItem])

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
                {showIcon}
                <div className={style["second-menu-label-body"]}>
                    <div className={style["second-menu-label-content"]}>
                        <span className={style["second-menu-label"]}>{menuItem.label}</span>
                        {menuItem.page === YakitRoute.Plugin_OP && (
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
                <YakitButton
                    size='small'
                    type='text2'
                    icon={<RemoveIcon className={style["close-icon"]} />}
                    onClick={() => onRemoveSecondMenu(menuItem)}
                />
            </div>
        </div>
    )
})
/** @name 右侧全部菜单(系统菜单|插件商店) */
const FeaturesAndPlugin: React.FC<FeaturesAndPluginProps> = React.memo((props) => {
    const [type, setType] = useState<"system" | "plugin">(isCommunityEdition() ? "plugin" : "system")
    const [keywords, setKeyWords] = useState<string>("")
    const [isSearch, setIsSearch] = useState<boolean>(false)
    return (
        <>
            <div className={style["right-heard"]}>
                {isCommunityEdition() ? (
                    <div className={style["header-title"]}>插件商店</div>
                ) : (
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
                )}
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
/** @name 右侧系统菜单栏 */
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
    // 搜索功能
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
                                props.subMenuData.findIndex((i) => i.menuName === item.menuName) !== -1
                            return (
                                <Draggable
                                    key={item.label}
                                    draggableId={`${item.label}-system`}
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
/** @name 右侧系统菜单项 */
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

                <Tooltip
                    title={item.describe || "No Description about it."}
                    placement='topRight'
                    overlayClassName={style["question-tooltip"]}
                >
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
/** @name 右侧插件商店栏 */
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
                yakitNotify("error", "Query Local Yak Script yakitFailed: " + `${e}`)
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
/** @name 右侧插件商店项 */
const PluginLocalItem: React.FC<PluginLocalItemProps> = React.memo((props) => {
    const {plugin, isDragging, destinationDrag, onAddMenuData, isDragDisabled, onRemoveMenu} = props
    const pluginRef = useRef(null)
    const isHovering = useHover(pluginRef)
    const onAdd = useMemoizedFn(() => {
        const menuItem: EnhancedCustomRouteMenuProps = {
            page: YakitRoute.Plugin_OP,
            label: plugin.ScriptName,
            menuName: plugin.ScriptName,
            icon: getFixedPluginIcon(plugin.ScriptName),
            hoverIcon: getFixedPluginHoverIcon(plugin.ScriptName),
            describe: plugin.Help,
            yakScriptId: +plugin.Id || 0,
            yakScripName: plugin.ScriptName,
            headImg: plugin.HeadImg || ""
        }
        onAddMenuData(menuItem)
    })
    const onRemove = useMemoizedFn(() => {
        const menuItem: EnhancedCustomRouteMenuProps = {
            page: YakitRoute.Plugin_OP,
            label: plugin.ScriptName,
            menuName: plugin.ScriptName,
            icon: getFixedPluginIcon(plugin.ScriptName),
            hoverIcon: getFixedPluginHoverIcon(plugin.ScriptName),
            describe: plugin.Help,
            yakScriptId: +plugin.Id || 0,
            yakScripName: plugin.ScriptName,
            headImg: plugin.HeadImg || ""
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
/** @name 右侧插件项标识icon */
export const PluginLocalInfoIcon: React.FC<PluginLocalInfoProps> = React.memo((props) => {
    const {plugin, getScriptInfo} = props
    const renderIcon = useMemoizedFn(() => {
        if (plugin.OnlineOfficial) {
            return (
                <Tooltip title='官方插件'>
                    <SolidOfficialpluginIcon className={style["plugin-local-icon"]} />
                </Tooltip>
            )
        }
        if (plugin.OnlineIsPrivate) {
            return (
                <Tooltip title='私有插件'>
                    <SolidPrivatepluginIcon className={style["plugin-local-icon"]} />
                </Tooltip>
            )
        }
        if (plugin.UUID) {
            return (
                <Tooltip title='云端插件'>
                    <SolidCloudpluginIcon className={style["plugin-local-icon"]} />
                </Tooltip>
            )
        }
    })
    return (
        <>
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
                content={<YakEditor type={plugin.Type} value={plugin.Content} readOnly={true} />}
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
