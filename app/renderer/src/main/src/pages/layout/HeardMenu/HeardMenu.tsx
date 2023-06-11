import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    HeardMenuProps,
    RouteMenuDataItemProps,
    SubMenuProps,
    CollapseMenuProp,
    DownloadOnlinePluginByScriptNamesResponse,
    CacheMenuItemProps,
    unionMenus,
    EnhancedPrivateRouteMenuProps,
    exchangeMenuProp
} from "./HeardMenuType"
import {
    AcademicCapIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CursorClickIcon,
    DotsHorizontalIcon,
    SaveIcon,
    SortAscendingIcon,
    SortDescendingIcon,
    UserIcon
} from "@/assets/newIcon"
import ReactResizeDetector from "react-resize-detector"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {onImportPlugin, onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {Divider, Dropdown, Tabs, Tooltip, Form} from "antd"
import {MenuDefaultPluginIcon, MenuPayloadIcon, MenuYakRunnerIcon} from "@/pages/customizeMenu/icon/menuIcon"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakCodeEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {MenuSolidDefaultPluginIcon} from "@/pages/customizeMenu/icon/solidMenuIcon"
import {LoadingOutlined} from "@ant-design/icons"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {MenuItemGroup} from "@/pages/MainOperator"
import {failed} from "@/utils/notification"
import {YakScript} from "@/pages/invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {useStore} from "@/store"
import {isEnpriTraceAgent, isCommunityEdition} from "@/utils/envfile"
import {RemoteGV} from "@/yakitGV"
import {
    InvalidFirstMenuItem,
    InvalidPageMenuItem,
    PrivateExpertRouteMenu,
    PrivateScanRouteMenu,
    PrivateSimpleRouteMenu,
    YakitRoute
} from "@/routes/newRoute"
import {RouteToPageProps, StringToRoutePage, routeToMenu, separator} from "../publicMenu/PublicMenu"
import {
    PrivateOutlineBasicCrawlerIcon,
    PrivateOutlineDirectoryScanningIcon,
    PrivateOutlineSpaceEngineIcon,
    PrivateOutlineSubDomainCollectionIcon,
    PrivateSolidBasicCrawlerIcon,
    PrivateSolidDirectoryScanningIcon,
    PrivateSolidSpaceEngineIcon,
    PrivateSolidSubDomainCollectionIcon
} from "@/routes/privateIcon"

import style from "./HeardMenu.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

export const getScriptIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <PrivateOutlineBasicCrawlerIcon />
        case "空间引擎集成版本":
            return <PrivateOutlineSpaceEngineIcon />
        case "子域名收集":
            return <PrivateOutlineSubDomainCollectionIcon />
        case "综合目录扫描与爆破":
            return <PrivateOutlineDirectoryScanningIcon />
        default:
            return <MenuDefaultPluginIcon />
    }
}

export const getScriptHoverIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <PrivateSolidBasicCrawlerIcon />
        case "空间引擎集成版本":
            return <PrivateSolidSpaceEngineIcon />
        case "子域名收集":
            return <PrivateSolidSubDomainCollectionIcon />
        case "综合目录扫描与爆破":
            return <PrivateSolidDirectoryScanningIcon />
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
    const {onRouteMenuSelect, setRouteToLabel} = props

    // 专家模式菜单数据
    const ExpertMenus = useMemo(() => {
        return exchangeMenuProp(PrivateExpertRouteMenu)
    }, [])
    // 扫描模式菜单数据
    const ScanMenus = useMemo(() => {
        return exchangeMenuProp(PrivateScanRouteMenu)
    }, [])
    // 简易模式菜单
    const SimpleMenus = useMemo(() => {
        return exchangeMenuProp(PrivateSimpleRouteMenu)
    }, [])

    /** @name 菜单模式(专家|扫描) */
    const [patternMenu, setPatternMenu, getPatternMenu] = useGetState<"expert" | "new">("expert")
    /** 默认菜单 */
    const DefaultMenu = useMemo(() => {
        if (patternMenu === "new") return ScanMenus
        return ExpertMenus
    }, [patternMenu])

    /** @name 菜单数据 */
    const [routeMenu, setRouteMenu] = useState<EnhancedPrivateRouteMenuProps[]>([])
    /** @name 展开状态下的展示子菜单 */
    const [subMenuData, setSubMenuData] = useState<EnhancedPrivateRouteMenuProps[]>([])
    /** @name 展开状态下的被选中的一级菜单 */
    const [menuId, setMenuId] = useState<string>("")
    /** @description 收起状态下，宽度不够时部分菜单被收起成二级菜单 */
    const [routeMenuDataAfter, setRouteMenuDataAfter] = useState<EnhancedPrivateRouteMenuProps[]>([])
    /** @description 宽度不够时部分菜单被整合的逻辑变量 */
    const [width, setWidth] = useState<number>(0)
    const [number, setNumber] = useState<number>(-1)
    const [moreLeft, setMoreLeft] = useState<number>(0) // 更多文字的left

    const [isExpand, setIsExpand] = useState<boolean>(true)

    const [customizeVisible, setCustomizeVisible] = useState<boolean>(false)
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

    const [loading, setLoading] = useState<boolean>(true)

    const [visibleImport, setVisibleImport] = useState<boolean>(false)
    const [menuDataString, setMenuDataString] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")

    const [importLoading, setImportLoading] = useState<boolean>(false)

    const menuLeftRef = useRef<any>()
    const menuLeftInnerRef = useRef<any>()

    useUpdateEffect(() => {
        getRouteKeyToLabel()
    }, [routeMenu])
    /** @description: 菜单更新后，记录菜单项对应的展示菜单名 */
    const getRouteKeyToLabel = useMemoizedFn(() => {
        const routeKeyToLabel = new Map<string, string>()
        routeMenu.forEach((k) => {
            ;(k.children || []).forEach((subKey) => {
                routeKeyToLabel.set(`${subKey.page}${separator}${subKey.menuName}`, subKey.label)
            })
            if (k.page) routeKeyToLabel.set(`${k.page}${separator}${k.menuName}`, k.label)
        })
        setRouteToLabel(routeKeyToLabel)
    })

    /** 登录用户信息 */
    const {userInfo} = useStore()
    useEffect(() => {
        setRouteMenu(DefaultMenu)
        setSubMenuData(DefaultMenu[0].children || [])
        setMenuId(DefaultMenu[0].label)
        // 当为企业简易版
        if (isEnpriTraceAgent()) {
            let currentMenuList: EnhancedPrivateRouteMenuProps[] = [...SimpleMenus]
            if (userInfo.role !== "admin") {
                // 简易企业版非管理员 无需插件权限
                currentMenuList = currentMenuList.filter((item) => item.label !== "插件")
            }
            setRouteMenu(currentMenuList)
            setSubMenuData(currentMenuList[0].children || [])
            setMenuId(currentMenuList[0].label)
            return
        }
        // 获取软件内菜单模式
        getRemoteValue(RemoteGV.PatternMenu).then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            setRemoteValue(RemoteGV.PatternMenu, menuMode)
            setPatternMenu(menuMode)
            init(menuMode)
        })
    }, [])

    // 社区版本才会获取新的 menu
    // 这个地方的逻辑后面将变成只有企业版才会获取新的menu
    useEffect(() => {
        // 除简易版本外 更新菜单
        if (!isEnpriTraceAgent()) {
            ipcRenderer.on("fetch-new-main-menu", (e) => {
                init(getPatternMenu(), true)
            })
            return () => {
                ipcRenderer.removeAllListeners("fetch-new-main-menu")
            }
        }
    }, [])

    /**
     * @description: 初始化菜单
     */
    const init = useMemoizedFn((menuMode: string, updateSubMenu?: boolean) => {
        setLoading(true)

        //获取模式菜单 如果获取的菜单数据为空，则新增默认菜单数据
        // 默认菜单中，有新增的菜单，前提：系统内置菜单不可删除 企业简易版管理员默认展示所有菜单
        ipcRenderer
            .invoke("QueryAllMenuItem", {Mode: menuMode})
            .then((rsp: {Groups: CacheMenuItemProps[]}) => {
                let currentMenuList: EnhancedPrivateRouteMenuProps[] = [...DefaultMenu]
                const caches: CacheMenuItemProps[] = []
                for (let item of rsp.Groups) {
                    // 过滤代码中无效的一级菜单项
                    if (InvalidFirstMenuItem.indexOf(item.menuName) > -1) continue

                    const menus: CacheMenuItemProps = {...item}
                    if (item.children && item.children.length > 0) {
                        menus.children = item.children.filter(
                            // 过滤代码中无效的二级菜单项
                            (item) => InvalidPageMenuItem.indexOf(item.menuName) === -1
                        )
                    }
                    caches.push(menus)
                }

                const {menus, isUpdate, updatePlugin} = unionMenus(currentMenuList, caches)

                if (isUpdate) {
                    onDownPluginByScriptNames(menus, updatePlugin, menuMode)
                } else {
                    setRouteMenu(menus)
                    if ((updateSubMenu || !menuId) && menus.length > 0) {
                        let firstMenu: EnhancedPrivateRouteMenuProps = menus[0]
                        if (menuId) {
                            setSubMenuData(firstMenu.children || [])
                            setMenuId(firstMenu.label)
                        }
                    }
                    setTimeout(() => setLoading(false), 300)
                }
            })
            .catch((err) => {
                failed("获取菜单失败：" + err)
                setTimeout(() => setLoading(false), 300)
            })
    })
    /**
     * @description: 通过名字下载插件
     */
    const onDownPluginByScriptNames = useMemoizedFn(
        (
            listMenu: EnhancedPrivateRouteMenuProps[],
            noDownPluginScriptNames: string[],
            menuMode: string,
            callBack?: () => void
        ) => {
            ipcRenderer
                .invoke("DownloadOnlinePluginByScriptNames", {
                    ScriptNames: noDownPluginScriptNames,
                    Token: userInfo.token
                })
                .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                    if (rsp.Data.length > 0) {
                        const newMenuData: EnhancedPrivateRouteMenuProps[] = []
                        listMenu.forEach((item) => {
                            const firstMenuList: EnhancedPrivateRouteMenuProps[] = []
                            if (item.children && item.children.length > 0) {
                                item.children.forEach((subItem) => {
                                    if (item.page === YakitRoute.Plugin_OP) {
                                        const currentMenuItem = rsp.Data.find(
                                            (m) => m.ScriptName === (subItem.yakScripName || subItem.label)
                                        ) || {
                                            Id: 0,
                                            ScriptName: ""
                                        }
                                        if (currentMenuItem.Id) {
                                            subItem.yakScriptId = +currentMenuItem.Id || 0
                                            subItem.yakScripName = currentMenuItem.ScriptName
                                        }
                                    }
                                    firstMenuList.push(subItem)
                                })
                            }
                            newMenuData.push({...item, children: firstMenuList})
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
     * @description: 向数据库中保存最新的菜单数据
     * 没写完，前端菜单数据转换成后端数据库的菜单数据这个逻辑没写
     */
    const onAddMenus = useMemoizedFn(
        (data: EnhancedPrivateRouteMenuProps[], menuMode: string, callBack?: () => void) => {
            const menuLists = []
            ipcRenderer
                .invoke("AddMenus", {Data: menuLists})
                .then((rsp) => {
                    setRouteMenu(data)
                    if (!menuId && data.length > 0) {
                        setSubMenuData(data[0].children || [])
                        setMenuId(data[0].label)
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
        }
    )
    /**
     * @description: 删除mode为空的菜单
     */
    const onRemoveEmpty = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteAllMenu", {Mode: ""})
            .then(() => {})
            .catch((e: any) => {
                failed(`删除菜单失败:${e}`)
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
        const afterRoute: EnhancedPrivateRouteMenuProps[] = []
        const beforeRoute: EnhancedPrivateRouteMenuProps[] = []
        routeMenu.forEach((ele, index) => {
            if (ele.children && ele.children.length > 0) {
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
            setSubMenuData(routeMenu[0].children || [])
            setMenuId(routeMenu[0].label || "")
        }
    })
    /**
     * @description: 打开页面
     */
    const onTabClick = useMemoizedFn((key) => {
        const data = StringToRoutePage(key)
        if (data) {
            if (data.route === YakitRoute.Plugin_OP) {
                // 检查插件的有效性(就是能不能用)
                onCheckPlugin(data)
            } else {
                onRouteMenuSelect(data)
            }
        }
    })
    // 验证菜单的插件id和本地数据库最新的插件id是不是一致的
    const onCheckPlugin = useMemoizedFn((info: RouteToPageProps) => {
        if (!info.pluginId || !info.pluginName) return
        ipcRenderer
            .invoke("GetYakScriptByName", {Name: info.pluginName})
            .then((i: YakScript) => {
                const lastId = i.Id
                onRouteMenuSelect(info)
                if (info.pluginId !== (+lastId || 0)) {
                    // 更新菜单
                    onUpdateMenuItem(i)
                }
            })
            .catch((err) => {
                const currentMenuItem: EnhancedPrivateRouteMenuProps | undefined = subMenuData.find((item) => {
                    if (item.yakScriptId === info.pluginId && item.yakScripName === info.pluginName) return true
                    return false
                })
                if (currentMenuItem) {
                    onOpenDownModal(currentMenuItem)
                } else {
                    failed("菜单数据异常,请刷新菜单重试")
                }
            })
    })
    /** 菜单插件ID变动后进行 数据库数据的更新 和 前端菜单数据的更新 */
    const onUpdateMenuItem = useMemoizedFn((i: YakScript) => {
        const params = {
            Group: menuId,
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
        setRemoteValue(RemoteGV.PatternMenu, key)
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
    // 这个方法的逻辑没有处理，不知道以前的json是什么样子的
    const onImportJSON = useMemoizedFn(() => {
        if (!menuDataString) {
            failed("数据不能为空")
            return
        }
        try {
            // 这里得判断导入的数据是否适用菜单组件，不然组件直接崩溃
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

    const onOpenDownModal = useMemoizedFn((menuItem: EnhancedPrivateRouteMenuProps) => {
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
                const noDownPluginScriptNames: string[] = [menuItem.yakScripName || menuItem.menuName]
                onDownPluginByScriptNames(routeMenu, noDownPluginScriptNames, patternMenu, () => {
                    const itemMenu = subMenuData.find((i) => i.yakScripName === menuItem.yakScripName)
                    if (!itemMenu) return
                    // 二级菜单的路由信息
                    const tabKey =
                        itemMenu.page !== YakitRoute.Plugin_OP
                            ? itemMenu.page
                            : `${itemMenu.page}${separator}${itemMenu.label}${separator}${
                                  itemMenu.yakScriptId || 0
                              }${separator}${itemMenu.yakScripName}`
                    onTabClick(tabKey)
                    m.destroy()
                })
            }
        })
    })

    const [importMenuShow, setImportMenuShow] = useState<boolean>(false)
    const importMenuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "import-plugin":
                onImportPlugin()
                setImportMenuShow(false)
                return
            case "import-share":
                onImportShare()
                setImportMenuShow(false)
                return

            default:
                return
        }
    })

    const importMenu = useMemo(
        () => (
            <YakitMenu
                width={142}
                selectedKeys={[]}
                data={[
                    {
                        key: "import-plugin",
                        label: "导入插件"
                    },
                    {
                        key: "import-share",
                        label: "导入分享数据"
                    }
                ]}
                onClick={({key}) => importMenuSelect(key)}
            />
        ),
        []
    )

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
                            .filter((ele) => ele.children && ele.children?.length > 0)
                            .map((menuItem, index) => {
                                return (
                                    <RouteMenuDataItem
                                        key={`menuItem-${menuItem.label}`}
                                        menuItem={menuItem}
                                        isShow={number > 0 ? number <= index : false}
                                        onSelect={(info) => {
                                            if (!info.label) return

                                            if (info.page === YakitRoute.Plugin_OP) {
                                                // 插件有效性的检测
                                                onCheckPlugin({
                                                    route: YakitRoute.Plugin_OP,
                                                    pluginId: +(info.yakScriptId || 0) || 0,
                                                    pluginName: info.yakScripName || ""
                                                })
                                            } else {
                                                if (!info.page) return
                                                onRouteMenuSelect({route: info.page})
                                            }
                                        }}
                                        isExpand={isExpand}
                                        setSubMenuData={(menu) => {
                                            setSubMenuData(menu.children || [])
                                            setMenuId(menu.label || "")
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
                                onMenuSelect={onRouteMenuSelect}
                            />
                        </>
                    )}
                </div>
                <div className={classNames(style["heard-menu-right"])}>
                    {!isEnpriTraceAgent() && (
                        <>
                            <YakitPopover
                                overlayClassName={style["import-resource-menu-popover"]}
                                overlayStyle={{paddingTop: 4}}
                                placement={"bottom"}
                                trigger={"click"}
                                content={importMenu}
                                visible={importMenuShow}
                                onVisibleChange={(visible) => setImportMenuShow(visible)}
                            >
                                <YakitButton
                                    type='text'
                                    className={style["heard-menu-theme"]}
                                    onClick={(e) => e.stopPropagation()}
                                    icon={<SaveIcon />}
                                >
                                    导入协作资源
                                </YakitButton>
                            </YakitPopover>
                            <YakitButton
                                type='secondary2'
                                className={style["heard-menu-grey"]}
                                onClick={() => onRouteMenuSelect({route: YakitRoute.PayloadManager})}
                                icon={<MenuPayloadIcon />}
                            >
                                Payload
                            </YakitButton>
                            <YakitButton
                                type='secondary2'
                                className={classNames(style["heard-menu-grey"], style["heard-menu-yak-run"])}
                                onClick={() => onRouteMenuSelect({route: YakitRoute.YakScript})}
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
                                                    CustomizeMenuData.find(
                                                        (ele) => patternMenu === ele.key
                                                    )?.onRestoreMenu()
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
                        </>
                    )}
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
                            const isDisable =
                                !item.label ||
                                (item.page === YakitRoute.Plugin_OP && (!item.yakScriptId || item.yakScriptId === 0))
                            // 二级菜单的路由信息
                            const tabKey =
                                item.page !== YakitRoute.Plugin_OP
                                    ? item.page
                                    : `${item.page}${separator}${item.yakScriptId || 0}${separator}${item.yakScripName}`
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
                                    key={tabKey}
                                />
                            )
                        })}
                    </Tabs>
                </div>
            )}
            {/* 后面看看菜单导出的数据格式 */}
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
                [style["heard-menu-item-active"]]: (isExpand && activeMenuId === menuItem.label) || visible
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
                        subMenuData={menuItem.children || []}
                        onSelect={onSelect}
                        onOpenDownModal={onOpenDownModal}
                    />
                }
                trigger='hover'
                overlayClassName={classNames(style["popover"], {
                    [style["popover-content"]]: menuItem.children && menuItem.children.length <= 1
                })}
                onVisibleChange={setVisible}
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
                        [style["heard-sub-menu-item-disable"]]: !subMenuItem.page
                    })}
                    key={`subMenuItem-${subMenuItem.label}`}
                    onClick={() => {
                        if (
                            subMenuItem.page === YakitRoute.Plugin_OP &&
                            (!subMenuItem.yakScriptId || subMenuItem.yakScriptId === 0)
                        ) {
                            onOpenDownModal(subMenuItem)
                        } else {
                            onSelect(subMenuItem)
                        }
                    }}
                >
                    <>
                        <span className={style["heard-sub-menu-item-icon"]}>{subMenuItem.icon}</span>
                        <span className={style["heard-sub-menu-item-hoverIcon"]}>{subMenuItem.hoverIcon}</span>
                    </>
                    {(subMenuItem.page && (
                        <div className={style["heard-sub-menu-label"]}>
                            {/* 确认 UserDefined 是干什么的 */}
                            {subMenuItem.label === "UserDefined" ? "社区插件" : subMenuItem.label}
                        </div>
                    )) || (
                        <Tooltip title='插件丢失，点击下载' placement='bottom' zIndex={9999}>
                            <div className={style["heard-sub-menu-label"]}>
                                {/* 确认 UserDefined 是干什么的 */}
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

    const newMenuData: YakitMenuItemProps[] = routeToMenu(menuData)

    const menu = (
        <YakitMenu
            type='secondary'
            isHint={true}
            data={newMenuData}
            width={136}
            onSelect={({key}) => {
                const data = StringToRoutePage(key)
                if (data) onMenuSelect(data)
            }}
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
