import React from "react"
import { Card, CardProps } from "antd"

import "./AutoCard.css"

export interface AutoCardProps extends CardProps {
    style?: React.CSSProperties
    children?: React.ReactNode
}

export const AutoCard: React.FC<AutoCardProps> = (props) => {
    const { style, children, bodyStyle, ...rest } = props

    return (
        <Card {...rest} style={{ ...style, width: "100%", height: "100%", display: "flex", flexFlow: "column" }} bodyStyle={{ ...bodyStyle, flexGrow: 1 }}>
            {children}
        </Card>
    )
}
