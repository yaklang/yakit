import {Input, InputRef} from "antd"
import React, {useState} from "react"
import {YakitInputSearchProps, YakitInputProps} from "./YakitInputType"
import styles from "./YakitInput.module.scss"
import classNames from "classnames"
import {YakitButton} from "../YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
 * 3.增加搜索组件，两种样式中的一种，另外一种未完成
 */


/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
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

const InternalSearch: React.FC<YakitInputSearchProps> = (props) => {
    const {size, wrapperClassName, className, style, ...restProps} = props
    const [focus, setFocus] = useState<boolean>(false)
    const onFocus = useMemoizedFn((e) => {
        setFocus(true)
        if (props.onFocus) props.onFocus(e)
    })
    const onBlur = useMemoizedFn((e) => {
        setFocus(false)
        if (props.onBlur) props.onBlur(e)
    })
    return (
        <div
            className={classNames(
                styles["yakit-search-wrapper"],
                {
                    [styles["yakit-search-wrapper-large"]]: size === "large",
                    [styles["yakit-search-wrapper-small"]]: size === "small",
                    [styles["yakit-search-wrapper-focus"]]: focus,
                    [styles["yakit-search-disabled"]]: !!props.disabled
                },
                wrapperClassName
            )}
            style={style}
        >
            <Input.Search
                {...restProps}
                onFocus={onFocus}
                onBlur={onBlur}
                size='middle'
                enterButton
                className={classNames(styles["yakit-search-middle"], {
                    [styles["yakit-search-large"]]: size === "large",
                    [styles["yakit-search-small"]]: size === "small",
                    className
                })}
            />
        </div>
    )
}

type CompoundedComponent = React.ForwardRefExoticComponent<YakitInputProps & React.RefAttributes<InputRef>> & {
    Group: typeof Input.Group
    Search: typeof InternalSearch
    TextArea: typeof Input.TextArea
    Password: typeof Input.Password
}

/**
 * @description: 输入
 * @augments InputProps 继承antd的Input默认属性
 */
export const YakitInput = InternalInput as CompoundedComponent

YakitInput.Group = Input.Group
YakitInput.Search = InternalSearch
YakitInput.TextArea = Input.TextArea
YakitInput.Password = Input.Password
