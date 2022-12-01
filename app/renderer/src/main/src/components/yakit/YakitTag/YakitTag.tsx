import {InputNumber, Tag} from "antd"
import React from "react"
import {YakitTagProps} from "./YakitTagType"
import styles from "./YakitTag.module.scss"
import classNames from "classnames"
import {RemoveIcon} from "@/assets/newIcon"

/**
 * @description: tag
 * @augments TagProps 继承antd的TagProps默认属性
 * @param {middle|large|small} size 默认middle
 * @param {"danger" | "info" | "success" | "warning" | "purple" | "blue" | "cyan" | "bluePurple"} color 颜色
 */
export const YakitTag: React.FC<YakitTagProps> = (props) => {
    const {color, size, className} = props
    return (
        <Tag
            closeIcon={<RemoveIcon />}
            {...props}
            className={classNames(styles["yakit-tag-middle"], {
                [styles["yakit-tag-small"]]: size === "small",
                [styles["yakit-tag-large"]]: size === "large",
                [styles["yakit-tag-danger"]]: color === "danger",
                [styles["yakit-tag-info"]]: color === "info",
                [styles["yakit-tag-success"]]: color === "success",
                [styles["yakit-tag-warning"]]: color === "warning",
                [styles["yakit-tag-purple"]]: color === "purple",
                [styles["yakit-tag-blue"]]: color === "blue",
                [styles["yakit-tag-cyan"]]: color === "cyan",
                [styles["yakit-tag-bluePurple"]]: color === "bluePurple",
                className
            })}
        >
            {props.children}
        </Tag>
    )
}
