import React, {useMemo, useState} from "react"
import {ChevronDownIcon, ChevronUpIcon, SMViewGridAddIcon} from "@/assets/newIcon"
import {PublicDefaultPluginIcon} from "@/routes/publicIcon"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {useMemoizedFn} from "ahooks"
import {EnhancedPublicRouteMenuProps} from "./utils"
import {Avatar, Tooltip} from "antd"
import {YakitRoute} from "@/routes/newRouteConstants"
import {RouteToPageProps} from "./PublicMenu"
import {LoadingOutlined} from "@ant-design/icons"
import {CodeGV, RemoteGV} from "@/yakitGV"
import {yakitNotify} from "@/utils/notification"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"

import classNames from "classnames"
import styles from "./MenuPlugin.module.scss"

const {ipcRenderer} = window.require("electron")

interface MenuPluginProps {
    loading: boolean
    pluginList: EnhancedPublicRouteMenuProps[]
    onMenuSelect: (route: RouteToPageProps) => void
    onRestore: () => any
}

export const MenuPlugin: React.FC<MenuPluginProps> = React.memo((props) => {
    const {loading, pluginList, onMenuSelect, onRestore: restoreCallback} = props

    /** 转换成菜单组件统一处理的数据格式，插件是否下载的验证由菜单组件处理，这里不处理 */
    const onMenu = useMemoizedFn((pluginId: number, pluginName: string) => {
        if (!pluginName) return

        onMenuSelect({
            route: YakitRoute.Plugin_OP,
            pluginId: pluginId || 0,
            pluginName: pluginName || ""
        })
        setListShow(false)
    })

    const onCustom = useMemoizedFn(() => {
        setListShow(false)
        ipcRenderer.invoke("open-customize-menu")
    })

    const onRestore = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteAllNavigation", {Mode: CodeGV.PublicMenuModeValue})
            .then(() => {
                restoreCallback()
                let deleteCache: any = {}
                getRemoteValue(RemoteGV.UserDeleteMenu)
                    .then((val) => {
                        if (val !== "{}") {
                            try {
                                deleteCache = JSON.parse(val) || {}
                                delete deleteCache[CodeGV.PublicMenuModeValue]
                            } catch (error) {}
                        }
                    })
                    .finally(() => {
                        setRemoteValue(RemoteGV.UserDeleteMenu, JSON.stringify(deleteCache)).finally(() => {
                            setTimeout(() => {
                                ipcRenderer.invoke("refresh-public-menu")
                            }, 50)
                        })
                    })
            })
            .catch((e: any) => {
                yakitNotify("error", `更新菜单失败:${e}`)
            })
    })

    const [listShow, setListShow] = useState<boolean>(false)
    const listDom = useMemo(() => {
        return (
            <div className={styles["plugin-list-wrapper"]}>
                <div className={styles["list-body"]}>
                    {pluginList.map((item, index) => {
                        if (item.children && item.children.length > 0)
                            return (
                                <React.Fragment key={item.label}>
                                    <div className={styles["plugins-wrapper"]}>
                                        <div className={styles["plugins-title"]}>{item.label}</div>
                                        <div className={styles["plugins-body"]}>
                                            {(item.children || []).map((subItem) => {
                                                return (
                                                    <Tooltip
                                                        key={subItem.menuName}
                                                        placement='bottom'
                                                        title={subItem.label}
                                                    >
                                                        <div
                                                            key={subItem.menuName}
                                                            className={classNames(styles["plugins-opt"], {
                                                                [styles["disable-style"]]: !subItem.yakScriptId
                                                            })}
                                                            onClick={() =>
                                                                onMenu(
                                                                    subItem.yakScriptId || 0,
                                                                    subItem.yakScripName || ""
                                                                )
                                                            }
                                                        >
                                                            {loading && (
                                                                <div
                                                                    className={styles["loading-style"]}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <LoadingOutlined />
                                                                </div>
                                                            )}
                                                            <Avatar
                                                                className={styles["avatar-style"]}
                                                                src={subItem.headImg}
                                                                icon={<PublicDefaultPluginIcon />}
                                                            />
                                                            <div
                                                                className={classNames(
                                                                    styles["opt-title"],
                                                                    "content-ellipsis"
                                                                )}
                                                                title={subItem.label}
                                                            >
                                                                {subItem.label}
                                                            </div>
                                                        </div>
                                                    </Tooltip>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    {index !== pluginList.length - 1 && (
                                        <div className={styles["plugin-divider"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                    )}
                                </React.Fragment>
                            )
                        return null
                    })}
                </div>

                <div className={styles["list-custom"]}>
                    <div className={classNames(styles["btn-style"], styles["add-list"])} onClick={onCustom}>
                        <SMViewGridAddIcon />
                        自定义...
                    </div>
                    <div className={classNames(styles["btn-style"], styles["restore-style"])} onClick={onRestore}>
                        复原菜单
                    </div>
                </div>
            </div>
        )
    }, [pluginList, loading])

    return (
        <div className={styles["menu-plugin-wrapper"]}>
            <div className={styles["plugin-header"]}>常用插件</div>
            <div className={styles["plugin-wrapper"]}>
                <div className={styles["plugin-content"]}>
                    <div className={styles["plugin-body"]}>
                        {pluginList.map((item, index) => {
                            const child = item.children || []
                            if (child.length === 0) return null
                            else {
                                return (
                                    <React.Fragment key={item.label}>
                                        {child.map((subItem) => {
                                            return (
                                                <Tooltip
                                                    key={subItem.menuName}
                                                    placement='bottom'
                                                    title={subItem.label}
                                                >
                                                    <div
                                                        key={subItem.menuName}
                                                        className={classNames(styles["plugin-opt"], {
                                                            [styles["disable-style"]]: !subItem.yakScriptId
                                                        })}
                                                        onClick={() =>
                                                            onMenu(subItem.yakScriptId || 0, subItem.yakScripName || "")
                                                        }
                                                    >
                                                        {loading && (
                                                            <div
                                                                className={styles["loading-style"]}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <LoadingOutlined />
                                                            </div>
                                                        )}
                                                        <Avatar
                                                            className={styles["avatar-style"]}
                                                            src={subItem.headImg}
                                                            icon={<PublicDefaultPluginIcon />}
                                                        />
                                                        <div
                                                            className={classNames(
                                                                styles["plugin-title"],
                                                                "content-ellipsis"
                                                            )}
                                                        >
                                                            {subItem.label}
                                                        </div>
                                                    </div>
                                                </Tooltip>
                                            )
                                        })}
                                        {index !== pluginList.length - 1 && (
                                            <div className={styles["plugin-divider"]}>
                                                <div className={styles["divider-style"]}></div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                )
                            }
                        })}
                    </div>
                    <div className={classNames(styles["plugin-btn"], {[styles["plugin-active-btn"]]: listShow})}>
                        <YakitPopover
                            overlayClassName={styles["plugin-list-popover"]}
                            overlayStyle={{paddingTop: 6}}
                            placement='bottomRight'
                            trigger={"click"}
                            content={listDom}
                            visible={listShow}
                            onVisibleChange={(visible) => setListShow(visible)}
                        >
                            <div className={styles["body-style"]}>
                                {listShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            </div>
                        </YakitPopover>
                    </div>
                </div>
            </div>
        </div>
    )
})
