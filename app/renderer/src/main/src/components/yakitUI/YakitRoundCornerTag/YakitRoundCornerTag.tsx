import React, {useMemo} from "react"
import {YakitRoundCornerTagProps} from "./YakitRoundCornerTagType"
import classNames from "classnames"
import styles from "./YakitRoundCornerTag.module.scss"

/**
 * @name 圆角无边框-tag
 */
export const YakitRoundCornerTag: React.FC<YakitRoundCornerTagProps> = (props) => {
    const {wrapperClassName, color = "primary", children} = props

    const colorClass = useMemo(() => {
        return styles[`yakit-round-corner-tag-${color}`]
    }, [color])

    return (
        <div className={classNames(styles["yakit-round-corner-tag"], colorClass, wrapperClassName)}>
            {children || null}
        </div>
    )
}
