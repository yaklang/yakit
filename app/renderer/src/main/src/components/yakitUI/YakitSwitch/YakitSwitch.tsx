import {Switch} from "antd"
import React from "react"
import {YakitSwitchProps} from "./YakitSwitchType"
import styles from "./YakitSwitch.module.scss"
import classNames from "classnames"
import {CheckIcon, RemoveIcon} from "@/assets/newIcon"
import "./yakitSwitchAnimation.scss"

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.修改 disabled 状态下checked没有变灰
 * 3.disabled状态变换时，动画问题
 * 4.更换颜色变量
 */

/**
 * @description: tag
 * @augments TagProps 继承antd的TagProps默认属性
 * @param {"small" | "middle" | "large" | "maxLarge" } size 默认middle  small默认时showInnerText不起作用
 * @private checkedChildren
 * @private unCheckedChildren
 * @param {boolean} showInnerText  是否显示里面有 开/关 的文字  仅支持["large", "middle"]
 * @param {boolean} showInnerIcon  是否显示里面图标 仅支持["large", "middle"]
 * @param {string} wrapperClassName Switch装饰div的className
 */

const showExtraSize: string[] = ["large", "middle"]
export const YakitSwitch: React.FC<YakitSwitchProps> = (props) => {
    const {size = "middle", showInnerText, showInnerIcon, className = "", wrapperClassName = ""} = props
    let children = {}
    if (showInnerText && showExtraSize.findIndex((ele) => ele === size) !== -1) {
        children = {
            checkedChildren: "开",
            unCheckedChildren: "关"
        }
    }
    if (showInnerIcon && showExtraSize.findIndex((ele) => ele === size) !== -1) {
        children = {
            checkedChildren: (
                <CheckIcon
                    className={classNames({
                        [styles["yakit-switch-large-icon"]]: size === "large",
                        [styles["yakit-switch-middle-icon"]]: size === "middle"
                    })}
                />
            ),
            unCheckedChildren: (
                <RemoveIcon
                    className={classNames({
                        [styles["yakit-switch-large-icon"]]: size === "large",
                        [styles["yakit-switch-middle-icon"]]: size === "middle"
                    })}
                />
            )
        }
    }
    return (
        <div
            className={classNames(
                styles["yakit-switch-wrapper-item"],
                {
                    [styles["yakit-switch-wrapper-max-large"]]: size === "maxLarge",
                    [styles["yakit-switch-wrapper-large"]]: size === "large",
                    [styles["yakit-switch-wrapper-middle"]]: size === "middle",
                    [styles["yakit-switch-wrapper-small"]]: size === "small"
                },
                wrapperClassName
            )}
        >
            <Switch
                {...props}
                {...children}
                size='default'
                className={classNames(styles["yakit-switch-item"], {
                    [styles["yakit-switch-max-large"]]: size === "maxLarge",
                    [styles["yakit-switch-large"]]: size === "large",
                    [styles["yakit-switch-middle"]]: size === "middle",
                    [styles["yakit-switch-small"]]: size === "small",
                    className
                })}
            />
        </div>
    )
}