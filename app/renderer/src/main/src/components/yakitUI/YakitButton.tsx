import React, {useMemo, useState} from "react"
import {Button, ButtonProps} from "antd"

import classnames from "classnames"
import styles from "./yakitButton.module.scss"

export interface YakitButtonProp extends Omit<ButtonProps, "size" | "type"> {
    type?: "outline1"
    themeClass?: string
    size?: "big" | "small"
}

/**
 * @name Yakit 主题按钮组件
 * @description
 * 可以自定义不同状态下背景色、字体色和边框色，主要参数如下(如某些参数不配置，将自动沿用主题色的配置颜色)
 *
 * 注：1、需要用户自定义一个样式类，将如下全部或部分变量在类内进行定义 2、暂时需要给修改的变量值加上 !important
 *
 *
 *  --yakit-wave-shadow-color: 按钮动画边框阴影色
 *
 *  --yakit-background: 按钮背景色
 *
 *  --yakit-color: 按钮字体色
 *
 *  --yakit-border-color: 按钮边框色
 *
 *  --yakit-hover-background: 按钮 hover 背景色
 *
 *  --yakit-hover-color: 按钮 hover 字体色
 *
 *  --yakit-hover-border-color: 按钮 hover 边框色
 *
 *  --yakit-disable-background: 按钮 disable 背景色
 *
 *  --yakit-disable-color: 按钮 disable 字体色
 *
 *  --yakit-disable-border-color: 按钮 disable 边框色
 *
 *  --yakit-press-background: 按钮 press 背景色
 *
 *  --yakit-press-color: 按钮 press 字体色
 *
 *  --yakit-press-border-color: 按钮 press 边框色
 */
export const YakitButton: React.FC<YakitButtonProp> = React.memo((props) => {
    const {size, type, themeClass, children, className, onMouseDown, onMouseUp, ...resePopover} = props

    const [press, setPress] = useState<boolean>(false)

    const typeClass = useMemo(() => {
        if (!type) return "yakit-button-primary"
        if (type === "outline1") return "yakit-button-outline-1"
        return "yakit-button-primary"
    }, [type])

    const sizeClass = useMemo(() => {
        if (!size) return "yakit-button-size"
        if (size === "big") return "yakit-button-big-size"
        if (size === "small") return "yakit-button-small-size"
        return "yakit-button-size"
    }, [size])

    return (
        <div className={classnames(styles["yakit-button-wrapper"], styles[typeClass], themeClass)}>
            <Button
                {...resePopover}
                size='middle'
                type='default'
                className={classnames(
                    styles[sizeClass],
                    styles["yakit-button-type"],
                    {[styles["yakit-button-press"]]: press},
                    {[styles[className || ""]]: !!className}
                )}
                onMouseDown={(e) => {
                    if (onMouseDown) onMouseDown(e)
                    setPress(true)
                }}
                onMouseUp={(e) => {
                    if (onMouseDown) onMouseDown(e)
                    setPress(false)
                }}
            >
                {children}
            </Button>
        </div>
    )
})
