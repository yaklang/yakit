import {Drawer} from "antd"
import React, {useEffect} from "react"
import {YakitDrawerProps} from "./YakitDrawerType"
import styles from "./YakitDrawer.module.scss"
import classNames from "classnames"
import {RemoveIcon} from "@/assets/newIcon"

const {ipcRenderer} = window.require("electron")

/**
 * @description:YakitDrawer  抽屉 placement === "bottom" heard有背景色
 * @augments DrawerProps 继承antd的 DrawerProps 默认属性
 */
export const YakitDrawer: React.FC<YakitDrawerProps> = (props) => {
    const {visible} = props
    useEffect(() => {
        if (visible) {
            ipcRenderer.invoke("update-yakit-header-title-drop", false)
        } else {
            ipcRenderer.invoke("update-yakit-header-title-drop", true)
        }
    }, [visible])
    return (
        <Drawer
            {...props}
            closeIcon={<div className={styles["yakit-drawer-icon"]}>{props.closeIcon || <RemoveIcon className={styles["yakit-drawer-remove-icon"]}/>}</div>}
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
