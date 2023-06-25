import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    HeardMenuProps,
    RouteMenuDataItemProps,
    SubMenuProps,
    CollapseMenuProp,
    privateUnionMenus,
    EnhancedPrivateRouteMenuProps,
    privateExchangeProps,
    privateConvertDatabase,
    jsonDataConvertMenus
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
import {MenuPayloadIcon, MenuYakRunnerIcon} from "@/pages/customizeMenu/icon/menuIcon"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakCodeEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {LoadingOutlined} from "@ant-design/icons"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {failed, yakitNotify} from "@/utils/notification"
import {YakScript} from "@/pages/invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {useStore} from "@/store"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {RemoteGV} from "@/yakitGV"
import {
    DatabaseFirstMenuProps,
    DatabaseMenuItemProps,
    InvalidFirstMenuItem,
    InvalidPageMenuItem,
    PrivateExpertRouteMenu,
    PrivateScanRouteMenu,
    PrivateSimpleRouteMenu,
    YakitRoute,
    databaseConvertData
} from "@/routes/newRoute"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {
    DownloadOnlinePluginByScriptNamesResponse,
    keyToRouteInfo,
    menusConvertKey,
    routeInfoToKey,
    routeToMenu
} from "../publicMenu/utils"

import style from "./HeardMenu.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const HeardMenu: React.FC<HeardMenuProps> = React.memo((props) => {
    const {onRouteMenuSelect, setRouteToLabel} = props

    // 专家模式菜单数据
    const ExpertMenus = useMemo(() => {
        return privateExchangeProps(PrivateExpertRouteMenu)
    }, [])
    // 扫描模式菜单数据
    const ScanMenus = useMemo(() => {
        return privateExchangeProps(PrivateScanRouteMenu)
    }, [])
    // 简易模式菜单
    const SimpleMenus = useMemo(() => {
        return privateExchangeProps(PrivateSimpleRouteMenu)
    }, [])

    // 组件初始化的标志位
    const isInitRef = useRef<boolean>(true)

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

    const [loading, setLoading] = useState<boolean>(true)

    const menuLeftRef = useRef<any>()
    const menuLeftInnerRef = useRef<any>()

    const routeToName = useRef<Map<string, string>>(new Map<string, string>())
    useUpdateEffect(() => {
        getRouteKeyToLabel()
    }, [routeMenu])
    /** @description: 菜单更新后，记录菜单项对应的展示菜单名 */
    const getRouteKeyToLabel = useMemoizedFn(() => {
        const names = menusConvertKey(routeMenu)
        names.forEach((value, key) => routeToName.current.set(key, value))
        setRouteToLabel(routeToName.current)
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
        } else {
            // 获取软件内菜单模式
            getRemoteValue(RemoteGV.PatternMenu).then((patternMenu) => {
                const menuMode = patternMenu || "expert"
                setRemoteValue(RemoteGV.PatternMenu, menuMode)
                setPatternMenu(menuMode)
                init(menuMode)
            })
        }
    }, [])

    // 社区版本才会获取新的 menu
    // 这个地方的逻辑后面将变成只有企业版才会获取新的menu
    useEffect(() => {
        // 除简易版本外 更新菜单
        if (!isEnpriTraceAgent()) {
            ipcRenderer.on("fetch-new-main-menu", (e) => {
                init(getPatternMenu())
            })
            return () => {
                ipcRenderer.removeAllListeners("fetch-new-main-menu")
            }
        }
    }, [])

    /**
     * @name 初始化菜单
     * @description 获取模式菜单 如果获取的菜单数据为空，则新增默认菜单数据
     */
    const init = useMemoizedFn((menuMode: string) => {
        setLoading(true)

        ipcRenderer
            .invoke("GetAllNavigationItem", {Mode: menuMode})
            .then((res: {Data: DatabaseFirstMenuProps[]}) => {
                const database = databaseConvertData(res.Data || [])
                console.log("database", database)

                // 过滤掉代码中无效菜单项后的用户数据
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

                let filterLocal: EnhancedPrivateRouteMenuProps[] = []
                getRemoteValue(RemoteGV.UserDeleteMenu)
                    .then((val) => {
                        if (!!val) {
                            let filters: string[] = []
                            try {
                                filters = (JSON.parse(val) || {})[menuMode] || []
                            } catch (error) {}
                            for (let item of DefaultMenu) {
                                if (filters.includes(item.menuName)) continue
                                const menu: EnhancedPrivateRouteMenuProps = {...item, children: []}
                                if (item.children && item.children.length > 0) {
                                    for (let subitem of item.children) {
                                        if (!filters.includes(`${item.menuName}-${subitem.menuName}`)) {
                                            menu.children?.push({...subitem})
                                        }
                                    }
                                }
                                filterLocal.push(menu)
                            }
                        } else {
                            filterLocal = [...DefaultMenu]
                        }
                    })
                    .catch(() => {
                        filterLocal = [...DefaultMenu]
                    })
                    .finally(async () => {
                        const allowModify = await getRemoteValue(RemoteGV.IsImportJSONMenu)
                        if (allowModify === "true") filterLocal = []

                        // menus-前端渲染使用的数据;isUpdate-是否需要更新数据库;pluginName-需要下载的插件名
                        const {menus, isUpdate, pluginName} = privateUnionMenus(filterLocal, caches)
                        console.log(1111, menus, isUpdate, pluginName)

                        if (isInitRef.current) {
                            isInitRef.current = false
                            if (pluginName.length > 0) batchDownloadPlugin(menus, pluginName)
                            else {
                                setRouteMenu(menus)
                                setSubMenuData(menus[0].children || [])
                                setMenuId(menus[0].label)
                                setTimeout(() => setLoading(false), 300)
                            }
                            if (isUpdate) updateMenus(menus)
                        } else {
                            if (isUpdate) updateMenus(menus)
                            else setTimeout(() => setLoading(false), 300)
                            setRouteMenu(menus)
                            setSubMenuData(menus[0].children || [])
                            setMenuId(menus[0].label)
                        }
                    })
            })
            .catch((err) => {
                failed("获取菜单失败：" + err)
                setTimeout(() => setLoading(false), 300)
            })
    })
    /**
     * @name 批量下载插件
     * @param menus 常用插件数据
     * @param pluginName 需要下载的插件名合集
     */
    const batchDownloadPlugin = useMemoizedFn((menus: EnhancedPrivateRouteMenuProps[], pluginName: string[]) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginByScriptNames", {
                ScriptNames: pluginName,
                Token: userInfo.token
            })
            .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                if (rsp.Data.length > 0) {
                    // 整理插件名和插件内容的对应关系
                    const pluginToinfo: Record<string, {ScriptName: string; Id: string; HeadImg: string}> = {}
                    for (let item of rsp.Data) pluginToinfo[item.ScriptName] = item

                    // 更新菜单数据里的id
                    menus.forEach((item) => {
                        if (item.children && item.children.length > 0) {
                            item.children.forEach((subItem) => {
                                if (
                                    subItem.page === YakitRoute.Plugin_OP &&
                                    pluginToinfo[subItem.yakScripName || subItem.menuName]
                                ) {
                                    subItem.yakScriptId =
                                        +pluginToinfo[subItem.yakScripName || subItem.menuName].Id || 0
                                }
                            })
                        }
                    })
                    setRouteMenu(menus)
                    setSubMenuData(menus[0].children || [])
                    setMenuId(menus[0].label)
                }
            })
            .catch((err) => {
                yakitNotify("error", "下载菜单插件失败：" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    })
    /** 更新数据库菜单数据(全部) */
    const updateMenus = useMemoizedFn((data: EnhancedPrivateRouteMenuProps[]) => {
        const menus = privateConvertDatabase(data, patternMenu)

        ipcRenderer
            .invoke("DeleteAllNavigation", {Mode: patternMenu})
            .then(() => {
                ipcRenderer
                    .invoke("AddToNavigation", {Data: menus})
                    .then((rsp) => {})
                    .catch((e) => {
                        yakitNotify("error", `保存菜单失败：${e}`)
                    })
                    .finally(() => {
                        setTimeout(() => setLoading(false), 300)
                    })
            })
            .catch((e: any) => {
                yakitNotify("error", `更新菜单失败:${e}`)
                setTimeout(() => setLoading(false), 300)
            })
    })
    /** 展开状态的菜单点击事件 */
    const onTabClick = useMemoizedFn((key) => {
        const data = keyToRouteInfo(key)
        if (data) {
            if (data.route === YakitRoute.Plugin_OP) {
                onCheckPlugin(data)
            } else {
                onRouteMenuSelect(data)
            }
        }
    })
    /** 更多菜单里的菜单点击事件 */
    const onClickMoreMenu = useMemoizedFn((info: RouteToPageProps) => {
        if (!info.route) return

        if (info.route !== YakitRoute.Plugin_OP) onRouteMenuSelect(info)
        else {
            if (!info.pluginName) return
            onCheckPlugin(info)
        }
    })
    /** 收起状态的菜单点击事件 */
    const onClickMenu = useMemoizedFn((info: EnhancedPrivateRouteMenuProps) => {
        if (!info.page) return

        const page: RouteToPageProps = {
            route: info.page,
            pluginId: info.yakScriptId || 0,
            pluginName: info.yakScripName || ""
        }
        if (page.route !== YakitRoute.Plugin_OP) onRouteMenuSelect(page)
        else {
            if (!page.pluginName) return
            onCheckPlugin(page)
        }
    })
    /** 插件菜单-检查插件的可用性 */
    const onCheckPlugin = useMemoizedFn((info: RouteToPageProps) => {
        if (!info.pluginName) return
        if (info.pluginId === 0) {
            onOpenDownModal(info)
            return
        }

        ipcRenderer
            .invoke("GetYakScriptByName", {Name: info.pluginName})
            .then((i: YakScript) => {
                const lastId = +i.Id || 0
                // 插件不存在于本地数据库中
                if (lastId === 0) {
                    onOpenDownModal(info)
                    return
                }
                // 打开页面
                onRouteMenuSelect({
                    ...info,
                    pluginId: info.pluginId !== lastId ? lastId : info.pluginId
                })
                // 插件id被更新，需同步更新前端菜单数据里的id
                if (info.pluginId !== lastId) {
                    updateSingleMenu({pluginName: i.ScriptName, pluginId: lastId})
                }
            })
            .catch((err) => onOpenDownModal(info))
    })
    /** 更新前端菜单数据(单项) */
    const updateSingleMenu = useMemoizedFn((info: {pluginName: string; pluginId: number}) => {
        routeMenu.forEach((item) => {
            ;(item.children || []).forEach((subItem) => {
                if (subItem.yakScripName === info.pluginName) {
                    subItem.yakScriptId = info.pluginId
                }
            })
        })
        setRouteMenu(routeMenu)
    })
    /** 插件菜单未下载提示框 */
    const onOpenDownModal = useMemoizedFn((menuItem: RouteToPageProps) => {
        if (!menuItem.pluginName) return
        const showName = routeToName.current.get(routeInfoToKey(menuItem)) || menuItem.pluginName
        const m = YakitModalConfirm({
            width: 420,
            closable: false,
            title: "插件加载失败",
            showConfirmLoading: true,
            content: (
                <div className={style["modal-content"]}>
                    {showName}菜单丢失，需点击重新下载，如仍无法下载，请前往插件商店查找
                    <span className={style["menuItem-yakScripName"]}>{menuItem.pluginName}</span>
                    插件
                </div>
            ),
            onOkText: "重新下载",
            onOk: () => {
                singleDownloadPlugin(menuItem, () => {
                    // 下载插件成功，自动销毁弹框
                    m.destroy()
                })
            }
        })
    })
    /** 下载单个插件菜单 */
    const singleDownloadPlugin = useMemoizedFn((menuItem: RouteToPageProps, callback?: () => any) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginByScriptNames", {
                ScriptNames: menuItem.pluginName,
                Token: userInfo.token
            })
            .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                if (rsp.Data.length > 0) {
                    const info = rsp.Data[0]
                    // 打开页面
                    onRouteMenuSelect({
                        route: YakitRoute.Plugin_OP,
                        pluginId: +info.Id || 0,
                        pluginName: info.ScriptName || menuItem.pluginName
                    })
                    updateSingleMenu({pluginName: info.ScriptName, pluginId: +info.Id || 0})
                    if (callback) setTimeout(() => callback(), 200)
                }
            })
            .catch((err) => yakitNotify("error", "下载菜单插件失败：" + err))
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
    /** 菜单模式切换 */
    const onCustomizeMenuClick = useMemoizedFn((key: string) => {
        setRemoteValue(RemoteGV.PatternMenu, key)
            .then(() => {
                setPatternMenu(key as "expert" | "new")
                isInitRef.current = true
                setTimeout(() => {
                    init(key)
                }, 100)
            })
            .catch((e: any) => {
                failed(`切换菜单模式失败:${e}`)
            })
    })
    /** @description: 编辑菜单 */
    const onGoCustomize = useMemoizedFn(() => {
        ipcRenderer.invoke("open-customize-menu")
    })
    /**
     * @description: 复原菜单
     */
    const onRestoreMenu = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteAllNavigation", {Mode: patternMenu})
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

    // 导入菜单JSON 相关变量和逻辑
    const [importLoading, setImportLoading] = useState<boolean>(false)
    const [visibleImport, setVisibleImport] = useState<boolean>(false)
    const [menuDataString, setMenuDataString] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
    /** 导入菜单json */
    const onImportJSON = useMemoizedFn(() => {
        if (!menuDataString) {
            failed("数据不能为空")
            return
        }
        try {
            const {menus, isError} = jsonDataConvertMenus(JSON.parse(menuDataString))
            setImportLoading(true)
            ipcRenderer
                .invoke("DeleteAllNavigation", {Mode: patternMenu})
                .then(() => {
                    const menuLists = privateConvertDatabase(menus, patternMenu)

                    ipcRenderer
                        .invoke("AddToNavigation", {Data: menuLists})
                        .then(() => {
                            // 缓存用户菜单数据的来源，防止菜单初始化时的对比操作改变菜单
                            setRemoteValue(RemoteGV.IsImportJSONMenu, "true")
                            setVisibleImport(false)
                            if (isError) yakitNotify("error", "转换过程中有部分数据错误，已自动丢弃")
                            setRouteMenu(menus)
                            setSubMenuData(menus[0].children || [])
                            setMenuId(menus[0].label)
                        })
                        .catch((err) => {
                            yakitNotify("error", "保存菜单失败：" + err)
                        })
                        .finally(() => {
                            setTimeout(() => {
                                setImportLoading(false)
                            }, 300)
                        })
                })
                .catch((e: any) => {
                    yakitNotify("error", `删除菜单失败:${e}`)
                    setTimeout(() => {
                        setImportLoading(false)
                    }, 300)
                })
        } catch (error) {
            yakitNotify("error", `处理导入数据失败: ${error}`)
        }
    })

    // 导入协作资源-菜单相关逻辑
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
                                        onSelect={onClickMenu}
                                        isExpand={isExpand}
                                        setSubMenuData={(menu) => {
                                            setSubMenuData(menu.children || [])
                                            setMenuId(menu.label || "")
                                        }}
                                        activeMenuId={menuId}
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
                                onMenuSelect={onClickMoreMenu}
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
                                    {item.label}
                                </div>
                            )
                            const isDisable = !item.label || (item.page === YakitRoute.Plugin_OP && !item.yakScriptId)
                            // 二级菜单的路由信息
                            const tabKey = routeInfoToKey(item)
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
                                                        // 设定loading为true时，点击菜单无效
                                                        // 所以需要自定义处理事件，阻止tab组件的冒泡
                                                        e.stopPropagation()
                                                        if (loading) return
                                                        onClickMenu(item)
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

/** 展开状态下的一级菜单项 和 收起状态下的菜单鼠标悬浮二级菜单的一级菜单项 */
const RouteMenuDataItem: React.FC<RouteMenuDataItemProps> = React.memo((props) => {
    const {menuItem, isShow, isExpand, onSelect, setSubMenuData, activeMenuId} = props

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
                content={<SubMenu subMenuData={menuItem.children || []} onSelect={onSelect} />}
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
/** 收起状态下鼠标悬浮展示的二级菜单项(带icon和hovericon) */
const SubMenu: React.FC<SubMenuProps> = (props) => {
    const {subMenuData, onSelect} = props

    return (
        <div className={style["heard-sub-menu"]}>
            {subMenuData.map((subMenuItem) => (
                <div
                    className={classNames(style["heard-sub-menu-item"], {
                        [style["heard-sub-menu-item-disable"]]: !subMenuItem.page
                    })}
                    key={`subMenuItem-${subMenuItem.label}`}
                    onClick={() => onSelect(subMenuItem)}
                >
                    <>
                        <span className={style["heard-sub-menu-item-icon"]}>{subMenuItem.icon}</span>
                        <span className={style["heard-sub-menu-item-hoverIcon"]}>{subMenuItem.hoverIcon}</span>
                    </>
                    {(subMenuItem.page && <div className={style["heard-sub-menu-label"]}>{subMenuItem.label}</div>) || (
                        <Tooltip title='插件丢失，点击下载' placement='bottom' zIndex={9999}>
                            <div className={style["heard-sub-menu-label"]}>{subMenuItem.label}</div>
                        </Tooltip>
                    )}
                </div>
            ))}
        </div>
    )
}
/** 宽度影响展示时的更多菜单 */
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
                const data = keyToRouteInfo(key)
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
