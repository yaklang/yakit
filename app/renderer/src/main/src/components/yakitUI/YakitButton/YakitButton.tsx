import React, {useMemo, useState} from "react"
import {Button, ButtonProps} from "antd"

import classnames from "classnames"
import styles from "./yakitButton.module.scss"

/**
 * 更新说明
 * 1、新增yakit-button组件，新增按钮多种样式(参考原型稿 button 组件):
 *     1)主题色-默认样式(不填)/outline1/outline2
 *     2)大小-默认样式(不填)/big/small/max
 * 2、修改yakitButon，text有阴影问题和不居中问题
 * 3、修改disabled时，出现的一些伪类样式问题
 */

export interface YakitButtonProp extends Omit<ButtonProps, "size" | "type"> {
    type?: "outline1" | "outline2" | "text" | "primary"
    themeClass?: string
    size?: "big" | "small" | "max"
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
        if (type === "outline2") return "yakit-button-outline-2"
        if (type === "text") return "yakit-button-text"
        if (type === "primary") return "yakit-button-primary"
        return "yakit-button-primary"
    }, [type])

    const sizeClass = useMemo(() => {
        if (!size) return "yakit-button-size"
        if (size === "big") return "yakit-button-big-size"
        if (size === "small") return "yakit-button-small-size"
        if (size === "max") return "yakit-button-max-size"
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
                    styles["yakit-button"],
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
