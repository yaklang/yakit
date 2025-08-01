import React, {useMemo} from "react"
import {Button, ButtonProps} from "antd"

import styles from "./yakitButton.module.scss"
import classNames from "classnames"

export interface YakitButtonProp extends Omit<ButtonProps, "size" | "type" | "ghost" | "shape"> {
    type?: "primary" | "secondary2" | "outline1" | "outline2" | "text" | "text2"
    /** 当colors和danger同时存在，以colors为准 */
    colors?: "success" | "danger" | "primary" | "infoBlue"
    size?: "small" | "middle" | "large" | "max"
    isHover?: boolean
    isActive?: boolean
}

/** @name Yakit 主题按钮组件 */
export const YakitButton: React.FC<YakitButtonProp> = React.memo((props) => {
    const {size, type, colors, isHover, isActive, children, className, danger, ...resePopover} = props
    const typeClass = useMemo(() => {
        if (type === "secondary2") return "yakit-button-secondary2"
        if (type === "outline1") return "yakit-button-outline1"
        if (type === "outline2") return "yakit-button-outline2"
        if (type === "text") return "yakit-button-text"
        if (type === "text2") return "yakit-button-text2"
        return "yakit-button-primary"
    }, [type])
    const colorClass = useMemo(() => {
        if (!colors && danger) return "yakit-button-danger"
        if (colors === "success") return "yakit-button-success"
        if (colors === "danger") return "yakit-button-danger"
        if (colors === "infoBlue") return "yakit-button-infoBlue"
        return ""
    }, [colors, danger])

    const sizeClass = useMemo(() => {
        if (size === "small") return "yakit-button-small-size"
        if (size === "large") return "yakit-button-large-size"
        if (size === "max") return "yakit-button-max-size"
        return "yakit-button-size"
    }, [size])

    return (
        <Button
            {...resePopover}
            size='middle'
            type='default'
            className={classNames(
                styles["yakit-button"],
                styles[typeClass],
                styles[colorClass || ""],
                styles[sizeClass],
                {[styles["yakit-hover-button"]]: !!isHover},
                {[styles["yakit-active-button"]]: !!isActive},
                className || ""
            )}
        >
            {children}
        </Button>
    )
})
