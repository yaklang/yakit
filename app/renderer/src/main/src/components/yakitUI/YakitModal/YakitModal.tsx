import React, {CSSProperties, ReactNode, useMemo} from "react"
import {Modal, ModalProps} from "antd"
import {YakitButton, YakitButtonProp} from "../YakitButton/YakitButton"
import {OutlineXIcon} from "@/assets/icon/outline"
import classNames from "classnames"

import styles from "./yakitModal.module.scss"

export interface YakitModalProp extends Omit<ModalProps, "style" | "cancelButtonProps" | "okButtonProps" | "okType"> {
    headerStyle?: CSSProperties
    footerStyle?: CSSProperties

    cancelButtonProps?: YakitButtonProp
    okButtonProps?: YakitButtonProp
    okType?: YakitButtonProp["type"]

    /** @name 副标题 */
    subTitle?: ReactNode
    /** @name footer组件左侧操作区域 */
    footerExtra?: ReactNode
    /** 弹框类型 */
    type?: "gray" | "white"
    /** @name 弹框的尺寸 */
    size?: "small" | "large"
    /**
     * @name 隐藏Header元素
     * @description 设为true时, headerStyle|title|subTitle|closable|closeIcon都将无效
     */
    hiddenHeader?: boolean
}

/** 可以用，但是使用的时候考虑部分属性的覆盖重写问题， */
export const YakitModal: React.FC<YakitModalProp> = (props) => {
    const {
        children,
        /** 样式属性 ↓↓↓ */
        wrapClassName,
        headerStyle,
        bodyStyle,
        footerStyle,
        /** 原有属性 ↓↓↓ */
        closable = true,
        closeIcon,
        title,
        footer,
        cancelButtonProps,
        cancelText = "取消",
        okButtonProps,
        confirmLoading,
        okText = "确认",
        okType,
        onCancel,
        onOk,
        /** 自定义新增属性 ↓↓↓ */
        type = "gray",
        size = "small",
        subTitle,
        footerExtra,
        hiddenHeader = false,
        ...resetProps
    } = props

    const typeClass = useMemo(() => {
        if (type === "white") return styles["yakit-modal-white"]
        return styles["yakit-modal-gray"]
    }, [type])
    const sizeClass = useMemo(() => {
        if (size === "large") return styles["yakit-modal-large"]
        return styles["yakit-modal-small"]
    }, [size])

    return (
        <Modal
            {...resetProps}
            wrapClassName={classNames(styles["yakit-modal-wrapper"], typeClass, sizeClass, wrapClassName)}
            closable={false}
            footer={null}
            onCancel={onCancel}
        >
            <div className={styles["yakit-modal-body"]}>
                {!hiddenHeader && (
                    <div style={headerStyle || undefined} className={styles["header-body"]}>
                        {!!title && (
                            <div className={styles["title-wrapper"]}>
                                {title}
                                <div className={styles["subtitle-style"]}>{subTitle}</div>
                            </div>
                        )}
                        {closable && (
                            <YakitButton
                                type='text2'
                                size={size === "large" ? "large" : "middle"}
                                icon={!!closeIcon ? closeIcon : <OutlineXIcon />}
                                onClick={onCancel}
                            />
                        )}
                    </div>
                )}

                <div style={bodyStyle || undefined} className={styles["content-body"]}>
                    {children}
                </div>

                {footer === null ? null : (
                    <div style={footerStyle || undefined} className={styles["footer-body"]}>
                        {!!footer ? (
                            footer
                        ) : (
                            <>
                                <div className={styles["footer-extra"]}>{footerExtra || null}</div>
                                <div className={styles["footer-btn-group"]}>
                                    <YakitButton
                                        size={size === "large" ? "large" : "middle"}
                                        type='outline2'
                                        onClick={onCancel}
                                        {...cancelButtonProps}
                                    >
                                        {cancelText}
                                    </YakitButton>
                                    <YakitButton
                                        loading={confirmLoading}
                                        size={size === "large" ? "large" : "middle"}
                                        type={okType}
                                        onClick={onOk}
                                        {...okButtonProps}
                                    >
                                        {okText}
                                    </YakitButton>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
}
