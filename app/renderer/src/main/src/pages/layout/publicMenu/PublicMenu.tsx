import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    DatabaseFirstMenuProps,
    DatabaseMenuItemProps,
    InvalidFirstMenuItem,
    InvalidPageMenuItem,
    PublicCommonPlugins,
    PublicRouteMenuProps,
    ResidentPluginName,
    databaseConvertData,
    getPublicRouteMenu,
    getSecurityExpertLeftMenu
} from "@/routes/newRoute"
import {ExtraMenu, OrdinaryMenu} from "./ExtraMenu"
import {SortAscendingIcon, SortDescendingIcon} from "@/assets/newIcon"
import {MenuCodec} from "./MenuCodec"
import {MenuDNSLog} from "./MenuDNSLog"
import {MenuMode} from "./MenuMode"
import {useMemoizedFn} from "ahooks"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {MenuPlugin} from "./MenuPlugin"
import {yakitNotify} from "@/utils/notification"
import {useStore} from "@/store"
import {
    EnhancedPublicRouteMenuProps,
    keyToRouteInfo,
    publicConvertDatabase,
    publicExchangeProps,
    routeToMenu,
    publicUnionMenus,
    menusConvertKey,
    DownloadOnlinePluginByScriptNamesResponse,
    routeConvertKey,
    routeInfoToKey
} from "./utils"
import {CodeGV, RemoteGV} from "@/yakitGV"
import {YakScript} from "@/pages/invoker/schema"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"

import classNames from "classnames"
import styles from "./PublicMenu.module.scss"
import {YakitRoute} from "@/enums/yakitRoute"
import {usePluginToId} from "@/store/publicMenu"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import { JSONParseLog } from "@/utils/tool"
import {isCommunityYakit, isMemfit} from "@/utils/envfile"
import {useSoftMode, YakitModeEnum} from "@/store/softMode"
import {toMITMHacker} from "@/pages/hacker/httpHacker"

const {ipcRenderer} = window.require("electron")

/**
 * @name Route信息(用于打开页面)
 * @property route-页面的路由
 * @property pluginId-插件id(本地)
 * @property pluginName-插件名称
 */
export interface RouteToPageProps {
    route: YakitRoute
    pluginId?: number
    pluginName?: string
}
interface PublicMenuProps {
    defaultExpand: boolean
    onMenuSelect: (route: RouteToPageProps) => void
    setRouteToLabel: (data: Map<string, string>) => void
}

const PublicMenu: React.FC<PublicMenuProps> = React.memo((props) => {
    const {onMenuSelect, setRouteToLabel, defaultExpand} = props
    const {t, i18n} = useI18nNamespaces(["layout", "yakitRoute", "yakitUi"])
    // 登录用户状态信息
    const {userInfo} = useStore()
    // 菜单模式
    const {softMode} = useSoftMode()
    // 本地菜单数据
    const defaultMenu = useMemo(() => publicExchangeProps(getPublicRouteMenu(softMode)), [softMode])
    // 本地常用插件数据
    const defaultPluginMenu = useMemo(() => publicExchangeProps(PublicCommonPlugins), [])

    // 组件初始化的标志位
    const isInitRef = useRef<boolean>(true)

    // 安全工具内4个插件的对应插件id
    const [pluginToId, setPluginToId] = useState<Record<ResidentPluginName, number>>({
        [ResidentPluginName.SubDomainCollection]: 0,
        [ResidentPluginName.BasicCrawler]: 0,
        [ResidentPluginName.DirectoryScanning]: 0
    })
    const {setNewPluginToId} = usePluginToId()

    const [loading, setLoading] = useState<boolean>(false)
    // 常用插件菜单
    const [pluginMenu, setPluginMenu] = useState<EnhancedPublicRouteMenuProps[]>([...defaultPluginMenu])

    const [activeMenu, setActiveMenu] = useState<number>(0)
    useEffect(() => {
        setActiveMenu(0)
    }, [softMode])
    
    const [activeTool, setActiveTool] = useState<"codec" | "dnslog">("codec")
    const [isExpand, setIsExpand] = useState<boolean>(defaultExpand)
    useEffect(() => {
        setIsExpand(defaultExpand)
    }, [defaultExpand])

    const routeToName = useRef<Map<string, string>>(new Map<string, string>())
    useEffect(() => {
        getRouteToName()
    }, [defaultMenu, pluginMenu])
    /** 记录菜单项对应的展示名(供外界使用) */
    const getRouteToName = useMemoizedFn(() => {
        const names = menusConvertKey(defaultMenu)
        names.forEach((value, key) => routeToName.current.set(key, value))
        const pluginNames = menusConvertKey(pluginMenu)
        pluginNames.forEach((value, key) => routeToName.current.set(key, value))
        setRouteToLabel(routeToName.current)
    })

    const onSetIsExpand = useMemoizedFn((checked: boolean) => {
        const value = JSON.stringify(checked)
        setIsExpand(checked)
        setRemoteValue(CodeGV.MenuExpand, value)
    })

    // 获取 基础工具菜单下的4个插件 是否存在于本地库内
    const fetchPluginToolInfo = useMemoizedFn(() => {
        /** 基础工具菜单下的4个插件 */
        const pluginTool = [
            ResidentPluginName.SubDomainCollection,
            ResidentPluginName.BasicCrawler,
            ResidentPluginName.DirectoryScanning
        ]
        ipcRenderer
            .invoke("QueryYakScriptByNames", {YakScriptName: pluginTool})
            .then((res: {Data: YakScript[]}) => {
                const {Data} = res
                const info: Record<string, number> = {}
                for (let item of Data) info[item.ScriptName] = +(item.Id || 0) || 0
                const pluginToIds: Record<string, number> = {}
                for (let name of pluginTool) pluginToIds[name] = info[name] || 0
                setPluginToId(pluginToIds)
                setNewPluginToId(pluginToIds)
            })
            .catch((err) => {})
    })

    useEffect(() => {
        fetchPluginToolInfo()
        fetchCommonPlugins()
        ipcRenderer.on("refresh-public-menu-callback", (e) => {
            fetchPluginToolInfo()
            fetchCommonPlugins()
        })
        return () => {
            ipcRenderer.removeAllListeners("refresh-public-menu-callback")
        }
    }, [])
    /** 获取数据库保存的常用插件列表数据 */
    const fetchCommonPlugins = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetAllNavigationItem", {Mode: CodeGV.PublicMenuModeValue})
            .then((res: {Data: DatabaseFirstMenuProps[]}) => {
                // 没有考虑过滤系统删除的内定页面，因为public版本的可自定义菜单均为插件
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
                let filterLocal: PublicRouteMenuProps[] = []
                getRemoteValue(RemoteGV.UserDeleteMenu)
                    .then((val) => {
                        if (val !== "{}") {
                            let filters: string[] = []
                            try {
                                filters = (JSONParseLog(val, {page: "PublicMenu", fun: "UserDeleteMenu"}) || {})["public"] || []
                            } catch (error) {}
                            for (let item of PublicCommonPlugins) {
                                if (filters.includes(item.label)) continue
                                const menu: PublicRouteMenuProps = {...item, children: []}
                                if (item.children && item.children.length > 0) {
                                    for (let subitem of item.children) {
                                        const menuname =
                                            subitem.page === YakitRoute.Plugin_OP
                                                ? subitem.yakScripName || subitem.label
                                                : subitem.label
                                        if (!filters.includes(`${item.label}-${menuname}`)) {
                                            menu.children?.push({...subitem})
                                        }
                                    }
                                }
                                filterLocal.push(menu)
                            }
                        } else {
                            filterLocal = [...PublicCommonPlugins]
                        }
                    })
                    .catch(() => {
                        filterLocal = [...PublicCommonPlugins]
                    })
                    .finally(() => {
                        // menus-前端渲染使用的数据;isUpdate-是否需要更新数据库;pluginName-需要下载的插件名
                        const {menus, isUpdate, pluginName} = publicUnionMenus(filterLocal, caches)
                        if (isInitRef.current) {
                            isInitRef.current = false
                            if (pluginName.length > 0) batchDownloadPlugin(menus, pluginName)
                            else {
                                setPluginMenu(menus)
                                setTimeout(() => setLoading(false), 300)
                            }
                            if (isUpdate) updateMenus(menus)
                        } else {
                            if (isUpdate) updateMenus(menus)
                            else setTimeout(() => setLoading(false), 300)
                            setPluginMenu(menus)
                        }
                    })
            })
            .catch((e) => {
                yakitNotify("error", `${t("Layout.PublicMenu.getUserMenuFailed")}${e}`)
                setTimeout(() => setLoading(false), 300)
            })
    })
    /**
     * @name 批量下载插件
     * @param menus 常用插件数据
     * @param pluginName 需要下载的插件名合集
     */
    const batchDownloadPlugin = useMemoizedFn((menus: EnhancedPublicRouteMenuProps[], pluginName: string[]) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginByPluginName", {
                ScriptNames: pluginName,
                Token: userInfo.token
            })
            .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                if (rsp.Data.length > 0) {
                    // 整理插件名和插件内容的对应关系
                    const pluginToinfo: Record<string, {ScriptName: string; Id: string; HeadImg: string}> = {}
                    for (let item of rsp.Data) pluginToinfo[item.ScriptName] = item

                    // 更新菜单数据里的id和头像
                    menus.forEach((item) => {
                        if (item.children && item.children.length > 0) {
                            item.children.forEach((subItem) => {
                                if (
                                    subItem.page === YakitRoute.Plugin_OP &&
                                    pluginToinfo[subItem.yakScripName || subItem.menuName]
                                ) {
                                    subItem.yakScriptId =
                                        +pluginToinfo[subItem.yakScripName || subItem.menuName].Id || 0
                                    subItem.headImg =
                                        pluginToinfo[subItem.yakScripName || subItem.menuName].HeadImg || ""
                                }
                            })
                        }
                    })
                    setPluginMenu(menus)
                }
            })
            .catch((err) => {
                yakitNotify("error", t("Layout.HeardMenu.downloadMenuPluginFailed") + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    })

    /** 更新数据库菜单数据(全部) */
    const updateMenus = useMemoizedFn((data: EnhancedPublicRouteMenuProps[]) => {
        const menus = publicConvertDatabase(data)

        ipcRenderer
            .invoke("DeleteAllNavigation", {Mode: CodeGV.PublicMenuModeValue})
            .then(() => {
                ipcRenderer
                    .invoke("AddToNavigation", {Data: menus})
                    .then((rsp) => {})
                    .catch((e) => {
                        yakitNotify("error", `${t("Layout.HeardMenu.saveMenuFailed")}${e}`)
                    })
                    .finally(() => {
                        setTimeout(() => setLoading(false), 300)
                    })
            })
            .catch((e: any) => {
                yakitNotify("error", `${t("Layout.HeardMenu.updateMenuFailed")}${e}`)
                setTimeout(() => setLoading(false), 300)
            })
    })

    /** 插件菜单-检查插件的可用性 */
    const onCheckPlugin = useMemoizedFn((info: RouteToPageProps, source: string) => {
        if (!info.pluginName) return
        if (info.pluginId === 0) {
            onOpenDownModal(info, source)
            return
        }

        grpcFetchLocalPluginDetail({Name: info.pluginName}, true)
            .then((i: YakScript) => {
                const lastId = +i.Id || 0
                // 插件不存在于本地数据库中
                if (lastId === 0) {
                    updateSingleMenu({pluginName: i.ScriptName, pluginId: 0, headImg: ""}, source)
                    onOpenDownModal(info, source)
                    return
                }
                // 打开页面
                onMenuSelect({
                    ...info,
                    pluginId: info.pluginId !== lastId ? lastId : info.pluginId
                })
                // 插件id被更新，需同步更新前端菜单数据里的id和headimg
                if (info.pluginId !== lastId) {
                    updateSingleMenu({pluginName: i.ScriptName, pluginId: lastId, headImg: i.HeadImg || ""}, source)
                }
            })
            .catch((err) => onOpenDownModal(info, source))
    })
    /** 更新前端菜单数据(单项) */
    const updateSingleMenu = useMemoizedFn(
        (info: {pluginName: string; pluginId: number; headImg: string}, source: string) => {
            if (source === "route") {
                const data = {...pluginToId}
                data[info.pluginName as any] = info.pluginId
                setPluginToId(data)
                setNewPluginToId(data)
            } else {
                const menus = [...pluginMenu]
                menus.forEach((item) => {
                    ;(item.children || []).forEach((subItem) => {
                        if (subItem.yakScripName === info.pluginName) {
                            subItem.yakScriptId = info.pluginId
                            subItem.headImg = info.headImg
                        }
                    })
                })
                setPluginMenu(menus)
            }
        }
    )
    /** 下载单个插件菜单 */
    const singleDownloadPlugin = useMemoizedFn((menuItem: RouteToPageProps, source: string, callback?: () => any) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginByPluginName", {
                ScriptNames: [menuItem.pluginName],
                Token: userInfo.token
            })
            .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                if (rsp.Data.length > 0) {
                    const info = rsp.Data[0]
                    // 打开页面
                    onMenuSelect({
                        route: YakitRoute.Plugin_OP,
                        pluginName: info.ScriptName || menuItem.pluginName,
                        pluginId: +info.Id || 0
                    })
                    updateSingleMenu(
                        {pluginName: info.ScriptName, pluginId: +info.Id || 0, headImg: info.HeadImg},
                        source
                    )
                } else {
                    yakitNotify("error", t("Layout.PublicMenu.pluginNotAvailableOnline"))
                }
                if (callback) setTimeout(() => callback(), 200)
            })
            .catch((err) => yakitNotify("error", t("Layout.HeardMenu.downloadMenuPluginFailed") + err))
    })
    /** 插件菜单未下载提示框 */
    const onOpenDownModal = useMemoizedFn((menuItem: RouteToPageProps, source: string) => {
        if (!menuItem.pluginName) return
        const showName =
            routeToName.current.get(routeConvertKey(menuItem.route, menuItem.pluginName || "")) || menuItem.pluginName
        const m = YakitModalConfirm({
            width: 420,
            closable: false,
            title: t("Layout.HeardMenu.pluginLoadFailed"),
            showConfirmLoading: true,
            type: "white",
            content: (
                <div className={styles["modal-content"]}>
                    {showName}
                    {t("Layout.HeardMenu.menuMissing")}
                    <span className={styles["menuItem-yakScripName"]}>{menuItem.pluginName}</span>
                    {t("Layout.HeardMenu.plugin")}
                </div>
            ),
            onOkText: t("YakitButton.redownload"),
            onOk: () => {
                singleDownloadPlugin(menuItem, source, () => {
                    // 下载插件成功，自动销毁弹框
                    m.destroy()
                })
            }
        })
    })

    // 收起菜单的点击回调
    const onNoExpandClickMenu = useMemoizedFn((key: string, keyPath: string[]) => {
        setNoExpandMenu(-1)
        const data = keyToRouteInfo(key)

        if (data) {
            if (data.route === YakitRoute.Plugin_OP) {
                if (!!pluginToId[data?.pluginName || ""]) data.pluginId = pluginToId[data?.pluginName || ""]
                onCheckPlugin(data, "plugin")
            } else {
                onMenuSelect({route: data.route})
            }
        }
    })
    // 展开菜单的点击回调
    const onClickMenu = useMemoizedFn((route: RouteToPageProps, source: string) => {
        if (route.route !== YakitRoute.Plugin_OP) onMenuSelect(route)
        else {
            if (!route.pluginName) return
            onCheckPlugin(route, source)
        }
    })

    const [noExpandMenu, setNoExpandMenu] = useState<number>(-1)
    // 收起状态下的菜单组件
    const noExpand = useMemo(() => {
        const plugins: EnhancedPublicRouteMenuProps[] = []
        for (let item of pluginMenu) {
            if (item.children && item.children.length > 0) {
                plugins.push({...item})
            }
        }

        return (
            <>
                {defaultMenu.map((item, index) => {
                    const data =
                        item.label === "插件"
                            ? routeToMenu(
                                  (item.children || []).concat(
                                      plugins.length === 0
                                          ? []
                                          : [
                                                {
                                                    page: undefined,
                                                    label: t("Layout.MenuPlugin.commonPlugins"),
                                                    menuName: "常用插件",
                                                    children: plugins
                                                }
                                            ]
                                  ),
                                  t
                              )
                            : routeToMenu(item.children || [], t)
                    const isOnlyFirst = !item.children && item.page
                    return (
                        <YakitPopover
                            key={`${item.label}-${index}`}
                            trigger={"click"}
                            overlayStyle={{paddingTop: 2}}
                            overlayClassName={styles["child-menu-popover"]}
                            placement={index === 0 ? "bottomLeft" : "bottom"}
                            visible={noExpandMenu === index}
                            content={
                                <YakitMenu
                                    // triggerSubMenuAction="click"
                                    selectable={false}
                                    selectedKeys={[]}
                                    data={data}
                                    onClick={({key, keyPath}) => onNoExpandClickMenu(key, keyPath)}
                                />
                            }
                            onVisibleChange={(visible) => !isOnlyFirst && setNoExpandMenu(visible ? index : -1)}
                        >
                            <div
                                key={`${item.label}-${index}`}
                                className={classNames(styles["menu-opt"], {
                                    [styles["active-menu-opt"]]: noExpandMenu === index
                                })}
                                onClick={() => {
                                    if (!item.children && item.page) {
                                        onNoExpandClickMenu(routeInfoToKey(item), [item.page])
                                    }
                                }}
                            >
                                {item.labelUi ? t(item.labelUi) : item.label}
                            </div>
                        </YakitPopover>
                    )
                })}
            </>
        )
    }, [defaultMenu, pluginMenu, noExpandMenu, i18n.language])

    // 右侧额外菜单点击
    const onClickExtraMenu = useMemoizedFn((route: RouteToPageProps) => {
        if (route.route === YakitRoute.Plugin_OP) {
            const obj = {...route}
            obj.pluginId = pluginToId[obj?.pluginName || ""]
            onCheckPlugin(obj, "plugin")
        } else {
            onMenuSelect({route: route.route})
        }
    })

    // yakit 安全专家模式 左侧菜单点击
    const onClickSecurityExpertMenu = useMemoizedFn((route: RouteToPageProps) => {
        if (route.route === YakitRoute.MITMHacker) {
            toMITMHacker({
                immediatelyLaunchedInfo: {}
            })
        } else {
            onMenuSelect({route: route.route})
        }
    })

    const isSecurityExpert = useMemo(() => {
        return isCommunityYakit() && softMode === YakitModeEnum.SecurityExpert
    }, [softMode])

    return (
        <div
            className={classNames(styles["public-menu-wrapper"], {
                [styles["public-menu-no-expand-wrapper"]]: !isExpand
            })}
        >
            <div className={styles["first-menu-wrapper"]}>
                {isSecurityExpert ? (
                    <div className={styles["menu-wrapper-left"]}>
                        <OrdinaryMenu menuList={getSecurityExpertLeftMenu()} onMenuSelect={onClickSecurityExpertMenu} />
                    </div>
                ) : (
                    <>
                        {isExpand && (
                            <div className={styles["first-menu-body"]}>
                                {defaultMenu.map((item, index) => {
                                    return (
                                        <div
                                            key={`${item.menuName}-${index}`}
                                            className={classNames(styles["menu-opt"], {
                                                [styles["active-menu-opt"]]: activeMenu === index
                                            })}
                                            onClick={() => {
                                                if (activeMenu !== index) setActiveMenu(index)
                                            }}
                                        >
                                            {item.labelUi ? t(item.labelUi) : item.label}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {!isExpand && <div className={styles["first-menu-body"]}>{noExpand}</div>}
                    </>
                )}
                <div className={styles["first-menu-extra-wrapper"]}>
                    <ExtraMenu onMenuSelect={onClickExtraMenu} />
                    {!isMemfit() && !isExpand && (
                        <div className={styles["no-expand-wrapper"]} onClick={(e) => onSetIsExpand(true)}>
                            <SortDescendingIcon />
                        </div>
                    )}
                </div>
            </div>

            <div
                className={classNames(styles["second-menu-wrapper"], {
                    [styles["second-menu-hidden-wrapper"]]: !isExpand
                })}
            >
                <div
                    className={styles["second-menu-body"]}
                    style={{
                        flex: 1,
                        overflow: "hidden",
                        gap: isSecurityExpert ? 0 : 8
                    }}
                >
                    {!!defaultMenu[activeMenu] && (
                        <MenuMode
                            mode={defaultMenu[activeMenu]?.label}
                            pluginToId={pluginToId}
                            onMenuSelect={(route) => onClickMenu(route, "route")}
                        />
                    )}

                    {!isMemfit() && (
                        <>
                            <>
                                {!isSecurityExpert && defaultMenu[activeMenu]?.label !== "插件" ? (
                                    <div className={styles["divider-style"]}></div>
                                ) : (
                                    <div></div>
                                )}
                            </>
                            <div className={styles["tool-wrapper"]}>
                                {defaultMenu[activeMenu]?.label === "插件" && (
                                    <MenuPlugin
                                        loading={loading}
                                        pluginList={pluginMenu}
                                        onMenuSelect={(route) => onClickMenu(route, "plugin")}
                                        onRestore={() => {
                                            isInitRef.current = true
                                        }}
                                    />
                                )}
                                <div
                                    className={
                                        defaultMenu[activeMenu]?.label !== "插件"
                                            ? styles["tool-body"]
                                            : styles["hide-tool-body"]
                                    }
                                >
                                    <div className={styles["tool-container"]}>
                                        <div
                                            className={
                                                activeTool === "codec"
                                                    ? styles["tool-nohidden-container"]
                                                    : styles["tool-hidden-container"]
                                            }
                                        >
                                            <MenuCodec />
                                        </div>
                                        <div
                                            className={
                                                activeTool === "dnslog"
                                                    ? styles["tool-nohidden-container"]
                                                    : styles["tool-hidden-container"]
                                            }
                                        >
                                            <MenuDNSLog />
                                        </div>
                                    </div>
                                    <div className={styles["switch-op-wrapper"]}>
                                        <div className={styles["border-wrapper"]}></div>
                                        <div
                                            className={classNames(styles["tab-bar"], {
                                                [styles["active-tab-bar"]]: activeTool === "codec"
                                            })}
                                            onClick={() => {
                                                if (activeTool === "codec") return
                                                setActiveTool("codec")
                                            }}
                                        >
                                            {t("YakitRoute.Codec")}
                                        </div>
                                        <div
                                            className={classNames(styles["tab-bar"], {
                                                [styles["active-tab-bar"]]: activeTool === "dnslog"
                                            })}
                                            onClick={() => {
                                                if (activeTool === "dnslog") return
                                                setActiveTool("dnslog")
                                            }}
                                        >
                                            {t("YakitRoute.DNSLog")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                {!isMemfit() && (
                    <div className={styles["expand-wrapper"]}>
                        <div className={styles["expand-body"]} onClick={(e) => onSetIsExpand(false)}>
                            <SortAscendingIcon />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
})

export default PublicMenu
