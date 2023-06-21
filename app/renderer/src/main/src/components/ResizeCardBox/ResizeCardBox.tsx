import React, {ReactNode, useEffect, useState} from "react"
import styles from "./ResizeCardBox.module.scss"
import classNames from "classnames"
import {useCreation} from "ahooks"
import {ArrowsExpandIcon, ArrowsRetractIcon} from "@/assets/newIcon"
import { YakitResizeBox, YakitResizeBoxProps } from "../yakitUI/YakitResizeBox/YakitResizeBox"

interface ResizeCardNodeProps {
    title?: ReactNode
    extra?: ReactNode
    className?: string
    heardClassName?: string
}
/**
 * @description ResizeCardBox的属性
 * @param {ResizeCardNodeProps} firstNodeProps 第一个节点的额外属性
 * @param {ResizeCardNodeProps} secondNodeProps 第二个节点的额外属性
 */
interface ResizeCardBoxProps extends YakitResizeBoxProps {
    firstNodeProps?: ResizeCardNodeProps
    secondNodeProps?: ResizeCardNodeProps
}

/**
 * @description:ResizeCardBox 可全屏
 * @augments ResizeCardBoxProps 继承 ResizeBoxProps 默认属性
 */
export const ResizeCardBox: React.FC<ResizeCardBoxProps> = (props) => {
    const {firstNode, secondNode, firstNodeProps, secondNodeProps, ...resProps} = props
    const [firstFull, setFirstFull] = useState<boolean>(false)
    const [secondFull, setSecondFull] = useState<boolean>(false)
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (secondFull) {
            p.firstRatio = "0%"
        }
        if (firstFull) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [firstFull, secondFull])
    return (
        <YakitResizeBox
            {...resProps}
            lineStyle={{display: firstFull || secondFull ? "none" : ""}}
            secondNodeStyle={{padding: firstFull ? 0 : undefined}}
            firstNodeStyle={{padding: secondFull ? 0 : undefined}}
            firstNode={
                <div
                    className={classNames(styles["resize-card"], firstNodeProps?.className || "")}
                    style={{display: secondFull ? "none" : ""}}
                >
                    <div className={classNames(styles["resize-card-heard"], firstNodeProps?.heardClassName || "")}>
                        <div className={styles["resize-card-heard-title"]}>{firstNodeProps?.title}</div>
                        <div className={styles["resize-card-heard-extra"]}>
                            {firstNodeProps?.extra}
                            <div className={styles["resize-card-icon"]} onClick={() => setFirstFull(!firstFull)}>
                                {firstFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                            </div>
                        </div>
                    </div>
                    {firstNode}
                </div>
            }
            secondNode={
                <div
                    className={classNames(styles["resize-card"],styles['resize-card-second'], secondNodeProps?.className || "")}
                    style={{display: firstFull ? "none" : ""}} 
                >
                    <div className={classNames(styles["resize-card-heard"], secondNodeProps?.heardClassName || "")}>
                        <div className={styles["resize-card-heard-title"]}>{secondNodeProps?.title}</div>
                        <div className={styles["resize-card-heard-extra"]}>
                            {secondNodeProps?.extra}
                            <div className={styles["resize-card-icon"]} onClick={() => setSecondFull(!secondFull)}>
                                {secondFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                            </div>
                        </div>
                    </div>
                    {secondNode}
                </div>
            }
            {...ResizeBoxProps}
        />
    )
}
