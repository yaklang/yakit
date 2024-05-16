import React, {MouseEventHandler, ReactNode} from "react"
import styles from "./ExpandAndRetract.module.scss"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"
import classNames from "classnames"

/** 根据状态显示过度动画 */
export type ExpandAndRetractExcessiveState = "default" | "process" | "finished" | "error" | "paused"
interface ExpandAndRetractProps {
    onExpand: MouseEventHandler<HTMLDivElement>
    isExpand: boolean
    children?: ReactNode
    className?: string
    animationWrapperClassName?: string
    /**@description 默认/过程中/完成 根据状态显示过度动画 */
    status?: ExpandAndRetractExcessiveState
}
export const ExpandAndRetract: React.FC<ExpandAndRetractProps> = React.memo((props) => {
    const {isExpand, onExpand, children, className = "", animationWrapperClassName = "", status = "default"} = props
    return (
        <div
            className={classNames(
                styles["expand-and-retract-header"],
                {
                    [styles["expand-and-retract-header-process"]]: status === "process",
                    [styles["expand-and-retract-header-finished"]]: status === "finished",
                    [styles["expand-and-retract-header-error"]]: status === "error"
                },
                className
            )}
            onClick={onExpand}
        >
            <div className={classNames(styles["expand-and-retract-header-icon-body"], animationWrapperClassName)}>
                {isExpand ? (
                    <>
                        <OutlineChevrondoubleupIcon className={styles["expand-and-retract-icon"]} />
                        <span className={styles["expand-and-retract-header-icon-text"]}>收起参数</span>
                    </>
                ) : (
                    <>
                        <OutlineChevrondoubledownIcon className={styles["expand-and-retract-icon"]} />
                        <span className={styles["expand-and-retract-header-icon-text"]}>展开参数</span>
                    </>
                )}
            </div>
            {children}
        </div>
    )
})
