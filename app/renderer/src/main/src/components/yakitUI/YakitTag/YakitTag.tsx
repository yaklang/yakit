import {Tag} from "antd"
import React, {useState} from "react"
import {CopyComponentsProps, YakitTagProps} from "./YakitTagType"
import styles from "./YakitTag.module.scss"
import classNames from "classnames"
import {DocumentDuplicateSvgIcon, RemoveIcon} from "@/assets/newIcon"
import {useMemoizedFn} from "ahooks"
import {CheckOutlined, LoadingOutlined} from "@ant-design/icons"
import {success} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

/**
 * 更新说明
 * 1、关闭按钮增加hover主题色
 * 2.height 修为不加border
 */

/**
 * @description: tag
 * @augments TagProps 继承antd的TagProps默认属性
 * @param {middle|large|small} size 默认middle 16 20 24
 * @param {"danger" | "info" | "success" | "warning" | "purple" | "blue" | "cyan" | "bluePurple"} color 颜色
 * @param {boolean} disable
 * @param {boolean} enableCopy 是否可复制
 * @param {e} onAfterCopy 复制后的回调
 */
export const YakitTag: React.FC<YakitTagProps> = (props) => {
    const {color, size, disable, className, enableCopy, iconColor, copyText, ...restProps} = props
    const onAfterCopy = useMemoizedFn((e) => {
        if (props.onAfterCopy) props.onAfterCopy(e)
    })
    return (
        <Tag
            {...restProps}
            closeIcon={
                (enableCopy && (
                    <CopyComponents copyText={copyText || ""} onAfterCopy={onAfterCopy} iconColor={iconColor} />
                )) ||
                props.closeIcon || <RemoveIcon />
            }
            closable={props.closable || enableCopy}
            className={classNames(
                styles["yakit-tag-middle"],
                {
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
                    [styles["yakit-tag-white"]]: color === "white",
                    [styles["yakit-tag-disable"]]: !!disable
                },
                className
            )}
            onClose={(e) => {
                if (disable || enableCopy) return
                if (props.onClose) props.onClose(e)
            }}
        >
            {(enableCopy && copyText) || props.children}
        </Tag>
    )
}

export const CopyComponents: React.FC<CopyComponentsProps> = (props) => {
    const {className, iconColor} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowSure, setIsShowSure] = useState<boolean>(false)
    const onCopy = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!props.copyText) return
        setLoading(true)
        ipcRenderer.invoke("set-copy-clipboard", props.copyText)
        setTimeout(() => {
            setLoading(false)
            setIsShowSure(true)
            setTimeout(() => {
                setIsShowSure(false)
            }, 2000)
            success("复制成功")
        }, 1000)
        if (props.onAfterCopy) props.onAfterCopy(e)
    })
    return (
        <div className={classNames(styles["yakit-copy"], className || "")} onClick={onCopy}>
            {(loading && <LoadingOutlined />) || (
                <>
                    {(isShowSure && <CheckOutlined style={{color: "var(--yakit-success-5)"}} />) || (
                        <DocumentDuplicateSvgIcon style={{color: iconColor || "var(--yakit-primary-5)"}} />
                    )}
                </>
            )}
        </div>
    )
}
