import React, {ReactNode, useMemo} from "react"
import {useMemoizedFn} from "ahooks"
import {Menu, MenuProps, Tooltip} from "antd"
import {ItemType} from "antd/lib/menu/hooks/useItems"
import {MenuDividerType} from "rc-menu/lib/interface"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"

import classNames from "classnames"
import styles from "./yakitMenu.module.scss"

export interface YakitMenuItemProps {
    /** 菜单项展示内容 */
    label: string | ReactNode
    /** 菜单项值 */
    key: string
    /** 是否禁用 */
    disabled?: boolean
    children?: YakitMenuItemProps[]
    itemIcon?: ReactNode
    /** tooltip提示，不填默认用label */
    title?: string
    /** 单项菜单类型(只在叶子节点时有效) */
    type?: "success" | "danger" | "info" | "text"
    /**
     * 取消统一的固定高度，固定 padding
     * 取消悬浮、选中状态的颜色样式，只保存初始的背景、icon和文字颜色样式
     */
    noStyle?: boolean
}
export interface YakitMenuItemDividerProps {
    type: "divider"
}
export type YakitMenuItemType = YakitMenuItemProps | YakitMenuItemDividerProps

export interface YakitMenuProp extends MenuProps {
    data?: YakitMenuItemType[]
    width?: number
    type?: "primary" | "grey"
    /** 是否鼠标悬浮展示文字内容弹窗 */
    isHint?: boolean
    popupClassName?: string
    /** @name 组件尺寸类型(默认|右键高度紧凑型) */
    size?: "default" | "rightMenu"
}

export const YakitMenu: React.FC<YakitMenuProp> = React.memo((props) => {
    const {
        data = [],
        width = 128,
        type = "primary",
        isHint = false,
        className,
        popupClassName,
        size = "default",
        ...restMenu
    } = props

    const menuTypeClass = useMemo(() => {
        if (type === "grey") return styles["yakit-menu-grey"]
        return styles["yakit-menu-primary"]
    }, [type])
    const menuSizeClass = useMemo(() => {
        if (size === "rightMenu") return styles["yakit-menu-right-menu-size"]
        return styles["yakit-menu-default-size"]
    }, [size])

    const itemMenuTypeClass = useMemoizedFn((type?: YakitMenuItemProps["type"]) => {
        if (type === "success") return "yakit-menu-item-success"
        if (type === "danger") return "yakit-menu-item-danger"
        if (type === "info") return "yakit-menu-item-info"
        if (type === "text") return "yakit-menu-item-text"
        return ""
    })

    const generateMenuInfo = useMemoizedFn((data: YakitMenuItemType) => {
        if (
            typeof (data as any as YakitMenuItemDividerProps)["type"] !== "undefined" &&
            (data as any as YakitMenuItemDividerProps).type === "divider"
        ) {
            const itemInfo: MenuDividerType = {
                type: "divider"
            }
            return itemInfo
        } else {
            const info: YakitMenuItemProps = {...(data as any)}
            const hintTitle = !!info.title ? info.title : typeof info.label === "string" ? info.label : ""

            if (info.children && info.children.length > 0) {
                const itemInfo: ItemType = {
                    label: (
                        <div style={{minWidth: width}} className={classNames(styles["yakit-menu-item"])}>
                            <div className={styles["yakit-submenu-item-content"]}>
                                {info.itemIcon}
                                {isHint && !!hintTitle ? (
                                    <Tooltip zIndex={9999} title={hintTitle} placement='leftBottom'>
                                        <div
                                            className={classNames(
                                                styles["yakit-menu-item-title"],
                                                "yakit-single-line-ellipsis"
                                            )}
                                        >
                                            {info.label}
                                        </div>
                                    </Tooltip>
                                ) : (
                                    <div
                                        className={classNames(
                                            styles["yakit-menu-item-title"],
                                            "yakit-single-line-ellipsis"
                                        )}
                                    >
                                        {info.label}
                                    </div>
                                )}
                            </div>
                            <OutlineChevronrightIcon />
                        </div>
                    ),
                    key: info.key,
                    disabled: info.disabled,
                    children: [],
                    popupClassName: classNames(
                        styles["yakit-menu-submenu"],
                        menuTypeClass,
                        menuSizeClass,
                        popupClassName
                    )
                }
                const arr: ItemType[] = []
                for (let item of info.children) {
                    arr.push(generateMenuInfo(item))
                }
                itemInfo.children = itemInfo.children.concat(arr)
                return itemInfo
            } else {
                const {noStyle} = info
                const itemInfo: ItemType = {
                    label: (
                        <div
                            style={{minWidth: width}}
                            className={classNames(styles["yakit-menu-item"], itemMenuTypeClass(info.type) || "", {
                                [styles["yakit-menu-item-no-style"]]: noStyle,
                                "yakit-menu-item-no-style": noStyle
                            })}
                        >
                            <div className={styles["yakit-menu-item-content"]}>
                                {info.itemIcon}
                                {isHint && !!hintTitle ? (
                                    <Tooltip zIndex={9999} title={hintTitle} placement='leftBottom'>
                                        <div
                                            className={classNames(
                                                styles["yakit-menu-item-title"],
                                                "yakit-single-line-ellipsis"
                                            )}
                                        >
                                            {info.label}
                                        </div>
                                    </Tooltip>
                                ) : (
                                    <div
                                        className={classNames(
                                            styles["yakit-menu-item-title"],
                                            "yakit-single-line-ellipsis"
                                        )}
                                    >
                                        {info.label}
                                    </div>
                                )}
                            </div>
                        </div>
                    ),
                    key: info.key,
                    disabled: info.disabled
                }
                return itemInfo
            }
        }
    })

    let items: ItemType[] = []
    if (data.length > 0) for (let item of data) items.push(generateMenuInfo(item))

    return (
        <div className={classNames(styles["yakit-menu-div-wrapper"], menuTypeClass, menuSizeClass)}>
            <Menu
                {...restMenu}
                className={classNames(styles["yakit-menu-wrapper"], className || "")}
                items={data && data.length > 0 ? items : restMenu.items}
            ></Menu>
        </div>
    )
})
