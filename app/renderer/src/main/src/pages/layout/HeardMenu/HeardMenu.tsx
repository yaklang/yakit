import React, {useEffect, useRef, useState} from "react"
import {
    HeardMenuProps,
    RouteMenuDataItemProps,
    SubMenuProps,
    CollapseMenuProp,
    MenuByGroupProps,
    DownloadOnlinePluginByScriptNamesResponse
} from "./HeardMenuType"
import style from "./HeardMenu.module.scss"
import {DefaultRouteMenuData, HiddenMenuData, MenuDataProps, Route,SimbleDataBaseMenu} from "@/routes/routeSpec"
import classNames from "classnames"
import {
    AcademicCapIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CubeIcon,
    CursorClickIcon,
    DotsHorizontalIcon,
    PencilAltIcon,
    RemoveIcon,
    SaveIcon,
    SortAscendingIcon,
    SortDescendingIcon,
    UserIcon
} from "@/assets/newIcon"
import ReactResizeDetector from "react-resize-detector"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {Divider, Dropdown, Tabs, Tooltip, Form, Upload, Modal, Spin} from "antd"
import {
    MenuBasicCrawlerIcon,
    MenuComprehensiveCatalogScanningAndBlastingIcon,
    MenuSpaceEngineHunterIcon,
    MenuSubDomainCollectionIcon,
    MenuDefaultPluginIcon,
    MenuPayloadIcon,
    MenuYakRunnerIcon
} from "@/pages/customizeMenu/icon/menuIcon"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakCodeEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {getMenuListBySort, getMenuListToLocal} from "@/pages/customizeMenu/CustomizeMenu"
import {InputFileNameItem} from "@/utils/inputUtil"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {
    MenuSolidBasicCrawlerIcon,
    MenuSolidComprehensiveCatalogScanningAndBlastingIcon,
    MenuSolidDefaultPluginIcon,
    MenuSolidSpaceEngineHunterIcon,
    MenuSolidSubDomainCollectionIcon
} from "@/pages/customizeMenu/icon/solidMenuIcon"
import {ExclamationCircleOutlined, LoadingOutlined} from "@ant-design/icons"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {MenuItem, MenuItemGroup} from "@/pages/MainOperator"
import {failed} from "@/utils/notification"
import {YakScript} from "@/pages/invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {useStore} from "@/store"
import {isSimbleEnterprise} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

export const getScriptIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <MenuBasicCrawlerIcon />
        case "空间引擎: Hunter": //中文
            return <MenuSpaceEngineHunterIcon />
        case "子域名收集":
            return <MenuSubDomainCollectionIcon />
        case "综合目录扫描与爆破":
            return <MenuComprehensiveCatalogScanningAndBlastingIcon />
        default:
            return <MenuDefaultPluginIcon />
    }
}

export const getScriptHoverIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <MenuSolidBasicCrawlerIcon />
        case "空间引擎: Hunter": //中文
            return <MenuSolidSpaceEngineHunterIcon />
        case "子域名收集":
            return <MenuSolidSubDomainCollectionIcon />
        case "综合目录扫描与爆破":
            return <MenuSolidComprehensiveCatalogScanningAndBlastingIcon />
        default:
            return <MenuSolidDefaultPluginIcon />
    }
}

/**
 * @description:
 * @param {MenuDataProps} menuItemGroup 自定义菜单参数
 * @param {menuItemGroup} routeMenuData 路由参数
 * @param {} onRouteMenuSelect 系统菜单选择事件
 */
const HeardMenu: React.FC<HeardMenuProps> = React.memo((props) => {
    const {onRouteMenuSelect, setRouteKeyToLabel} = props
    /**
     * @description: 融合系统菜单和自定义菜单
     */
    const [routeMenu, setRouteMenu] = useState<MenuDataProps[]>([])
    /**
     * @description: 折叠起来的菜单
     */
    const [routeMenuDataAfter, setRouteMenuDataAfter] = useState<MenuDataProps[]>([])
    const [width, setWidth] = useState<number>(0)
    const [number, setNumber] = useState<number>(-1)
    const [moreLeft, setMoreLeft] = useState<number>(0) // 更多文字的left
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [subMenuData, setSubMenuData] = useState<MenuDataProps[]>([])
    const [menuId, setMenuId, getMenuId] = useGetState<string>("")
    const [customizeVisible, setCustomizeVisible] = useState<boolean>(false)
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

    const [loading, setLoading] = useState<boolean>(true)

    const [patternMenu, setPatternMenu, getPatternMenu] = useGetState<"expert" | "new">("expert")
    const [visibleImport, setVisibleImport] = useState<boolean>(false)
    const [menuDataString, setMenuDataString] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")

    const [importLoading, setImportLoading] = useState<boolean>(false)

    const menuLeftRef = useRef<any>()
    const menuLeftInnerRef = useRef<any>()

    const routeKeyToLabel = useRef<Map<string, string>>(new Map<string, string>())
    
    /** 登录用户信息 */
    const {userInfo} = useStore()
    useEffect(() => {
        // 当为企业简易版
        if(isSimbleEnterprise){
            let currentMenuList: MenuDataProps[] = [...SimbleDataBaseMenu]
            setRouteMenu(currentMenuList)
            setSubMenuData(currentMenuList[0].subMenuData||[])
            setMenuId(currentMenuList[0].id)
        }
        else{
            getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            setRemoteValue("PatternMenu", menuMode)
            setPatternMenu(menuMode)
            init(menuMode)
        })
        }
        
    }, [])
    useEffect(() => {
        if(!isSimbleEnterprise){
            ipcRenderer.on("fetch-new-main-menu", (e) => {
                init(getPatternMenu(), true)
            })
        }
        
        return () => {
            if(!isSimbleEnterprise){
                ipcRenderer.removeAllListeners("fetch-new-main-menu")
            }
        }
    }, [])
    useUpdateEffect(() => {
        getRouteKeyToLabel()
    }, [routeMenu])
    /**
     * @description: 菜单更新后，重新刷新路由key值，并返回给父级组件
     */
    const getRouteKeyToLabel = useMemoizedFn(() => {
        routeMenu.forEach((k) => {
            ;(k.subMenuData || []).forEach((subKey) => {
                routeKeyToLabel.current.set(`${subKey.key}`, subKey.label)
            })
            routeKeyToLabel.current.set(`${k.key}`, k.label)
        })
        HiddenMenuData.forEach((k) => {
            routeKeyToLabel.current.set(`${k.key}`, k.label)
        })
        setRouteKeyToLabel(routeKeyToLabel.current)
    })
    /**
     * @description: 初始化菜单
     */
    const init = useMemoizedFn((menuMode: string, updateSubMenu?: boolean) => {
        let oldMenuData: MenuItemGroup[] = []
        setLoading(true)
        // 获取老版的菜单数据，兼容
        ipcRenderer
            .invoke("QueryAllMenuItem", {Mode: ""})
            .then((data: {Groups: MenuItemGroup[]}) => {
                oldMenuData = data.Groups
                //获取模式菜单 如果获取的菜单数据为空，则新增默认菜单数据
                ipcRenderer
                    .invoke("QueryAllMenuItem", {Mode: menuMode})
                    .then((rsp: MenuByGroupProps) => {
                        if (rsp.Groups.length === 0) {
                            // 获取的数据为空，先使用默认数据覆盖，然后再通过名字下载，然后保存菜单数据
                            onInitMenuData(menuMode, oldMenuData)
                        } else {
                            // 默认菜单中，有新增的菜单，前提：系统内置菜单不可删除 企业简易版管理员默认展示所有菜单
                            let currentMenuList: MenuDataProps[] = [...DefaultRouteMenuData]
                            // 新手版菜单-novice
                            if (menuMode == "new") {
                                currentMenuList = [...DefaultRouteMenuData].filter((item) => item.menuPattern?.includes("novice"))
                            }
                            const newMenuList: MenuItem[] = [] // 用来判断是否有新增菜单
                            const addMenuScripName: string[] = [] // 用来判断是否有新增的插件菜单
                            for (let i = 0; i < rsp.Groups.length; i++) {
                                const onlineMenuItem = rsp.Groups[i]
                                const localMenuItem = currentMenuList.find((ele) => ele.label === onlineMenuItem.Group)
                                if (localMenuItem && localMenuItem.subMenuData) {
                                    for (let j = 0; j < localMenuItem.subMenuData.length; j++) {
                                        const item = localMenuItem.subMenuData[j]
                                        if (!item.key) continue
                                        const index = onlineMenuItem.Items.findIndex((o) => o.Verbose === item.label)
                                        if (index === -1) {
                                            if (!item.key || item.key.includes("plugin")) {
                                                // 新增的默认插件菜单
                                                addMenuScripName.push(item.yakScripName || item.label)
                                            }
                                            const newMenuItem: MenuItem = {
                                                Group: onlineMenuItem.Group,
                                                GroupSort: rsp.Groups[i].Items.length + 1,
                                                Verbose: item.label,
                                                YakScriptId: 0,
                                                YakScriptName: item.key ? "" : item.yakScripName
                                            }
                                            newMenuList.push(newMenuItem)
                                            rsp.Groups[i].Items.push(newMenuItem)
                                        }
                                    }
                                }
                            }
                            const routerList: MenuDataProps[] = getMenuListToLocal(rsp.Groups)
                            if (newMenuList.length > 0) {
                                onDownPluginByScriptNames(routerList, addMenuScripName, menuMode)
                            }
                            setRouteMenu(routerList)
                            if ((updateSubMenu || !menuId) && routerList.length > 0) {
                                let firstMenu: MenuDataProps = routerList[0] || {id: "", label: ""}
                                if (menuId) {
                                    firstMenu = routerList.find((i) => i.id === menuId) || {id: "", label: ""}
                                }
                                setSubMenuData(firstMenu.subMenuData || [])
                                setMenuId(firstMenu.id)
                            }
                            setTimeout(() => setLoading(false), 300)
                        }
                    })
                    .catch((err) => {
                        failed("获取菜单失败：" + err)
                        setTimeout(() => setLoading(false), 300)
                    })
            })
            .catch((e: any) => {
                failed("获取菜单失败：" + e)
                setTimeout(() => setLoading(false), 300)
            })
    })
    const onInitMenuData = useMemoizedFn((menuMode: string, oldMenuData: MenuItemGroup[]) => {
        const oldMenuDataLocal: MenuDataProps[] = getMenuListToLocal(oldMenuData)
        let menuList: MenuDataProps[] = [...DefaultRouteMenuData]
        if (oldMenuData.length > 0) {
            menuList = [...oldMenuDataLocal, ...menuList].map((item, index) => {
                item.subMenuData?.map((subItem, subIndex) => ({...subItem, id: `${index + 1}-${subIndex + 1}`}))
                item.id = `${index + 1}`
                return item
            })
        }
        const noDownPluginScriptNames: string[] = []
        // 获取没有key的菜单名称
        let listMenu: MenuDataProps[] = menuList
        if (menuMode == "new") {
            listMenu = menuList.filter((item) => item.menuPattern?.includes("novice"))
        }
        listMenu.forEach((item) => {
            if (item.subMenuData && item.subMenuData.length > 0) {
                item.subMenuData.forEach((subItem) => {
                    if (!subItem.key || (subItem.key as string) === "plugin:0") {
                        noDownPluginScriptNames.push(subItem.yakScripName || subItem.label)
                    }
                })
            }
        })
        // 下载插件这个接口受网速影响，有点慢，采取先赋值菜单，然后再去下载，下载成功后再次替换菜单数据
        setRouteMenu(listMenu)
        if (listMenu.length > 0) {
            setSubMenuData(listMenu[0].subMenuData || [])
            setMenuId(listMenu[0].id)
        }
        onDownPluginByScriptNames(listMenu, noDownPluginScriptNames, menuMode)
    })
    /**
     * @description: 通过名字下载插件
     */
    const onDownPluginByScriptNames = useMemoizedFn(
        (listMenu: MenuDataProps[], noDownPluginScriptNames: string[], menuMode: string, callBack?: () => void) => {
            ipcRenderer
                .invoke("DownloadOnlinePluginByScriptNames", {
                    ScriptNames: noDownPluginScriptNames,
                    Token: userInfo.token
                })
                .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                    if (rsp.Data.length > 0) {
                        const newMenuData: MenuDataProps[] = []
                        listMenu.forEach((item) => {
                            const firstMenuList: MenuDataProps[] = []
                            if (item.subMenuData && item.subMenuData.length > 0) {
                                item.subMenuData.forEach((subItem) => {
                                    if (!subItem.key || (subItem.key as string).includes("plugin")) {
                                        const currentMenuItem = rsp.Data.find(
                                            (m) => m.ScriptName === (subItem.yakScripName || subItem.label)
                                        ) || {
                                            Id: 0,
                                            ScriptName: ""
                                        }
                                        if (currentMenuItem.Id) {
                                            subItem.key = `plugin:${currentMenuItem.Id}` as Route
                                            subItem.yakScriptId = currentMenuItem.Id
                                            subItem.yakScripName = currentMenuItem.ScriptName
                                        }
                                    }
                                    firstMenuList.push(subItem)
                                })
                            }
                            newMenuData.push({...item, subMenuData: firstMenuList})
                        })
                        onAddMenus(newMenuData, menuMode, callBack)
                    } else {
                        onAddMenus(listMenu, menuMode, callBack)
                    }
                })
                .catch((err) => {
                    failed("下载菜单插件失败：" + err)
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                })
        }
    )
    /**
     * @description: 删除mode为空的菜单
     */
    const onRemoveEmpty = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteAllMenu", {Mode: ""})
            .then(() => {
                // 更新菜单
                // ipcRenderer.invoke("change-main-menu")
            })
            .catch((e: any) => {
                failed(`删除菜单失败:${e}`)
            })
    })
    /**
     * @description: 保存最新的菜单数据
     */
    const onAddMenus = useMemoizedFn((data: MenuDataProps[], menuMode: string, callBack?: () => void) => {
        const menuLists = getMenuListBySort(data, menuMode)
        ipcRenderer
            .invoke("AddMenus", {Data: menuLists})
            .then((rsp) => {
                setRouteMenu(data)
                if (!menuId && data.length > 0) {
                    setSubMenuData(data[0].subMenuData || [])
                    setMenuId(data[0].id)
                }
                onRemoveEmpty()
                if (callBack) callBack()
            })
            .catch((err) => {
                failed("保存菜单失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    useEffect(() => {
        if (!width) return
        toMove()
    }, [width, routeMenu])

    /**
     * @description: 计算是否显示一级折叠菜单
     */
    const toMove = useMemoizedFn(() => {
        const menuWidth = menuLeftRef.current.clientWidth
        let childrenList: any[] = menuLeftInnerRef.current.children
        let childWidthAll = 0
        let n = -1
        let clientWidth: number[] = []
        for (let index = 0; index < childrenList.length; index++) {
            const element = childrenList[index]
            childWidthAll += element.clientWidth
            if (childWidthAll > menuWidth) {
                n = index
                break
            }
            clientWidth[index] = element.clientWidth
        }
        setNumber(n)
        if (clientWidth.length > 0) {
            setMoreLeft(clientWidth.reduce((p, c) => p + c))
        }
        if (n < 0) {
            setRouteMenuDataAfter([])
            return
        }

        const afterRoute: MenuDataProps[] = []
        const beforeRoute: MenuDataProps[] = []
        routeMenu.forEach((ele, index) => {
            if (ele.subMenuData && ele.subMenuData.length > 0) {
                if (index < n) {
                    beforeRoute.push(ele)
                } else {
                    afterRoute.push(ele)
                }
            }
        })
        setRouteMenuDataAfter(afterRoute)
    })
    const onExpand = useMemoizedFn(() => {
        setIsExpand(true)
        if (!menuId && routeMenu.length > 0) {
            setSubMenuData(routeMenu[0].subMenuData || [])
            setMenuId(routeMenu[0].id || "")
        }
    })
    /**
     * @description: 打开页面
     */
    const onTabClick = useMemoizedFn((key) => {
        if (!key || key === "plugin:0") return
        const index = key.indexOf("###")
        if (index === -1) return
        const newKey: string = key.substring(0, index)
        if (newKey.includes("plugin")) {
            const labelIndex = key.indexOf("***")
            const name = key.substring(index + 3, labelIndex)
            onCheckPlugin(name, newKey)
        } else {
            onRouteMenuSelect(newKey as Route)
        }
    })
    const onCheckPlugin = useMemoizedFn((name: string, newKey: string) => {
        // 先验证菜单的插件id和本地最新的插件id是不是一致的
        ipcRenderer
            .invoke("GetYakScriptByName", {Name: name})
            .then((i: YakScript) => {
                const lastPluginID = `plugin:${i.Id}`
                onRouteMenuSelect(`${lastPluginID}` as Route)
                if (newKey !== lastPluginID) {
                    // 更新菜单
                    onUpdateMenuItem(i)
                }
            })
            .catch((err) => {
                const currentMenuItem: MenuDataProps = subMenuData.find((l) => l.key === newKey) || {
                    id: "",
                    label: ""
                }
                if (currentMenuItem) {
                    const item: MenuDataProps = {
                        id: currentMenuItem.id,
                        label: currentMenuItem.label,
                        yakScripName: currentMenuItem.yakScripName
                    }
                    onOpenDownModal(item)
                } else {
                    failed("菜单数据异常,请刷新菜单重试")
                }
            })
    })
    /**
     * @description: 更新菜单数据，单条
     */
    const onUpdateMenuItem = useMemoizedFn((i: YakScript) => {
        const selectMenu = subMenuData.find((ele) => ele.yakScripName === i.ScriptName)
        const params = {
            Group: selectMenu?.Group,
            Verbose: i.ScriptName,
            YakScriptId: i.Id
        }
        ipcRenderer
            .invoke("AddToMenu", params)
            .then(() => {
                // 更新菜单
                ipcRenderer.invoke("change-main-menu")
            })
            .catch((e: any) => {
                failed(`${e}`)
            })
    })
    const onCustomizeMenuClick = useMemoizedFn((key: string) => {
        init(key, true)
        setRemoteValue("PatternMenu", key)
            .then(() => {
                setPatternMenu(key as "expert" | "new")
            })
            .catch((e: any) => {
                failed(`切换菜单模式失败:${e}`)
            })
    })
    /**
     * @description: 编辑菜单
     */
    const onGoCustomize = useMemoizedFn(() => {
        ipcRenderer.invoke("open-customize-menu")
    })
    /**
     * @description: 复原菜单
     */
    const onRestoreMenu = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteAllMenu", {Mode: patternMenu})
            .then(() => {
                // 更新菜单
                ipcRenderer.invoke("change-main-menu")
            })
            .catch((e: any) => {
                failed(`删除菜单失败:${e}`)
            })
    })
    const CustomizeMenuData = [
        {
            key: "new",
            label: "扫描模式",
            itemIcon: <UserIcon />,
            tip: "复原扫描模式",
            onRestoreMenu: () => onRestoreMenu()
        },
        {
            key: "expert",
            label: "专家模式",
            itemIcon: <AcademicCapIcon />,
            tip: "复原专家模式",
            onRestoreMenu: () => onRestoreMenu()
        }
    ]

    const onImportJSON = useMemoizedFn(() => {
        if (!menuDataString) {
            failed("数据不能为空")
            return
        }
        try {
            const menuLists: MenuItemGroup = JSON.parse(menuDataString).map((ele) => ({...ele, Mode: patternMenu}))
            setImportLoading(true)
            ipcRenderer
                .invoke("DeleteAllMenu", {Mode: patternMenu})
                .then(() => {
                    ipcRenderer
                        .invoke("AddMenus", {Data: menuLists})
                        .then(() => {
                            setVisibleImport(false)
                            ipcRenderer.invoke("change-main-menu")
                        })
                        .catch((err) => {
                            failed("保存菜单失败：" + err)
                        })
                        .finally(() => {
                            setTimeout(() => {
                                setImportLoading(false)
                            }, 300)
                        })
                })
                .catch((e: any) => {
                    failed(`删除菜单失败:${e}`)
                })
        } catch (error) {
            failed("导入失败:" + error)
        }
    })

    const onOpenDownModal = useMemoizedFn((menuItem: MenuDataProps) => {
        const m = YakitModalConfirm({
            width: 420,
            closable: false,
            title: "插件加载失败",
            showConfirmLoading: true,
            content: (
                <div className={style["modal-content"]}>
                    {menuItem.label}菜单丢失，需点击重新下载，如仍无法下载，请前往插件商店查找
                    <span className={style["menuItem-yakScripName"]}>{menuItem.yakScripName || menuItem.label}</span>
                    插件
                </div>
            ),
            onOkText: "重新下载",
            onOk: () => {
                // 插件一定有插件名称
                const noDownPluginScriptNames: string[] = [menuItem.yakScripName || menuItem.label]
                onDownPluginByScriptNames(routeMenu, noDownPluginScriptNames, patternMenu, () => {
                    const itemMenu = subMenuData.find((i) => i.yakScripName === menuItem.yakScripName)
                    if (!itemMenu) return
                    onTabClick(`${itemMenu.key}###${itemMenu.yakScripName || ""}***1`)
                    m.destroy()
                })
            }
        })
    })

    const onRefMenu = useMemoizedFn(() => {
        init(getPatternMenu(), true)
    })

    return (
        <div className={style["heard-menu-body"]}>
            <div
                className={classNames(style["heard-menu"], {
                    [style["heard-menu-expand"]]: isExpand
                })}
            >
                <ReactResizeDetector
                    onResize={(w) => {
                        if (!w) {
                            return
                        }
                        setWidth(w)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <div className={classNames(style["heard-menu-left"])} ref={menuLeftRef}>
                    <div className={classNames(style["heard-menu-left-inner"])} ref={menuLeftInnerRef}>
                        {routeMenu
                            .filter((ele) => ele.subMenuData && ele.subMenuData?.length > 0)
                            .map((menuItem, index) => {
                                return (
                                    <RouteMenuDataItem
                                        key={`menuItem-${menuItem.id}`}
                                        menuItem={menuItem}
                                        isShow={number > 0 ? number <= index : false}
                                        onSelect={(r) => {
                                            if (!r.key) return
                                            if (r.key.includes("plugin")) {
                                                onCheckPlugin(r.yakScripName || r.label, r.key)
                                            } else {
                                                onRouteMenuSelect(r.key as Route)
                                            }
                                        }}
                                        isExpand={isExpand}
                                        setSubMenuData={(menu) => {
                                            setSubMenuData(menu.subMenuData || [])
                                            setMenuId(menu.id || "")
                                        }}
                                        activeMenuId={menuId}
                                        onOpenDownModal={onOpenDownModal}
                                    />
                                )
                            })}
                    </div>
                    {number > 0 && routeMenuDataAfter.length > 0 && (
                        <>
                            <CollapseMenu
                                moreLeft={moreLeft}
                                menuData={routeMenuDataAfter}
                                isExpand={isExpand}
                                onMenuSelect={(key) => onRouteMenuSelect(key as Route)}
                            />
                        </>
                    )}
                </div>
                <div className={classNames(style["heard-menu-right"])}>
                    {!isSimbleEnterprise&&<>
                        <YakitButton
                        type='text'
                        className={style["heard-menu-theme"]}
                        onClick={() => onImportShare()}
                        icon={<SaveIcon />}
                    >
                        导入协作资源
                    </YakitButton>
                    <YakitButton
                        type='secondary2'
                        className={style["heard-menu-grey"]}
                        onClick={() => onRouteMenuSelect(Route.PayloadManager)}
                        icon={<MenuPayloadIcon />}
                    >
                        Payload
                    </YakitButton>
                    <YakitButton
                        type='secondary2'
                        className={classNames(style["heard-menu-grey"], style["heard-menu-yak-run"])}
                        onClick={() => onRouteMenuSelect(Route.YakScript)}
                        icon={<MenuYakRunnerIcon />}
                    >
                        Yak Runner
                    </YakitButton>
                    <Dropdown
                        overlayClassName={style["customize-drop-menu"]}
                        overlay={
                            <>
                                {CustomizeMenuData.map((item) => (
                                    <div
                                        key={item.key}
                                        className={classNames(style["customize-item"], {
                                            [style["customize-item-select"]]: patternMenu === item.key
                                        })}
                                        onClick={() => onCustomizeMenuClick(item.key)}
                                    >
                                        <div className={style["customize-item-left"]}>
                                            {item.itemIcon}
                                            <span className={style["customize-item-label"]}>{item.label}</span>
                                        </div>
                                        {patternMenu === item.key && <CheckIcon />}
                                    </div>
                                ))}
                                <Divider style={{margin: "6px 0"}} />
                                <YakitSpin spinning={loading} tip='Loading...' size='small'>
                                    <div
                                        className={classNames(style["customize-item"])}
                                        onClick={() =>
                                            CustomizeMenuData.find((ele) => patternMenu === ele.key)?.onRestoreMenu()
                                        }
                                    >
                                        {CustomizeMenuData.find((ele) => patternMenu === ele.key)?.tip}
                                    </div>
                                    <div
                                        className={classNames(style["customize-item"])}
                                        onClick={() => onGoCustomize()}
                                    >
                                        编辑菜单
                                    </div>
                                    <div
                                        className={classNames(style["customize-item"])}
                                        onClick={() => {
                                            setVisibleImport(true)
                                            setMenuDataString("")
                                            setFileName("")
                                            setRefreshTrigger(!refreshTrigger)
                                        }}
                                    >
                                        导入 JSON 配置
                                    </div>
                                </YakitSpin>
                            </>
                        }
                        onVisibleChange={(e) => {
                            setCustomizeVisible(e)
                        }}
                    >
                        <YakitButton
                            type='secondary2'
                            className={classNames(style["heard-menu-customize"], {
                                [style["margin-right-0"]]: isExpand,
                                [style["heard-menu-customize-menu"]]: customizeVisible
                            })}
                            icon={<CursorClickIcon style={{color: "var(--yakit-body-text-color)"}} />}
                        >
                            <div className={style["heard-menu-customize-content"]}>
                                自定义{(customizeVisible && <ChevronUpIcon />) || <ChevronDownIcon />}
                            </div>
                        </YakitButton>
                    </Dropdown>
                    </>}
                    {!isExpand && (
                        <div className={style["heard-menu-sort"]} onClick={() => onExpand()}>
                            {!isExpand && <SortDescendingIcon />}
                        </div>
                    )}
                </div>
            </div>
            {isExpand && (
                <div className={style["heard-sub-menu-expand"]}>
                    <Tabs
                        tabBarExtraContent={
                            <div className={style["heard-menu-sort"]} onClick={() => setIsExpand(false)}>
                                <SortAscendingIcon />
                            </div>
                        }
                        onTabClick={onTabClick}
                        popupClassName={style["heard-sub-menu-popup"]}
                        moreIcon={<DotsHorizontalIcon className={style["dots-icon"]} />}
                    >
                        {subMenuData.map((item, index) => {
                            const nodeLabel = (
                                <div
                                    className={classNames(
                                        style["sub-menu-expand-item-label"],
                                        style["heard-menu-item-label"]
                                    )}
                                >
                                    {item.label === "UserDefined" ? "社区插件" : item.label}
                                </div>
                            )
                            const isDisable = !item.key || (item.key as string) === "plugin:0"
                            return (
                                <Tabs.TabPane
                                    tab={
                                        <div className={style["sub-menu-expand"]}>
                                            {(!isDisable && (
                                                <div
                                                    className={style["sub-menu-expand-item"]}
                                                    style={{paddingLeft: index === 0 ? 0 : ""}}
                                                >
                                                    <div className={style["sub-menu-expand-item-icon"]}>
                                                        <span className={style["item-icon"]}>{item.icon}</span>
                                                        <span className={style["item-hoverIcon"]}>
                                                            {item.hoverIcon}
                                                        </span>
                                                    </div>
                                                    <Tooltip title={item.label} placement='bottom'>
                                                        <div
                                                            className={classNames(
                                                                style["sub-menu-expand-item-label"],
                                                                style["heard-menu-item-label"]
                                                            )}
                                                        >
                                                            {item.label}
                                                        </div>
                                                    </Tooltip>
                                                </div>
                                            )) || (
                                                <div
                                                    className={classNames(style["sub-menu-expand-item"], {
                                                        [style["sub-menu-expand-item-disable"]]: isDisable
                                                    })}
                                                    style={{paddingLeft: index === 0 ? 0 : ""}}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (loading) return
                                                        onOpenDownModal(item)
                                                    }}
                                                >
                                                    <div className={style["sub-menu-expand-item-icon"]}>
                                                        <span className={style["item-icon"]}>
                                                            {(loading && <LoadingOutlined />) || item.icon}
                                                        </span>
                                                    </div>
                                                    {(loading && nodeLabel) || (
                                                        <Tooltip title='插件丢失，点击下载' placement='bottom'>
                                                            {nodeLabel}
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            )}
                                            {index !== subMenuData.length - 1 && (
                                                <div className={style["sub-menu-expand-item-line"]} />
                                            )}
                                        </div>
                                    }
                                    key={`${item.key}###${item.yakScripName || item.label}***${index}`}
                                />
                            )
                        })}
                    </Tabs>
                </div>
            )}
            <YakitModal
                title='导入 JSON 配置'
                closable={true}
                visible={visibleImport}
                onCancel={() => setVisibleImport(false)}
                width='60%'
                onOk={() => onImportJSON()}
                confirmLoading={importLoading}
            >
                <Form className={style["json-import"]} layout='vertical'>
                    <YakitFormDragger
                        // accept='application/json,.json'
                        multiple={false}
                        maxCount={1}
                        showUploadList={false}
                        setContent={(val) => {
                            setMenuDataString(val)
                            setRefreshTrigger(!refreshTrigger)
                        }}
                        setFileName={setFileName}
                        fileName={fileName}
                    />
                    <Form.Item label='配置 JSON'>
                        <div style={{height: 400}}>
                            <YakCodeEditor
                                refreshTrigger={refreshTrigger}
                                originValue={StringToUint8Array(menuDataString, "utf8")}
                                language={"json"}
                                onChange={(r) => setMenuDataString(Uint8ArrayToString(r, "utf8"))}
                            />
                        </div>
                    </Form.Item>
                </Form>
            </YakitModal>
        </div>
    )
})

export default HeardMenu

const RouteMenuDataItem: React.FC<RouteMenuDataItemProps> = React.memo((props) => {
    const {menuItem, isShow, onSelect, isExpand, setSubMenuData, activeMenuId, onOpenDownModal} = props
    const [visible, setVisible] = useState<boolean>(false)
    const onOpenSecondMenu = useMemoizedFn(() => {
        if (!isExpand) return
        setSubMenuData(menuItem || [])
    })
    const popoverContent = (
        <div
            className={classNames(style["heard-menu-item"], style["heard-menu-item-font-weight"], {
                [style["heard-menu-item-none"]]: isShow,
                [style["heard-menu-item-flex-start"]]: isExpand,
                [style["heard-menu-item-active"]]: (isExpand && activeMenuId === menuItem.id) || visible
            })}
            onClick={() => onOpenSecondMenu()}
        >
            <Tooltip title={menuItem.label} placement='top'>
                <div className={style["heard-menu-item-label"]}>{menuItem.label}</div>
            </Tooltip>
        </div>
    )
    return (
        (isExpand && popoverContent) || (
            <YakitPopover
                placement='bottomLeft'
                content={
                    <SubMenu
                        subMenuData={menuItem.subMenuData || []}
                        onSelect={onSelect}
                        onOpenDownModal={onOpenDownModal}
                    />
                }
                trigger='hover'
                overlayClassName={classNames(style["popover"], {
                    [style["popover-content"]]: menuItem.subMenuData && menuItem.subMenuData.length <= 1
                })}
                onVisibleChange={setVisible}
                // visible={menuItem.id === "2"}
            >
                {popoverContent}
            </YakitPopover>
        )
    )
})

const SubMenu: React.FC<SubMenuProps> = (props) => {
    const {subMenuData, onSelect, onOpenDownModal} = props
    return (
        <div className={style["heard-sub-menu"]}>
            {subMenuData.map((subMenuItem) => (
                <div
                    className={classNames(style["heard-sub-menu-item"], {
                        [style["heard-sub-menu-item-disable"]]: !subMenuItem.key
                    })}
                    key={`subMenuItem-${subMenuItem.id}`}
                    onClick={() => {
                        if (subMenuItem.key) {
                            onSelect(subMenuItem)
                        } else {
                            onOpenDownModal(subMenuItem)
                        }
                    }}
                >
                    <>
                        <span className={style["heard-sub-menu-item-icon"]}>{subMenuItem.icon}</span>
                        <span className={style["heard-sub-menu-item-hoverIcon"]}>{subMenuItem.hoverIcon}</span>
                    </>
                    {(subMenuItem.key && (
                        <div className={style["heard-sub-menu-label"]}>
                            {subMenuItem.label === "UserDefined" ? "社区插件" : subMenuItem.label}
                        </div>
                    )) || (
                        <Tooltip title='插件丢失，点击下载' placement='bottom' zIndex={9999}>
                            <div className={style["heard-sub-menu-label"]}>
                                {subMenuItem.label === "UserDefined" ? "社区插件" : subMenuItem.label}
                            </div>
                        </Tooltip>
                    )}
                </div>
            ))}
        </div>
    )
}

const CollapseMenu: React.FC<CollapseMenuProp> = React.memo((props) => {
    const {menuData, moreLeft, isExpand, onMenuSelect} = props

    const [show, setShow] = useState<boolean>(false)

    const newMenuData: YakitMenuItemProps[] = menuData.map((item) => ({
        key: item.id || "",
        label: item.label,
        itemIcon: item.icon,
        children:
            item.subMenuData?.map((subItem) => ({
                key: subItem.key || "",
                label: subItem.label
            })) || []
    }))

    const menu = (
        <YakitMenu
            type='secondary'
            isHint={true}
            data={newMenuData}
            width={136}
            onSelect={({key}) => onMenuSelect(key)}
        ></YakitMenu>
    )

    return (
        <div className={style["heard-menu-more"]} style={{left: moreLeft}}>
            <YakitPopover
                placement={"bottomLeft"}
                arrowPointAtCenter={true}
                content={menu}
                trigger='hover'
                onVisibleChange={(visible) => setShow(visible)}
                overlayClassName={classNames(style["popover"])}
            >
                <div
                    className={classNames(style["heard-menu-item"], style["heard-menu-item-font-weight"], {
                        [style["heard-menu-item-open"]]: show,
                        [style["heard-menu-item-flex-start"]]: isExpand
                    })}
                >
                    更多
                    {(show && <ChevronUpIcon />) || <ChevronDownIcon />}
                </div>
            </YakitPopover>
        </div>
    )
})
