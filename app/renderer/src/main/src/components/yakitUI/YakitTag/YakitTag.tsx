import {InputNumber, Tag} from "antd"
import React, {useState} from "react"
import {CopyComponentsProps, YakitTagProps} from "./YakitTagType"
import styles from "./YakitTag.module.scss"
import classNames from "classnames"
import {RemoveIcon} from "@/assets/newIcon"
import {useMemoizedFn} from "ahooks"
import {CheckOutlined, CopyOutlined, LoadingOutlined} from "@ant-design/icons"
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
 */
export const YakitTag: React.FC<YakitTagProps> = (props) => {
    const {color, size, disable, className, enableCopy} = props
    const onAfterCopy = useMemoizedFn((e) => {
        if (props.onAfterCopy) props.onAfterCopy(e)
    })
    return (
        <Tag
            {...props}
            closeIcon={
                (enableCopy && <CopyComponents copyText={props.copyText || ""} onAfterCopy={onAfterCopy} />) ||
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
                    [styles["yakit-tag-disable"]]: !!disable
                },
                className
            )}
            onClose={(e) => {
                if (disable || enableCopy) return
                if (props.onClose) props.onClose(e)
            }}
        >
            {(enableCopy && props.copyText) || props.children}
        </Tag>
    )
}

export const CopyComponents: React.FC<CopyComponentsProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowSure, setIsShowSure] = useState<boolean>(false)
    const onCopy = useMemoizedFn((e) => {
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
        <div className={styles["yakit-copy"]} onClick={onCopy}>
            {(loading && <LoadingOutlined />) || (
                <>{(isShowSure && <CheckOutlined style={{color: "var(--yakit-success-5)"}} />) || <CopyOutlined />}</>
            )}
        </div>
    )
}
