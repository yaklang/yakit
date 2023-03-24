import {Segmented} from "antd"
import React from "react"
import {YakitSegmentedProps} from "./YakitSegmentedType"
import styles from "./YakitSegmented.module.scss"
import classNames from "classnames"

/**
 * 目前只有small的尺寸 height:24和antd一样
 */

/**
 * @description YakitSegmentedProps 的属性
 * @augments YakitSegmentedProps
 */
export const YakitSegmented = React.forwardRef<HTMLDivElement, YakitSegmentedProps>((props, ref) => {
    const {wrapClassName, ...resProps} = props
    return (
        <div className={classNames(styles["yakit-segmented-wrapper"], wrapClassName)}>
            <Segmented {...resProps} size='small' ref={ref} className={classNames(styles["yakit-segmented"])} />
        </div>
    )
})
