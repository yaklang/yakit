import {Checkbox} from "antd"
import React from "react"
import {YakitCheckboxProps} from "./YakitCheckboxType"
import styles from "./YakitCheckbox.module.scss"
import classNames from "classnames"
import {EDITION_STATUS, getJuageEnvFile} from "@/utils/envfile"
import "./yakitCheckBoxAnimation.scss"

const IsNewUI: boolean = EDITION_STATUS.IS_NEW_UI === getJuageEnvFile()

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 */

/**
 * @description: 两种方式的数字输入
 * @augments CheckboxProps 继承antd的CheckboxProps默认属性
 */
export const YakitCheckbox: React.FC<YakitCheckboxProps> = (props) => {
    // const {} = props
    return (
        <span
            className={classNames(styles["yakit-checkbox-wrapper"], {
                [styles["yakit-checkbox-wrapper-newUI"]]: IsNewUI,
                [styles["yakit-checkbox-wrapper-oldUI"]]: !IsNewUI
            })}
        >
            {(props.children && <Checkbox {...props}>{props.children}</Checkbox>) || <Checkbox {...props} />}
        </span>
    )
}
