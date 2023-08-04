import {Collapse} from "antd"
import React, {useState} from "react"
import styles from "./YakitCollapse.module.scss"
import classNames from "classnames"
import {YakitCollapseProps} from "./YakitCollapseType"
import {SolidChevrondownIcon, SolidChevronrightIcon} from "@/assets/icon/solid"

const {Panel} = Collapse

/**
 * @description: 折叠面板
 * @augments  继承antd的 CollapseProps 默认属性
 * @param {string} wrapperClassName Collapse 装饰div的className
 * @param {CSSProperties} wrapperStyle Collapse 装饰div的style
 */
export const YakitCollapse: React.FC<YakitCollapseProps> = (props) => {
    const {type = "default", wrapperClassName, wrapperStyle, ...restProps} = props
    return (
        <div
            className={classNames(
                styles["yakit-collapse-default-wrapper"],
                {
                    [styles["yakit-collapse-grey-wrapper"]]: type === "grey"
                },
                wrapperClassName
            )}
            style={wrapperStyle}
        >
            <Collapse
                {...restProps}
                ghost
                expandIcon={(e) => (e.isActive ? <SolidChevrondownIcon /> : <SolidChevronrightIcon />)}
            />
        </div>
    )
}

export default Object.assign(YakitCollapse, {YakitPanel: Panel})
