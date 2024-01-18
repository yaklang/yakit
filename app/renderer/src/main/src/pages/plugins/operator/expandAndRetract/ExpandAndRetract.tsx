import React, {MouseEventHandler, ReactNode} from "react"
import styles from "./ExpandAndRetract.module.scss"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"

interface ExpandAndRetractProps {
    onExpand: MouseEventHandler<HTMLDivElement>
    isExpand: boolean
    children?: ReactNode
}
export const ExpandAndRetract: React.FC<ExpandAndRetractProps> = React.memo((props) => {
    const {isExpand, onExpand, children} = props
    return (
        <div className={styles["expand-and-retract-header"]} onClick={onExpand}>
            <div className={styles["expand-and-retract-header-icon-body"]}>
                {isExpand ? (
                    <>
                        <OutlineChevrondoubledownIcon />
                        <span className={styles["expand-and-retract-header-icon-text"]}>
                            <span style={{marginLeft: 4}} />
                            收起参数
                        </span>
                    </>
                ) : (
                    <>
                        <OutlineChevrondoubleupIcon />
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
