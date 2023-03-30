import React, {useMemo} from "react"
import {Popover, PopoverProps} from "antd"

import classNames from "classnames"
import styles from "./yakitPopover.module.scss"

export interface YakitPopoverProp extends PopoverProps {}

export const YakitPopover: React.FC<YakitPopoverProp> = React.memo((props) => {
    const {children, overlayClassName, placement, ...resePopover} = props

    const direction = useMemo(() => {
        if (!placement) return "top"
        if (["top", "topLeft", "topRight"].includes(placement)) return "top"
        if (["left", "leftTop", "leftBottom"].includes(placement)) return "left"
        if (["right", "rightTop", "rightBottom"].includes(placement)) return "right"
        if (["bottom", "bottomLeft", "bottomRight"].includes(placement)) return "bottom"
    }, [placement])

    return (
        <Popover
            {...resePopover}
            overlayClassName={classNames(styles[`yakit-popover-${direction}-wrapper`], {
                [overlayClassName || ""]: !!overlayClassName
            })}
            placement={placement}
        >
            {children}
        </Popover>
    )
})
