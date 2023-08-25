import React, {CSSProperties, ReactNode} from "react"

import styles from "./YakitCard.module.scss"
import classNames from "classnames"
import {YakitCardProps} from "./YakitCardType"

export const YakitCard: React.FC<YakitCardProps> = (props) => {
    const {title, extra, className, style, headStyle, bodyStyle, headClassName, bodyClassName, bordered} = props

    return (
        <div
            className={classNames(
                styles["yakit-card"],
                {
                    [styles["yakit-card-bordered-hidden"]]: bordered === false
                },
                className
            )}
            style={{...style}}
        >
            <div className={classNames(styles["yakit-card-heard"], headClassName)} style={{...headStyle}}>
                <div className={styles["yakit-card-heard-title"]}>{title}</div>
                <div className={styles["yakit-card-heard-extra"]}>{extra}</div>
            </div>
            <div className={classNames(styles["yakit-card-heard-body"], bodyClassName)} style={{...bodyStyle}}>
                {props.children}
            </div>
        </div>
    )
}
