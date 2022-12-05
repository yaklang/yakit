import React, {ReactNode} from "react"
import {useMemoizedFn} from "ahooks"
import {Menu, MenuProps, Tooltip} from "antd"
import {ItemType} from "antd/lib/menu/hooks/useItems"
import {YakitMenuRightSvgIcon} from "./icon"

import classnames from "classnames"
import styles from "./yakitMenu.module.scss"

export interface YakitMenuItemProps {
    label: string | ReactNode
    key: string
    disabled?: boolean
    children?: YakitMenuItemProps[]
    itemIcon?: ReactNode
}

export interface YakitMenuProp extends MenuProps {
    data?: YakitMenuItemProps[]
    width?: number
    showTooltip?: boolean
}

export const YakitMenu: React.FC<YakitMenuProp> = React.memo((props) => {
    const {data = [], width = 128, className, showTooltip, ...restMenu} = props

    const generateMenuInfo = useMemoizedFn((info: YakitMenuItemProps) => {
        const isIcon = !!info.itemIcon

        if (info.children && info.children.length > 0) {
            const itemInfo: ItemType = {
                label: (
                    <div style={{width: width}} className={classnames(styles["yakit-menu-item"])}>
                        <div className={styles["yakit-menu-item-left"]}>
                            {info.itemIcon}
                            {(typeof info.label === "string" && showTooltip && (
                                <Tooltip zIndex={9999} title={info.label} placement='leftBottom'>
                                    <div className='content-ellipsis'>{info.label}</div>
                                </Tooltip>
                            )) || <div className='content-ellipsis'>{info.label}</div>}
                        </div>
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
                    <div style={{width: width}} className={classnames(styles["yakit-menu-item"])}>
                        <div className={styles["yakit-menu-item-left"]}>
                            {info.itemIcon}
                            {(typeof info.label === "string" && showTooltip && (
                                <Tooltip zIndex={9999} title={info.label} placement='rightBottom'>
                                    <div className='content-ellipsis'>{info.label}</div>
                                </Tooltip>
                            )) || <div className='content-ellipsis'>{info.label}</div>}
                        </div>
                    </div>
                ),
                key: info.key,
                disabled: info.disabled,
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
