import {Input} from "antd"
import React from "react"
import {YakitInputProps} from "./YakitInputType"
import styles from "./YakitInput.module.scss"
import classNames from "classnames"

/**
 * @description: 两种方式的数字输入
 * @augments InputProps 继承antd的Input默认属性
 */
export const YakitInput: React.FC<YakitInputProps> = (props) => {
    const {size, wrapperClassName, className, ...restProps} = props
    return (
        <div
            className={classNames(
                styles["yakit-input-wrapper"],
                {
                    [styles["yakit-input-disabled"]]: !!props.disabled
                },
                wrapperClassName
            )}
        >
            <Input
                {...restProps}
                size='middle'
                className={classNames(styles["yakit-input-middle"], {
                    [styles["yakit-input-large"]]: size === "large",
                    [styles["yakit-input-small"]]: size === "small",
                    className
                })}
            >
                {props.children}
            </Input>
        </div>
    )
}
