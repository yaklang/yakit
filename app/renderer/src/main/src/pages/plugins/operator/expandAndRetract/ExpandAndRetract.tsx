import React, {MouseEventHandler, ReactNode} from "react"
import styles from "./ExpandAndRetract.module.scss"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"
import classNames from "classnames"

interface ExpandAndRetractProps {
    onExpand: MouseEventHandler<HTMLDivElement>
    isExpand: boolean
    children?: ReactNode
    className?: string
}
export const ExpandAndRetract: React.FC<ExpandAndRetractProps> = React.memo((props) => {
    const {isExpand, onExpand, children, className = ""} = props
    return (
        <div className={classNames(styles["expand-and-retract-header"], className)} onClick={onExpand}>
            <div className={styles["expand-and-retract-header-icon-body"]}>
                {isExpand ? (
                    <>
                        <OutlineChevrondoubleupIcon />
                        <span className={styles["expand-and-retract-header-icon-text"]}>
                            <span style={{marginLeft: 4}} />
                            收起参数
                        </span>
                    </>
                ) : (
                    <>
                        <OutlineChevrondoubledownIcon />
                        <span className={styles["expand-and-retract-header-icon-text"]}>
                            <span style={{marginLeft: 4}} />
                            展开参数
                        </span>
                    </>
                )}
            </div>
            {children}
        </div>
    )
})
