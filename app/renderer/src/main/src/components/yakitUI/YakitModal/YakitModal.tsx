import React, {CSSProperties, ReactNode} from "react"
import {Modal, ModalProps} from "antd"
import {YakitCloseSvgIcon} from "./icon"
import styles from "./yakitModal.module.scss"
import classnames from "classnames"
import {YakitButton, YakitButtonProp} from "../YakitButton"

export interface YakitModalProp extends Omit<ModalProps, "cancelButtonProps" | "okButtonProps" | "okType"> {
    cancelButtonProps?: YakitButtonProp
    okButtonProps?: YakitButtonProp
    okType?: YakitButtonProp["type"]
    /** @name 副标题 */
    subTitle?: ReactNode
    /** @name footer组件style */
    footerStyle?: CSSProperties
    /** @name footer组件左部操作区域 */
    footerExtra?: ReactNode
}

/** 可以用，但是使用的时候考虑部分属性的覆盖重写问题， */
export const YakitModal: React.FC<YakitModalProp> = (props) => {
    const {
        children,
        wrapClassName,
        title,
        closable,
        closeIcon,
        footer,
        cancelText = "取消",
        cancelButtonProps,
        okText = "确认",
        confirmLoading,
        okType,
        okButtonProps,
        onCancel,
        onOk,
        /** 自定义新增属性 ↓↓↓ */
        subTitle,
        footerStyle,
        footerExtra,
        ...resetProps
    } = props

    return (
        <Modal
            {...resetProps}
            wrapClassName={classnames(styles["yakit-modal-wrapper"], wrapClassName)}
            closable={false}
            footer={null}
        >
            <div className={styles["yakit-modal-body"]}>
                {closable && (
                    <div className={styles["body-close"]} onClick={onCancel}>
                        {!!closeIcon ? closeIcon : <YakitCloseSvgIcon />}
                    </div>
                )}
                {!!title && (
                    <div className={styles["body-header"]}>
                        {title}
                        <span className={styles["body-header-subTitle"]}>{subTitle}</span>
                    </div>
                )}
                <div className={styles["body-content"]}>{children}</div>
                {footer === null ? (
                    <></>
                ) : (
                    <div
                        style={footerStyle || {}}
                        className={!!footer ? styles["body-custom-footer"] : styles["body-footer"]}
                    >
                        {!!footer ? (
                            footer
                        ) : (
                            <>
                                <div className={styles["body-footer-extra"]}>{footerExtra || <></>}</div>
                                <div className={styles["body-footer-btn"]}>
                                    <YakitButton type='outline2' {...cancelButtonProps} onClick={onCancel}>
                                        {cancelText}
                                    </YakitButton>
                                    <YakitButton
                                        {...okButtonProps}
                                        loading={confirmLoading}
                                        type={okType}
                                        onClick={onOk}
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
