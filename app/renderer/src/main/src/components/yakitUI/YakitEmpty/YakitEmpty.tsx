import {Empty} from "antd"
import React, {useMemo} from "react"
import {YakitEmptyProps} from "./YakitEmptyType"
import classNames from "classnames"
import styles from "./YakitEmpty.module.scss"
import EmptyPng from "./EmptyPng.png"
import DarkEmptyPng from "./DarkEmptyPng.png"
import {useTheme} from "@/hook/useTheme"

/**
 * @description:YakitEmpty
 * @augments YakitEmptyProps 继承antd的 Empty 默认属性
 */
export const YakitEmpty: React.FC<YakitEmptyProps> = (props) => {
    const {theme} = useTheme()
    const {title = "暂无数据", titleClassName, ...restProps} = props
    const emptyImageTarget = useMemo(() => {
        if (theme === "dark") {
            return DarkEmptyPng
        } else {
            return EmptyPng
        }
    }, [theme])
    return (
        <Empty
            image={<img src={emptyImageTarget} alt='' />}
            imageStyle={
                props.imageStyle
                    ? props.imageStyle
                    : {
                          height: 200,
                          width: 200,
                          margin: "24px auto"
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
