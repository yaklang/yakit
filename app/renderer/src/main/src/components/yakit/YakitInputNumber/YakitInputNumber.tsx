import {InputNumber} from "antd"
import React from "react"
import {YakitInputNumberProps} from "./YakitInputNumberType"
import styles from "./YakitInputNumber.module.scss"
import classNames from "classnames"

/**
 * @description: 两种方式的数字输入
 * @augments InputNumberProps 继承antd的InputNumber默认属性
 * @param {horizontal | vertical} type  默认vertical
 */
export const YakitInputNumber: React.FC<YakitInputNumberProps> = (props) => {
    const {type, size} = props
    return (
        <InputNumber
            {...props}
            size='middle'
            className={classNames(styles["yakit-input-number"], {
                [styles["yakit-input-number-max-large"]]: size === "maxLarge",
                [styles["yakit-input-number-large"]]: size === "large",
                [styles["yakit-input-number-small"]]: size === "small"
            })}
        >
            {props.children}
        </InputNumber>
    )
}
