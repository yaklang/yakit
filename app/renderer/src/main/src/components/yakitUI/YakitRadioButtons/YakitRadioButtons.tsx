import {Checkbox, Radio} from "antd"
import React from "react"
import {YakitRadioButtonsProps} from "./YakitRadioButtonsType"
import styles from "./YakitRadioButtons.module.scss"
import classNames from "classnames"
import {EDITION_STATUS, getJuageEnvFile} from "@/utils/envfile"

const IsNewUI: boolean = EDITION_STATUS.IS_NEW_UI === getJuageEnvFile()

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 */

/**
 * @description: 按钮单选框Props
 * @param optionType 弃用
 * @param {"small" | "middle" | "large" | "maxLarge"} size  默认middle
 * @augments RadioGroupProps 继承antd的 RadioGroupProps 默认属性
 * @params {string} className RadioGroup  className
 */
export const YakitRadioButtons: React.FC<YakitRadioButtonsProps> = (props) => {
    const {className, size, ...restProps} = props
    return (
        <Radio.Group
            {...restProps}
            size='middle'
            optionType='button'
            className={classNames(
                styles["yakit-radio-buttons-middle"],
                {
                    [styles["yakit-radio-buttons-newUI"]]: IsNewUI,
                    [styles["yakit-radio-buttons-oldUI"]]: !IsNewUI,
                    [styles["yakit-radio-buttons-max-large"]]: size === "maxLarge",
                    [styles["yakit-radio-buttons-large"]]: size === "large",
                    [styles["yakit-radio-buttons-small"]]: size === "small"
                },
                className
            )}
        />
    )
}
