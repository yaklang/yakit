import React from "react"

import styles from "./yakitEllipsis.module.scss"

export interface YakitEllipsisProp {
    text: string
    width?: number
}
/**
 * 缺陷较大，暂不建议频繁使用
 */
export const YakitEllipsis: React.FC<YakitEllipsisProp> = (props) => {
    const {text, width = 260} = props

    return (
        <span style={{width: width}} className={styles["yakit-ellipsis-wrapper"]} title={text}>
            {text}
        </span>
    )
}
