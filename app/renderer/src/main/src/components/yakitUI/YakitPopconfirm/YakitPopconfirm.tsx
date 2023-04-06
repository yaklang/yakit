import React, {useMemo, useState} from "react"
import {Popconfirm} from "antd"
import classNames from "classnames"
import styles from "./YakitPopconfirm.module.scss"
import {YakitPopconfirmProp} from "./YakitPopconfirmTypr"
import {YakitButton} from "../YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"

export const YakitPopconfirm: React.FC<YakitPopconfirmProp> = React.memo((props) => {
    const {
        children,
        okText,
        cancelText,
        title,
        onConfirm,
        onVisibleChange,
        onCancel,
        placement = "left",
        overlayClassName,
        ...resePopover
    } = props
    const [visible, setVisible] = useState<boolean>(false)
    const onOk = useMemoizedFn((e) => {
        setVisible(false)
        if (onConfirm) onConfirm(e)
    })

    const onCancelClick = useMemoizedFn((e) => {
        setVisible(false)
        if (onCancel) onCancel(e)
    })
    const direction = useMemo(() => {
        if (!placement) return "top"
        if (["top", "topLeft", "topRight"].includes(placement)) return "top"
        if (["left", "leftTop", "leftBottom"].includes(placement)) return "left"
        if (["right", "rightTop", "rightBottom"].includes(placement)) return "right"
        if (["bottom", "bottomLeft", "bottomRight"].includes(placement)) return "bottom"
    }, [placement])
    return (
        <Popconfirm
            visible={visible}
            {...resePopover}
            placement={placement}
            overlayClassName={classNames(
                styles["yakit-popconfirm-wrapper"],
                styles[`yakit-popconfirm-${direction}-wrapper`],
                overlayClassName
            )}
            title={
                <div className={styles["yakit-popconfirm-title"]}>
                    {title}
                    <div className={styles["yakit-popconfirm-buttons"]}>
                        <YakitButton type='outline2' onClick={onCancelClick}>
                            {cancelText || "Cancel"}
                        </YakitButton>
                        <YakitButton type='primary' onClick={onOk}>
                            {okText || "OK"}
                        </YakitButton>
                    </div>
                </div>
            }
            onVisibleChange={(v) => {
                setVisible(v)
                if (onVisibleChange) onVisibleChange(v)
            }}
        >
            {children}
        </Popconfirm>
    )
})
