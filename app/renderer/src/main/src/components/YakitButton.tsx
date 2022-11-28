import React, {useMemo} from "react"
import {Button, ButtonProps} from "antd"

import classnames from "classnames"
import styles from "./yakitButton.module.scss"

type RemoveSizeButton = Omit<ButtonProps, "size">
type RemoveTypeButton = Omit<RemoveSizeButton, "type">

export interface YakitButtonProp extends RemoveTypeButton {
    type?: "danger"
    size?: "big" | "small"
}

export const YakitButton: React.FC<YakitButtonProp> = React.memo((props) => {
    const {size, type, children, ...resePopover} = props

    const typeClass = useMemo(() => {
        return "yakit-button-primary"
    }, [type])

    const sizeClass = useMemo(() => {
        if (!size) return "yakit-button-size"
        if (size === "big") return "yakit-button-big-size"
        if (size === "small") return "yakit-button-small-size"
        return ""
    }, [size])

    return (
        <div className={classnames(styles["yakit-button-wrapper"], styles[typeClass])}>
            <Button {...resePopover} className={classnames(styles[sizeClass], styles["yakit-button-type"])}>
                {children}
            </Button>
        </div>
    )
})
