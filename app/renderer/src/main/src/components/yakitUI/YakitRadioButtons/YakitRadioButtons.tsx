import {Checkbox, Radio} from "antd"
import React from "react"
import {YakitRadioButtonsProps} from "./YakitRadioButtonsType"
import styles from "./YakitRadioButtons.module.scss"
import classNames from "classnames"

/**
 * @description: 按钮单选框Props
 * @deprecated optionType 弃用
 * @param {"small" | "middle" | "large" | "maxLarge"} size  默认middle
 * @augments RadioGroupProps 继承antd的 RadioGroupProps 默认属性
 * @params {string} className RadioGroup  className
 */
export const YakitRadioButtons: React.FC<YakitRadioButtonsProps> = (props) => {
    const {className, size, ...restProps} = props
    return (
        <div>
            <Radio.Group
                {...restProps}
                size='middle'
                optionType='button'
                className={classNames(
                    styles["yakit-radio-buttons-middle"],
                    {
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
