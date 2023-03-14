import React, {memo, useRef, useState} from "react"
import {useDebounce, useMemoizedFn} from "ahooks"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {YakitHintModalProps} from "./YakitHintType"
import {ShieldExclamationSvgIcon} from "@/assets/newIcon"
import {YakitButton} from "../YakitButton/YakitButton"

import classnames from "classnames"
import styles from "./YakitHint.module.scss"

export const YakitHintModal: React.FC<YakitHintModalProps> = memo((props) => {
    const {
        isDrag = false,
        visible,
        width = 448,
        isTop,
        setTop,
        wrapClassName,
        heardIcon,
        extraIcon,
        title,
        content = "请写入合适的提示内容",
        footer,
        footerExtra,
        okButtonText = "确定",
        okButtonProps,
        onOk,
        cancelButtonText = "取消",
        cancelButtonProps,
        onCancel,
        children
    } = props

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const debouncedBounds = useDebounce(bounds, {wait: 500})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 弹窗拖拽移动触发事件 */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    return (
        <Draggable
            defaultClassName={classnames(
                visible ? styles["yakit-hint-modal-wrapper"] : styles["yakit-hint-modal-hidden"],
                {[styles["yakit-hint-modal-top"]]: isTop},
                wrapClassName
            )}
            disabled={disabled}
            bounds={debouncedBounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div style={{width: width || 448}} ref={draggleRef}>
                <div
                    className={styles["yakit-hint-modal-container"]}
                    onClick={() => {
                        if (!isTop && setTop) setTop()
                    }}
                >
                    <div className={styles["container-wrapper"]}>
                        <div
                            className={styles["container-draggle"]}
                            onMouseEnter={() => {
                                if (isDrag && disabled) setDisabled(false)
                            }}
                            onMouseLeave={() => {
                                if (isDrag && !disabled) setDisabled(true)
                            }}
                            onMouseDown={() => {
                                if (!isTop && setTop) setTop()
                            }}
                        ></div>

                        <div className={styles["container-left-wrapper"]}>
                            <div className={styles["left-hint-icon"]}>
                                {heardIcon ? heardIcon : <ShieldExclamationSvgIcon />}
                            </div>
                            <div className={styles["left-hint-icon-extra"]}>{extraIcon}</div>
                        </div>

                        <div className={styles["container-right-wrapper"]}>
                            {!!title && <div className={styles["right-title"]}>{title}</div>}

                            <div className={styles["right-content"]}>
                                {children ? children : <div className={styles["default-content"]}>{content}</div>}
                            </div>

                            {footer ? (
                                footer
                            ) : footer === null ? (
                                <></>
                            ) : (
                                <div className={styles["right-btn"]}>
                                    <div className={styles["btn-extra"]}>{footerExtra || <></>}</div>
                                    <div className={styles["btn-group-wrapper"]}>
                                        <YakitButton
                                            size='max'
                                            type='outline2'
                                            {...cancelButtonProps}
                                            onClick={() => {
                                                if (onCancel) onCancel()
                                            }}
                                        >
                                            {cancelButtonText}
                                        </YakitButton>
                                        <YakitButton
                                            size='max'
                                            {...okButtonProps}
                                            onClick={() => {
                                                if (onOk) onOk()
                                            }}
                                        >
                                            {okButtonText}
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    )
})
