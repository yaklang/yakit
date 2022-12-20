import React, {ReactNode} from "react"
import {useMemoizedFn} from "ahooks"
import {Menu, MenuProps, Tooltip} from "antd"
import {ItemType} from "antd/lib/menu/hooks/useItems"

import classnames from "classnames"
import styles from "./yakitMenu.module.scss"
import {ChevronRightIcon} from "@/assets/newIcon"

/**
 * 更新说明
 * 1、新增yakit-menu(参考原型稿 首页-头部悬浮菜单和软件导航栏):
 *     1)主题色-默认样式(不填)/secondary
 *     2)菜单项内容提示-isHint和菜单项内的title字段控制(未测试)
 */

export interface YakitMenuItemProps {
    label: string | ReactNode
    key: string
    disabled?: boolean
    children?: YakitMenuItemProps[]
    itemIcon?: ReactNode
    title?: string
}

export interface YakitMenuProp extends MenuProps {
    data?: YakitMenuItemProps[]
    width?: number
    /** 有默认菜单样式(深底白字)和'secondary-浅底深字'样式 */
    type?: "secondary"
    /** 是否鼠标悬浮展示文字内容弹窗 */
    isHint?: boolean
}

export const YakitMenu: React.FC<YakitMenuProp> = React.memo((props) => {
    const {data = [], width = 128, type = "primary", isHint = false, className, ...restMenu} = props

    const generateMenuInfo = useMemoizedFn((info: YakitMenuItemProps) => {
        // 菜单项的提示内容
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
                    styles["yakit-menu-submenu"]
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
