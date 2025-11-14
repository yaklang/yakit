import React, {memo, useRef, useState} from "react"
import {useDebounce, useMemoizedFn} from "ahooks"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {HintModalProps, YakitHintModalProps} from "./YakitHintType"
import {YakitButton} from "../YakitButton/YakitButton"
import {ShieldExclamationSvgIcon} from "@/assets/newIcon"

import classNames from "classnames"
import styles from "./YakitHint.module.scss"
import {Resizable} from "re-resizable"

export const YakitHintModal: React.FC<YakitHintModalProps> = memo((props) => {
    const {
        isMask,
        isDrag = false,
        visible,
        width = 448,
        isTop,
        setTop,
        wrapClassName,
        heardIcon,
        extraIcon,
        title,
        content,
        footer,
        footerExtra,
        okButtonText,
        okButtonProps,
        onOk,
        cancelButtonText,
        cancelButtonProps,
        onCancel,
        children,
        getContainer
    } = props

    return (
        <>
            <HintModal
                visible={visible}
                wrapClassName={wrapClassName}
                isTop={isTop}
                width={width}
                isMask={isMask}
                isDrag={isDrag}
                setTop={setTop}
                containerClassName={styles["container-wrapper-padding"]}
                children={
                    <>
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
                                            {cancelButtonText || "取消"}
                                        </YakitButton>
                                        <YakitButton
                                            size='max'
                                            {...okButtonProps}
                                            onClick={() => {
                                                if (onOk) onOk()
                                            }}
                                        >
                                            {okButtonText || "确定"}
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                }
                getContainer={getContainer}
            />
        </>
    )
})

export const HintModal: React.FC<HintModalProps> = memo((props) => {
    const {
        visible,
        wrapClassName,
        containerClassName,
        isTop,
        width,
        isMask,
        isDrag,
        setTop,
        children,
        isResize,
        resizeMinWidth,
        resizeMinWHeight,
        getContainer
    } = props
    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const debouncedBounds = useDebounce(bounds, {wait: 500})
    const draggleRef = useRef<HTMLDivElement>(null)
    /** 弹窗拖拽移动触发事件 */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        let containerRect
        if (getContainer) {
            containerRect = getContainer.getBoundingClientRect()
        } else {
            containerRect = window.document.documentElement.getBoundingClientRect()
        }
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return
        setBounds({
            left: containerRect.left - targetRect.left + uiData.x,
            right: containerRect.right - targetRect.right + uiData.x,
            top: containerRect.top - targetRect.top + uiData.y,
            bottom: containerRect.bottom - targetRect.bottom + uiData.y
        })
    })

    const getContent = useMemoizedFn(() => {
        return (
            <div
                className={classNames(styles["yakit-hint-modal-container"], {
                    [styles["yakit-hint-modal-container-box-shadow"]]: !isMask,
                    [styles["yakit-hint-modal-container-resize"]]: isResize
                })}
                onClick={() => {
                    if (!isTop && setTop) setTop()
                }}
            >
                <div
                    className={classNames(
                        styles["container-wrapper"],
                        {
                            [styles["container-wrapper-resize"]]: isResize
                        },
                        containerClassName
                    )}
                >
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
                    />
                    {children}
                </div>
            </div>
        )
    })

    return (
        <Draggable
            defaultClassName={classNames(
                {
                    [styles["yakit-hint-modal-top"]]: isTop,
                    [styles["yakit-hint-modal-wrapper"]]: visible && !isResize,
                    [styles["yakit-hint-modal-resize-wrapper"]]: visible && isResize,
                    [styles["yakit-hint-modal-hidden"]]: !visible,
                    [styles["yakit-hint-modal-resize"]]: isResize
                },
                wrapClassName
            )}
            disabled={disabled}
            bounds={debouncedBounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div
                style={!isResize ? {width: width || 448} : undefined}
                ref={draggleRef}
                onClick={(e) => e.stopPropagation()}
            >
                {isResize ? (
                    <Resizable
                        defaultSize={{width: width || 400, height: 400}}
                        minWidth={resizeMinWidth || 256}
                        minHeight={resizeMinWHeight || 176}
                        bounds={"window"}
                        enable={{
                            top: false,
                            right: true,
                            bottom: true,
                            left: false,
                            topRight: false,
                            bottomRight: true,
                            bottomLeft: false,
                            topLeft: false
                        }}
                    >
                        {getContent()}
                    </Resizable>
                ) : (
                    getContent()
                )}
            </div>
        </Draggable>
    )
})
