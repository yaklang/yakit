import React, {useMemo, useState} from "react"
import {ChevronDownIcon, ChevronUpIcon, SMViewGridAddIcon} from "@/assets/newIcon"
import {PublicDefaultPluginIcon} from "@/routes/publicIcon"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {useMemoizedFn} from "ahooks"
import {EnhancedPublicRouteMenuProps} from "./utils"
import {Avatar} from "antd"
import {YakitRoute} from "@/routes/newRoute"
import {RouteToPageProps} from "./PublicMenu"
import {LoadingOutlined} from "@ant-design/icons"

import classNames from "classnames"
import styles from "./MenuPlugin.module.scss"

const {ipcRenderer} = window.require("electron")

interface MenuPluginProps {
    loading: boolean
    pluginList: EnhancedPublicRouteMenuProps[]
    onMenuSelect: (route: RouteToPageProps) => void
}

export const MenuPlugin: React.FC<MenuPluginProps> = React.memo((props) => {
    const {loading, pluginList, onMenuSelect} = props

    /** 转换成菜单组件统一处理的数据格式，插件是否下载的验证由菜单组件处理，这里不处理 */
    const onMenu = useMemoizedFn((pluginId: number, pluginName: string) => {
        if (!pluginName) return

        onMenuSelect({
            route: YakitRoute.Plugin_OP,
            pluginId: pluginId || 0,
            pluginName: pluginName || ""
        })
    })

    const onCustom = useMemoizedFn(() => {
        setListShow(false)
        ipcRenderer.invoke("open-customize-menu")
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
                                                    <div
                                                        key={subItem.menuName}
                                                        className={classNames(styles["plugins-opt"], {
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
                                                                styles["opt-title"],
                                                                "content-ellipsis"
                                                            )}
                                                            title={subItem.label}
                                                        >
                                                            {subItem.label}
                                                        </div>
                                                    </div>
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
                    <div className={styles["add-list"]} onClick={onCustom}>
                        <SMViewGridAddIcon />
                        自定义...
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
                            overlayStyle={{paddingTop: 20}}
                            placement='bottomRight'
                            trigger={"click"}
                            content={listDom}
                            visible={listShow}
                            onVisibleChange={(visible) => setListShow(visible)}
                        >
                            {listShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </YakitPopover>
                    </div>
                </div>
            </div>
        </div>
    )
})
