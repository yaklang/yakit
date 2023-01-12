import React, {useMemo} from "react"
import {Button, ButtonProps} from "antd"

import classnames from "classnames"
import styles from "./yakitButton.module.scss"

/**
 * 更新说明
 * 1、新增yakit-button组件
 *     1)主题色-primary(默认值)/outline1/outline2/text/secondary1/secondary2/success/warning/danger/serious
 *     2)大小-默认样式(不填)/large/small/max
 * 2、修改yakitButon，text有阴影问题和不居中问题
 * 3、修改disabled时，出现的一些伪类样式问题
 * 4、新增id=yakit-button，方便外部直接书写样式
 */

export interface YakitButtonProp extends Omit<ButtonProps, "size" | "type"> {
    type?:
        | "outline1"
        | "outline2"
        | "text"
        | "primary"
        | "secondary1"
        | "secondary2"
        | "success"
        | "warning"
        | "danger"
        | "serious"
    themeClass?: string
    size?: "large" | "small" | "max"
}

/**
 * @name Yakit 主题按钮组件
 * @description
 * 可以自定义不同状态下背景色、字体色和边框色，主要参数如下(如某些参数不配置，将自动沿用主题色的配置颜色)
 *
 * 注：1、需要用户自定义一个样式类，将如下全部或部分变量在类内进行定义 2、暂时需要给修改的变量值加上 !important
 *
 *
 *  --button-wave-shadow-color: 按钮动画边框阴影色
 *
 *  --button-background: 按钮背景色
 *
 *  --button-color: 按钮字体色
 *
 *  --button-border-color: 按钮边框色
 *
 *  --button-hover-background: 按钮 hover 背景色
 *
 *  --button-hover-color: 按钮 hover 字体色
 *
 *  --button-hover-border-color: 按钮 hover 边框色
 *
 *  --button-disable-background: 按钮 disable 背景色
 *
 *  --button-disable-color: 按钮 disable 字体色
 *
 *  --button-disable-border-color: 按钮 disable 边框色
 *
 *  --button-press-background: 按钮 press 背景色
 *
 *  --button-press-color: 按钮 press 字体色
 *
 *  --button-press-border-color: 按钮 press 边框色
 */
export const YakitButton: React.FC<YakitButtonProp> = React.memo((props) => {
    const {size, type, themeClass, children, className, ...resePopover} = props

    const typeClass = useMemo(() => {
        if (!type) return "yakit-button-primary"
        if (type === "outline1") return "yakit-button-outline-1"
        if (type === "outline2") return "yakit-button-outline-2"
        if (type === "text") return "yakit-button-text"
        if (type === "primary") return "yakit-button-primary"
        if (type === "secondary1") return "yakit-button-secondary-1"
        if (type === "secondary2") return "yakit-button-secondary-2"
        if (type === "success") return "yakit-button-success"
        if (type === "danger") return "yakit-button-danger"
        if (type === "serious") return "yakit-button-serious"
        if (type === "warning") return "yakit-button-warning"
        return "yakit-button-primary"
    }, [type])

    const sizeClass = useMemo(() => {
        if (!size) return "yakit-button-size"
        if (size === "large") return "yakit-button-large-size"
        if (size === "small") return "yakit-button-small-size"
        if (size === "max") return "yakit-button-max-size"
        return "yakit-button-size"
    }, [size])

    return (
        <div className={classnames(styles["yakit-button-wrapper"], styles[typeClass || ""], themeClass || "")}>
            <Button
                {...resePopover}
                size='middle'
                type='default'
                className={classnames(styles[sizeClass], styles["yakit-button"], styles["yakit-button-type"], {
                    [className || ""]: !!className
                })}
            >
                {children}
            </Button>
        </div>
    )
})
