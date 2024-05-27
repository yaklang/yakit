import {Empty} from "antd"
import React from "react"
import {YakitEmptyProps} from "./YakitEmptyType"
import classNames from "classnames"
import styles from "./YakitEmpty.module.scss"
import EmptyPng from "./empty.png"

/**
 * @description:YakitEmpty
 * @augments YakitEmptyProps 继承antd的 Empty 默认属性
 */
export const YakitEmpty: React.FC<YakitEmptyProps> = (props) => {
    const {title = "暂无数据", titleClassName, ...restProps} = props
    return (
        <Empty
            image={<img src={EmptyPng} alt='' />}
            imageStyle={
                props.imageStyle
                    ? props.imageStyle
                    : {
                          height: 160,
                          width: 160,
                          margin: "auto",
                          marginBottom: 24
                      }
            }
            {...restProps}
            description={
                props.descriptionReactNode ? (
                    props.descriptionReactNode
                ) : (
                    <div className={styles["yakit-empty"]}>
                        <div className={classNames(styles["yakit-empty-title"], titleClassName)}>{title}</div>
                        <div className={styles["yakit-empty-description"]}>{props.description}</div>
                    </div>
                )
            }
        >
            {props.children}
        </Empty>
    )
}
