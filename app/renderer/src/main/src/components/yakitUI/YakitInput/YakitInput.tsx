import {Input, InputRef} from "antd"
import React from "react"
import {YakitInputProps} from "./YakitInputType"
import styles from "./YakitInput.module.scss"
import classNames from "classnames"
import {EDITION_STATUS, getJuageEnvFile} from "@/utils/envfile"

const IsNewUI: boolean = EDITION_STATUS.IS_NEW_UI === getJuageEnvFile()

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 */


/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
 */

/**
 * @description: 输入
 * @augments InputProps 继承antd的Input默认属性
 */
const InternalInput: React.FC<YakitInputProps> = (props) => {
    const {size, wrapperClassName, className, ...restProps} = props
    return (
        <div
            className={classNames(
                styles["yakit-input-wrapper"],
                {
                    [styles["yakit-input-wrapper-item-newUI"]]: IsNewUI,
                    [styles["yakit-input-wrapper-item-oldUI"]]: !IsNewUI,
                    [styles["yakit-input-wrapper-large"]]: size === "large",
                    [styles["yakit-input-wrapper-small"]]: size === "small",
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

type CompoundedComponent = React.ForwardRefExoticComponent<YakitInputProps & React.RefAttributes<InputRef>> & {
    Group: typeof Input.Group
    Search: typeof Input.Search
    TextArea: typeof Input.TextArea
    Password: typeof Input.Password
}

/**
 * @description: 输入
 * @augments InputProps 继承antd的Input默认属性
 */
export const YakitInput = InternalInput as CompoundedComponent

YakitInput.Group = Input.Group
YakitInput.Search = Input.Search
YakitInput.TextArea = Input.TextArea
YakitInput.Password = Input.Password
