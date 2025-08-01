import React from "react"
import {Card, CardProps} from "antd"

import styles from "./AutoCard.module.scss"

export interface AutoCardProps extends CardProps {
    style?: React.CSSProperties
    children?: React.ReactNode
}

export const AutoCard: React.FC<AutoCardProps> = (props) => {
    const {style, children, bodyStyle, ...rest} = props

    return (
        <Card
            {...rest}
            className={styles["yakit-autoCard-wrap"]}
            style={{width: "100%", height: "100%", display: "flex", flexFlow: "column", ...style}}
            bodyStyle={{...bodyStyle, flex: 1}}
        >
            {children}
        </Card>
    )
}
