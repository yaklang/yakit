import {Input, InputRef} from "antd"
import React, {forwardRef, useState} from "react"
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
import {TextAreaRef} from "antd/lib/input/TextArea"

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
 * 3.增加搜索组件，两种样式中的一种，另外一种未完成
 * 4.增加文本域
 */

/**
 * @description: 输入
 * @augments InputProps 继承antd的Input默认属性
 */
const InternalInput: React.FC<YakitInputProps & React.RefAttributes<InputRef>> = forwardRef(
    (props, ref: React.Ref<InputRef>) => {
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
                    spellCheck={false}
                    {...restProps}
                    ref={ref}
                    size='middle'
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
)

const InternalSearch: React.FC<YakitInputSearchProps & React.RefAttributes<InputRef>> = forwardRef(
    (props, ref: React.Ref<InputRef>) => {
        const {size, wrapperClassName, className, wrapperStyle, ...restProps} = props
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
                style={{...(wrapperStyle || {})}}
            >
                <Input.Search
                    allowClear
                    enterButton
                    spellCheck={false}
                    {...restProps}
                    ref={ref}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    size='middle'
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
)

const InternalTextArea: React.FC<InternalTextAreaProps & React.RefAttributes<TextAreaRef>> = forwardRef(
    (props, ref: React.Ref<TextAreaRef>) => {
        const {wrapperClassName, wrapperStyle, isShowResize = true, ...restProps} = props
        return (
            <div
                className={classNames(
                    styles["yakit-textArea-wrapper"],
                    {
                        [styles["yakit-textArea-disabled"]]: !!props.disabled,
                        [styles["yakit-textArea-resize-hide"]]: !isShowResize
                    },
                    wrapperClassName
                )}
                style={{...(wrapperStyle || {})}}
            >
                <Input.TextArea spellCheck={false} {...restProps} ref={ref} />
                {isShowResize && <ResizerIcon className={styles["resizer-icon"]} />}
            </div>
        )
    }
)

const InternalInputPassword: React.FC<InternalInputPasswordProps & React.RefAttributes<InputRef>> = forwardRef(
    (props, ref: React.Ref<InputRef>) => {
        const {wrapperClassName, wrapperStyle, size, className, ...restProps} = props
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
                style={{...(wrapperStyle || {})}}
            >
                <Input.Password spellCheck={false} {...restProps} ref={ref} />
            </div>
        )
    }
)

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
