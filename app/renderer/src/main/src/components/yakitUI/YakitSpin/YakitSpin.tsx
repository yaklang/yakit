import {Spin} from "antd"
import React from "react"
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
 */
export const YakitSpin: React.FC<YakitSpinProps> = (props) => {
    return (
        <Spin
            {...props}
            className={styles["yakit-spin"]}
            wrapperClassName={classNames(styles["yakit-spin"], props.wrapperClassName)}
        ></Spin>
    )
}
