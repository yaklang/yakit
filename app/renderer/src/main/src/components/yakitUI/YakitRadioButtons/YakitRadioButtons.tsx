import {Checkbox, Radio} from "antd"
import React from "react"
import {YakitRadioButtonsProps} from "./YakitRadioButtonsType"
import styles from "./YakitRadioButtons.module.scss"
import classNames from "classnames"

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.优化solid风格的样式
 * 4.更换颜色变量
 * 5.修改边框的颜色
 */

/**
 * @description: 按钮单选框Props
 * @param optionType 弃用
 * @param {"small" | "middle" | "large" | "maxLarge"} size  默认middle
 * @augments RadioGroupProps 继承antd的 RadioGroupProps 默认属性
 * @params {string} className RadioGroup  className
 */
export const YakitRadioButtons: React.FC<YakitRadioButtonsProps> = (props) => {
    const {className, size, wrapClassName, ...restProps} = props
    return (
        <div
            className={classNames(
                {
                    [styles["yakit-radio-buttons-solid"]]: props.buttonStyle === "solid"
                },
                wrapClassName
            )}
        >
            <Radio.Group
                {...restProps}
                size='middle'
                optionType='button'
                className={classNames(
                    styles["yakit-radio-buttons-middle"],
                    {
                        [styles["yakit-radio-buttons-solid"]]: props.buttonStyle === "solid",
                        [styles["yakit-radio-buttons-max-large"]]: size === "maxLarge",
                        [styles["yakit-radio-buttons-large"]]: size === "large",
                        [styles["yakit-radio-buttons-small"]]: size === "small"
                    },
                    className
                )}
            />
        </div>
    )
}
