import {Checkbox} from "antd"
import React from "react"
import {YakitCheckboxProps} from "./YakitCheckboxType"
import styles from "./YakitCheckbox.module.scss"
import classNames from "classnames"
import "./yakitCheckBoxAnimation.scss"

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
 */

/**
 * @description: 两种方式的数字输入
 * @augments CheckboxProps 继承antd的CheckboxProps默认属性
 * @param {string} wrapperClassName  
 */
export const YakitCheckbox: React.FC<YakitCheckboxProps> = (props) => {
    const {wrapperClassName} = props
    return (
        <span className={classNames(styles["yakit-checkbox-wrapper"],wrapperClassName)}>
            {(props.children && <Checkbox {...props}>{props.children}</Checkbox>) || <Checkbox {...props} />}
        </span>
    )
}
