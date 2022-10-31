import React, {ReactNode} from "react"
import {useMemoizedFn} from "ahooks"
import {Menu, MenuProps} from "antd"
import {ItemType} from "antd/lib/menu/hooks/useItems"
import {YakitMenuRightSvgIcon} from "./icon"

import classnames from "classnames"
import styles from "./yakitMenu.module.scss"

export interface YakitMenuItemProps {
    label: string
    key: string
    disabled?: boolean
    children?: YakitMenuItemProps[]
    itemIcon?: ReactNode
}

export interface YakitMenuProp extends MenuProps {
    data?: YakitMenuItemProps[]
    width?: number
}

export const YakitMenu: React.FC<YakitMenuProp> = React.memo((props) => {
    const {data = [], width = 128, className, ...restMenu} = props

    const generateMenuInfo = useMemoizedFn((info: YakitMenuItemProps) => {
        const isIcon = !!info.itemIcon

        if (info.children && info.children.length > 0) {
            const itemInfo: ItemType = {
                label: (
                    <div
                        style={{width: width}}
                        className={classnames(styles["yakit-menu-item"], styles["yakit-menu-item-style"])}
                    >
                        {info.label}
                        <YakitMenuRightSvgIcon className={styles["icon-style"]} />
                    </div>
                ),
                key: info.key,
                disabled: info.disabled,
                children: [],
                popupClassName: styles["yakit-menu-submenu"]
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
                    <div
                        style={{width: width}}
                        className={classnames(styles["yakit-menu-item"], styles["yakit-menu-item-style"])}
                    >
                        {info.label}
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
        <Menu
            {...restMenu}
            className={classnames(styles["yakit-menu-wrapper"], {[className || ""]: !!className})}
            items={data && data.length > 0 ? items : restMenu.items}
        ></Menu>
    )
})
