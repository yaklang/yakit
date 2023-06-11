import React, {useState} from "react"
import {PublicRouteMenu, PublicRouteMenuProps, YakitRoute} from "@/routes/newRoute"
import {ExtraMenu} from "./ExtraMenu"
import {SortAscendingIcon, SortDescendingIcon} from "@/assets/newIcon"
import {MenuCodec} from "./MenuCodec"
import {MenuDNSLog} from "./MenuDNSLog"
import {MenuMode} from "./MenuMode"
import {useMemoizedFn} from "ahooks"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"

import classNames from "classnames"
import styles from "./PublicMenu.module.scss"

const {ipcRenderer} = window.require("electron")

export const separator = "|"
/** 将菜单数据转换成 Menu组件数据 */
export const routeToMenu = (routes: PublicRouteMenuProps[]) => {
    const menus: YakitMenuItemProps[] = []
    for (let item of routes) {
        const menuItem: YakitMenuItemProps = {
            label: item.label,
            key:
                item.page !== YakitRoute.Plugin_OP
                    ? item.page || item.label
                    : `${item.page}${separator}${item.yakScriptId || 0}${separator}${item.yakScripName}`
        }
        if (item.children && item.children.length > 0) menuItem.children = routeToMenu(item.children)
        menus.push(menuItem)
    }
    return menus
}
/** 将信息转换成 页面配置信息 */
export const StringToRoutePage = (str: string) => {
    try {
        // 判断条件由当前组件方法(routeToMenu)里的分隔符变量(separator)决定
        if (str.indexOf(separator) > -1) {
            const keys = str.split(separator)
            const route = keys[0] as YakitRoute

            const info: RouteToPageProps = {
                route: route,
                pluginId: +keys[1] || 0,
                pluginName: keys[2]
            }
            return info
        } else {
            const route = str as YakitRoute
            const info: RouteToPageProps = {route: route}
            return info
        }
    } catch (error) {
        return null
    }
}

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
    onMenuSelect: (route: RouteToPageProps) => void
}

const PublicMenu: React.FC<PublicMenuProps> = React.memo((props) => {
    const {onMenuSelect} = props
    const DefaultMenuData = PublicRouteMenu

    const [activeMenu, setActiveMenu] = useState<number>(0)
    const [noExpandMenu, setNoExpandMenu] = useState<number>(-1)
    const [activeTool, setActiveTool] = useState<"codec" | "dnslog">("codec")
    const [isExpand, setIsExpand] = useState<boolean>(true)

    // 收起菜单的点击回调
    const onNoExpandClickMenu = useMemoizedFn((key: string) => {
        const data = StringToRoutePage(key)
        if (data) onMenuSelect(data)
    })
    // 展开菜单的点击回调
    const onClickMenu = useMemoizedFn((route: RouteToPageProps) => {
        if (route.route === YakitRoute.Plugin_OP && !route.pluginName) return
        onMenuSelect(route)
    })

    return (
        <div
            className={classNames(styles["public-menu-wrapper"], {
                [styles["public-menu-no-expand-wrapper"]]: !isExpand
            })}
        >
            <div className={styles["first-menu-wrapper"]}>
                {isExpand && (
                    <div className={styles["first-menu-body"]}>
                        {DefaultMenuData.map((item, index) => {
                            return (
                                <div
                                    key={`${item.label}-${index}`}
                                    className={classNames(styles["menu-opt"], {
                                        [styles["active-menu-opt"]]: activeMenu === index
                                    })}
                                    onClick={() => {
                                        if (activeMenu !== index) setActiveMenu(index)
                                    }}
                                >
                                    {item.label}
                                </div>
                            )
                        })}
                    </div>
                )}
                {!isExpand && (
                    <div className={styles["first-menu-body"]}>
                        {DefaultMenuData.map((item, index) => {
                            return (
                                <YakitPopover
                                    key={`${item.label}-${index}`}
                                    overlayStyle={{paddingTop: 2}}
                                    overlayClassName={styles["child-menu-popover"]}
                                    placement={index === 0 ? "bottomLeft" : "bottom"}
                                    content={
                                        <YakitMenu
                                            width={150}
                                            selectedKeys={[]}
                                            data={routeToMenu(item.children || [])}
                                            onClick={({key}) => onNoExpandClickMenu(key)}
                                        />
                                    }
                                    onVisibleChange={(visible) => setNoExpandMenu(visible ? index : -1)}
                                >
                                    <div
                                        key={`${item.label}-${index}`}
                                        className={classNames(styles["menu-opt"], {
                                            [styles["active-menu-opt"]]: noExpandMenu === index
                                        })}
                                    >
                                        {item.label}
                                    </div>
                                </YakitPopover>
                            )
                        })}
                    </div>
                )}
                <div className={styles["first-menu-extra-wrapper"]}>
                    <ExtraMenu onMenuSelect={onMenuSelect} />
                    {!isExpand && (
                        <div className={styles["no-expand-wrapper"]} onClick={(e) => setIsExpand(true)}>
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
                <div className={styles["second-menu-body"]} style={{flex: 1, overflow: "hidden"}}>
                    <MenuMode mode={DefaultMenuData[activeMenu].label} onMenuSelect={onClickMenu} />
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["tool-wrapper"]}>
                        <div className={styles["tool-body"]}>
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
                                    Codec
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
                                    DNSLog
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles["expand-wrapper"]}>
                    <div className={styles["expand-body"]} onClick={(e) => setIsExpand(false)}>
                        <SortAscendingIcon />
                    </div>
                </div>
            </div>
        </div>
    )
})

export default PublicMenu
