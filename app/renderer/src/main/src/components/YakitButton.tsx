import React, {useMemo} from "react"
import {Button, ButtonProps} from "antd"

import classnames from "classnames"
import styles from "./yakitButton.module.scss"

type buttsd = Omit<ButtonProps, "size">
type buttsds = Omit<buttsd, "type">

export interface YakitPopoverProp extends buttsds {
    type?: "" | "123"
    size?: "big" | "small"
}

export const YakitPopover: React.FC<YakitPopoverProp> = React.memo((props) => {
    const {size, type, children, ...resePopover} = props

    return <Button>{children}</Button>
})
