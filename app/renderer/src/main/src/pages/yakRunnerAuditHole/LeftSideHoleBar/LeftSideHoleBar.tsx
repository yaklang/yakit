import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./LeftSideHoleBar.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {LeftSideHoleBarProps, LeftSideHoleType} from "./LeftSideHoleBarType"

export const LeftSideHoleBar: React.FC<LeftSideHoleBarProps> = (props) => {
    const {isUnShow, setUnShow, active, setActive, statisticNode,documentCollectDom} = props

    // 控制初始渲染的变量，存在该变量里的类型则代表组件已经被渲染
    const rendered = useRef<Set<string>>(new Set(["statistic"]))

    const onSetActive = useMemoizedFn((type: LeftSideHoleType) => {
        if (!rendered.current.has(type as string)) {
            rendered.current.add(type as string)
        }
        setActive(type)
    })

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
        >
            {/* 左侧边栏 */}
            <div className={styles["left-side-bar-list"]}>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "statistic",
                        [styles["left-side-bar-item-advanced-config-unShow"]]: active === "statistic" && isUnShow
                    })}
                    onClick={() => {
                        if (active !== "statistic") {
                            setUnShow(false)
                        }
                        if (active === "statistic") {
                            setUnShow(!isUnShow)
                        }
                        onSetActive("statistic")
                    }}
                >
                    <span className={styles["item-text"]}>统计</span>
                </div>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "document-collect",
                        [styles["left-side-bar-item-advanced-config-unShow"]]: active === "document-collect" && isUnShow
                    })}
                    onClick={() => {
                        if (active !== "document-collect") {
                            setUnShow(false)
                        }
                        if (active === "document-collect") {
                            setUnShow(!isUnShow)
                        }
                        onSetActive("document-collect")
                    }}
                >
                    <span className={styles["item-text"]}>文件汇总</span>
                </div>
            </div>

            {/* 侧边栏对应展示内容 */}
            <div className={styles["left-side-bar-content"]}>
                {rendered.current.has("statistic") && (
                    <div
                        className={classNames(styles["content-wrapper"], {
                            [styles["hidden-content"]]: active !== "statistic" || isUnShow
                        })}
                    >
                        {statisticNode}
                    </div>
                )}
                {rendered.current.has("document-collect") && (
                    <div
                        className={classNames(styles["content-wrapper"], {
                            [styles["hidden-content"]]: active !== "document-collect" || isUnShow
                        })}
                    >
                        {documentCollectDom}
                    </div>
                )}
            </div>
        </div>
    )
}
