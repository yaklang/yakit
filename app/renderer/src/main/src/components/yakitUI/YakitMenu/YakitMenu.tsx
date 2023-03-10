import React, {ReactNode} from "react"
import {useMemoizedFn} from "ahooks"
import {Menu, MenuProps, Tooltip} from "antd"
import {ItemType} from "antd/lib/menu/hooks/useItems"
import {ChevronRightIcon} from "@/assets/newIcon"
import {MenuDividerType} from "rc-menu/lib/interface"

import classnames from "classnames"
import styles from "./yakitMenu.module.scss"

export interface YakitMenuItemProps {
    label: string | ReactNode
    key: string
    disabled?: boolean
    children?: YakitMenuItemProps[]
    itemIcon?: ReactNode
    title?: string
}
export interface YakitMenuItemDividerProps {
    type: "divider"
}
type YakitMenuItemType = YakitMenuItemProps | YakitMenuItemDividerProps

export interface YakitMenuProp extends MenuProps {
    data?: YakitMenuItemType[]
    width?: number
    /** 有默认菜单样式(深底白字)和'secondary-浅底深字'样式 */
    type?: "secondary" | "primary"
    /** 是否鼠标悬浮展示文字内容弹窗 */
    isHint?: boolean
    popupClassName?: string
}

export const YakitMenu: React.FC<YakitMenuProp> = React.memo((props) => {
    const {data = [], width = 128, type = "primary", isHint = false, className, popupClassName, ...restMenu} = props

    const generateMenuInfo = useMemoizedFn((data: YakitMenuItemType) => {
        if (typeof (data as any as YakitMenuItemDividerProps)["type"] !== "undefined") {
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
                        <div style={{width: width}} className={classnames(styles["yakit-menu-item"])}>
                            <div className={styles["yakit-submenu-item-content"]}>
                                {info.itemIcon}
                                {isHint && !!hintTitle ? (
                                    <Tooltip zIndex={9999} title={hintTitle} placement='leftBottom'>
                                        <div
                                            className={classnames(
                                                styles["yakit-menu-item-title"],
                                                "yakit-single-line-ellipsis"
                                            )}
                                        >
                                            {info.label}
                                        </div>
                                    </Tooltip>
                                ) : (
                                    <div
                                        className={classnames(
                                            styles["yakit-menu-item-title"],
                                            "yakit-single-line-ellipsis"
                                        )}
                                    >
                                        {info.label}
                                    </div>
                                )}
                            </div>
                            <ChevronRightIcon className='icon-style' />
                        </div>
                    ),
                    key: info.key,
                    disabled: info.disabled,
                    children: [],
                    popupClassName: classnames(
                        {
                            [styles["yakit-menu-primary"]]: type === "primary",
                            [styles["yakit-menu-secondary"]]: type === "secondary"
                        },
                        styles["yakit-menu-submenu"],
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
                const itemInfo: ItemType = {
                    label: (
                        <div style={{width: width}} className={classnames(styles["yakit-menu-item"])}>
                            <div className={styles["yakit-menu-item-content"]}>
                                {info.itemIcon}
                                {isHint && !!hintTitle ? (
                                    <Tooltip zIndex={9999} title={hintTitle} placement='leftBottom'>
                                        <div
                                            className={classnames(
                                                styles["yakit-menu-item-title"],
                                                "yakit-single-line-ellipsis"
                                            )}
                                        >
                                            {info.label}
                                        </div>
                                    </Tooltip>
                                ) : (
                                    <div
                                        className={classnames(
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
        <div
            className={classnames(styles["yakit-menu-div-wrapper"], {
                [styles["yakit-menu-primary"]]: type === "primary",
                [styles["yakit-menu-secondary"]]: type === "secondary"
            })}
        >
            <Menu
                {...restMenu}
                className={classnames(styles["yakit-menu-wrapper"], {[className || ""]: !!className})}
                items={data && data.length > 0 ? items : restMenu.items}
            ></Menu>
        </div>
    )
})
