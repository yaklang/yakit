import React from "react"
import { Spin, SpinProps } from "antd"

import "./style.css"

export interface AutoSpinProps extends SpinProps {
    children?: React.ReactNode
}

export const AutoSpin: React.FC<AutoSpinProps> = (props) => {
    const { children, wrapperClassName, ...rest } = props

    return (
        <Spin {...rest} wrapperClassName={`auto-antd-spin ${wrapperClassName || ""}`}>
            {children}
        </Spin>
    )
}
