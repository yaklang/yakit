import React, {useMemo, useState} from "react"
import {Popconfirm} from "antd"
import classnames from "classnames"
import styles from "./YakitPopconfirm.module.scss"
import {YakitPopconfirmProp} from "./YakitPopconfirmTypr"
import {YakitButton} from "../YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"

export const YakitPopconfirm: React.FC<YakitPopconfirmProp> = React.memo((props) => {
    const {children, okText, cancelText, title, onConfirm, onVisibleChange, onCancel, ...resePopover} = props
    const [visible, setVisible] = useState<boolean>(false)
    const onOk = useMemoizedFn((e) => {
        setVisible(false)
        if (onConfirm) onConfirm(e)
    })

    const onCancelClick = useMemoizedFn((e) => {
        setVisible(false)
        if (onCancel) onCancel(e)
    })
    return (
        <Popconfirm
            visible={visible}
            {...resePopover}
            overlayClassName={classnames(styles["yakit-popconfirm-wrapper"])}
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
