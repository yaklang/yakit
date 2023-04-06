import React, {ReactNode, useEffect, useState} from "react"
import styles from "./ResizeCardBox.module.scss"
import classNames from "classnames"
import {ResizeBox, ResizeBoxProps} from "../ResizeBox"
import {useCreation} from "ahooks"
import {ArrowsExpandIcon, ArrowsRetractIcon} from "@/assets/newIcon"

interface ResizeCardNodeProps {
    title?: ReactNode
    extra?: ReactNode
}
/**
 * @description ResizeCardBox的属性
 * @param {ResizeCardNodeProps} firstNodeProps 第一个节点的额外属性
 * @param {ResizeCardNodeProps} secondNodeProps 第二个节点的额外属性
 */
interface ResizeCardBoxProps extends ResizeBoxProps {
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
        <ResizeBox
            {...resProps}
            lineStyle={{display: firstFull ? "none" : ""}}
            secondNodeStyle={{padding: firstFull ? 0 : undefined}}
            firstNodeStyle={{padding: secondFull ? 0 : undefined}}
            firstNode={
                <div className={styles["resize-card"]} style={{display: secondFull ? "none" : ""}}>
                    <div className={styles["resize-card-heard"]}>
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
                <div className={styles["resize-card"]} style={{display: firstFull ? "none" : ""}}>
                    <div className={styles["resize-card-heard"]}>
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
