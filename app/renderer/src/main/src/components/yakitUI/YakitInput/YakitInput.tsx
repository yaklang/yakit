import {Input, InputRef} from "antd"
import React, {useState} from "react"
import {
    YakitInputSearchProps,
    YakitInputProps,
    InternalTextAreaProps,
    InternalInputPasswordProps
} from "./YakitInputType"
import styles from "./YakitInput.module.scss"
import classNames from "classnames"
import {YakitButton} from "../YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import {ResizerIcon} from "@/assets/newIcon"


/**
 * @description: 输入
 * @augments InputProps 继承antd的Input默认属性
 */
const InternalInput: React.FC<YakitInputProps> = (props) => {
    const {size, wrapperClassName, className, wrapperStyle, ...restProps} = props
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
            style={{...(wrapperStyle || {})}}
        >
            <Input
                {...restProps}
                size='middle'
                spellCheck={false}
                className={classNames(
                    styles["yakit-input-middle"],
                    {
                        [styles["yakit-input-large"]]: size === "large",
                        [styles["yakit-input-small"]]: size === "small"
                    },
                    className
                )}
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
                    [styles["yakit-search-wrapper-maxLarge"]]: size === "maxLarge",
                    [styles["yakit-search-wrapper-focus"]]: focus,
                    [styles["yakit-search-disabled"]]: !!props.disabled
                },
                wrapperClassName
            )}
            style={style}
        >
            <Input.Search
                allowClear
                {...restProps}
                onFocus={onFocus}
                onBlur={onBlur}
                size='middle'
                enterButton
                spellCheck={false}
                className={classNames(styles["yakit-search-middle"], {
                    [styles["yakit-search-large"]]: size === "large",
                    [styles["yakit-search-small"]]: size === "small",
                    [styles["yakit-search-maxLarge"]]: size === "maxLarge",
                    className
                })}
            />
        </div>
    )
}

const InternalTextArea: React.FC<InternalTextAreaProps> = (props) => {
    const {wrapperClassName, style, isShowResize = true, ...restProps} = props
    return (
        <div
            className={classNames(
                styles["yakit-textArea-wrapper"],
                {
                    [styles["yakit-textArea-disabled"]]: !!props.disabled
                },
                wrapperClassName
            )}
            style={style}
        >
            <Input.TextArea {...restProps} spellCheck={false}
            />
            {isShowResize && <ResizerIcon className={styles["resizer-icon"]} />}
        </div>
    )
}

const InternalInputPassword: React.FC<InternalInputPasswordProps> = (props) => {
    const {wrapperClassName, style, size, className, ...restProps} = props
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
                styles["yakit-password-wrapper-middle"],
                {
                    [styles["yakit-password-large"]]: size === "large",
                    [styles["yakit-password-small"]]: size === "small",
                    [styles["yakit-password-maxLarge"]]: size === "maxLarge",
                    [styles["yakit-password-disabled"]]: !!props.disabled
                },
                wrapperClassName
            )}
            style={style}
        >
            <Input.Password
                {...restProps}
                onFocus={onFocus}
                onBlur={onBlur}
                spellCheck={false}
            />
        </div>
    )
}

type CompoundedComponent = React.ForwardRefExoticComponent<YakitInputProps & React.RefAttributes<InputRef>> & {
    Group: typeof Input.Group
    Search: typeof InternalSearch
    TextArea: typeof InternalTextArea
    Password: typeof InternalInputPassword
}

/**
 * @description: 输入
 * @augments InputProps 继承antd的Input默认属性
 */
export const YakitInput = InternalInput as CompoundedComponent

YakitInput.Group = Input.Group
YakitInput.Search = InternalSearch
YakitInput.TextArea = InternalTextArea
YakitInput.Password = InternalInputPassword
