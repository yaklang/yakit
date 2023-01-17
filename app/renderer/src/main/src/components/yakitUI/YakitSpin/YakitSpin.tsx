import {AutoComplete, Spin} from "antd"
import React, {useState} from "react"
import {YakitSpinProps} from "./YakitSpinType"
import styles from "./YakitSpin.module.scss"
import classNames from "classnames"

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
 */

/**
 * @description YakitSpinProps 的属性
 * @augments YakitSpinProps 继承antd的 SpinProps 默认属性
 * @param {"small" | "middle" | "large" } size  默认middle
 */
export const YakitSpin: React.FC<YakitSpinProps> = (props) => {
    return <Spin {...props} className={classNames(styles["yakit-spin"], props.className)}></Spin>
}
