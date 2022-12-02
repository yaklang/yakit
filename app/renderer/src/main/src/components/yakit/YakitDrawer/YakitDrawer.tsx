import {Drawer} from "antd"
import React from "react"
import {YakitDrawerProps} from "./YakitDrawerType"
import styles from "./YakitDrawer.module.scss"
import classNames from "classnames"

/**
 * @description:YakitDrawer  抽屉 placement === "bottom" heard有背景色
 * @augments DrawerProps 继承antd的 DrawerProps 默认属性
 */
export const YakitDrawer: React.FC<YakitDrawerProps> = (props) => {
    return (
        <Drawer
            {...props}
            className={classNames(
                styles["yakit-drawer"],
                {[styles["yakit-drawer-bottom"]]: props.placement === "bottom"},
                props.className
            )}
        >
            {props.children}
        </Drawer>
    )
}
