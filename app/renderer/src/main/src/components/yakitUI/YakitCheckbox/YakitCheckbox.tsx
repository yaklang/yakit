import {Checkbox} from "antd"
import React from "react"
import {YakitCheckboxProps} from "./YakitCheckboxType"
import styles from "./YakitCheckbox.module.scss"
import classNames from "classnames"

/**
 * @description: 两种方式的数字输入
 * @augments CheckboxProps 继承antd的CheckboxProps默认属性
 */
export const YakitCheckbox: React.FC<YakitCheckboxProps> = (props) => {
    // const {} = props
    return (
        <span className={classNames(styles["yakit-checkbox-wrapper"])}>
            {(props.children && <Checkbox {...props}>{props.children}</Checkbox>) || <Checkbox {...props} />}
        </span>
    )
}
