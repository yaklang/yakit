import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useGetState, useMemoizedFn, useSize} from "ahooks"
import styles from "./LeftSideBar.module.scss"
import classNames from "classnames"

import {LeftSideBarProps, LeftSideType} from "./LeftSideBarType"
import { RunnerFileTree } from "../RunnerFileTree/RunnerFileTree"


export const LeftSideBar: React.FC<LeftSideBarProps> = (props) => {
    const { isUnShow, setUnShow, active, setActive} = props
    const ref = useRef(null)
    const getContainerSize = useSize(ref)
    // 抽屉展示高度
    const boxHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    return (
        <div
            className={classNames(
                styles["left-side-bar"],
                {
                    [styles["folded"]]: !active
                },
                {
                    [styles["hidden"]]: isUnShow
                }
            )}
            ref={ref}
        >
            {/* 侧边栏对应展示内容 */}
            <div className={styles["left-side-bar-content"]}>
                <div
                    className={classNames(styles["content-wrapper"], {
                        [styles["hidden-content"]]: false
                    })}
                >
                    <RunnerFileTree boxHeight={boxHeight} />
                </div>
            </div>
        </div>
    )
}
