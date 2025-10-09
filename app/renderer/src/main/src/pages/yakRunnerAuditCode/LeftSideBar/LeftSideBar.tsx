import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useGetState, useMemoizedFn, useSize} from "ahooks"
import styles from "./LeftSideBar.module.scss"
import classNames from "classnames"
import {AuditCode} from "../AuditCode/AuditCode"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {RunnerFileTree} from "../RunnerFileTree/RunnerFileTree"
import useStore from "../hooks/useStore"
import {LeftSideBarProps, LeftSideType} from "./LeftSideBarType"

export const LeftSideBar: React.FC<LeftSideBarProps> = (props) => {
    const {fileTreeLoad, onOpenEditorDetails, isUnShow, setUnShow, active, setActive} = props
    const {pageInfo} = useStore()
    const [isOnlyFileTree, setOnlyFileTree] = useState<boolean>(false)
    const ref = useRef(null)
    const getContainerSize = useSize(ref)
    // 抽屉展示高度
    const boxHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    // 控制初始渲染的变量，存在该变量里的类型则代表组件已经被渲染
    const rendered = useRef<Set<string>>(new Set(["audit"]))

    const onSetActive = useMemoizedFn((type: LeftSideType) => {
        if (!rendered.current.has(type as string)) {
            rendered.current.add(type as string)
        }
        setActive(type)
    })

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%",
            firstMinSize: 250,
            secondMinSize: 180,
        }
        if (isOnlyFileTree) {
            p.firstRatio = "100%"
            p.secondRatio = "0%"
        }
        return p
    }, [isOnlyFileTree])

    // 当跳转时打开，没有则关闭
    useEffect(() => {
        if (!pageInfo?.Query) {
            setOnlyFileTree(true)
        }
    }, [pageInfo])

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
            {/* 左侧边栏 */}
            {/* <div className={styles["left-side-bar-list"]}>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "audit",
                        [styles["left-side-bar-item-advanced-config-unShow"]]: active === "audit" && isUnShow
                    })}
                    onClick={() => {
                        if (active !== "audit") {
                            setUnShow(false)
                        }
                        if (active === "audit") {
                            setUnShow(!isUnShow)
                        }
                        onSetActive("audit")
                    }}
                >
                    <span className={styles["item-text"]}>审计</span>
                </div>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "search",
                        [styles["left-side-bar-item-advanced-config-unShow"]]: active === "search" && isUnShow
                    })}
                    onClick={() => {
                        if (active !== "search") {
                            setUnShow(false)
                        }
                        if (active === "search") {
                            setUnShow(!isUnShow)
                        }
                        onSetActive("search")
                    }}
                >
                    <span className={styles["item-text"]}>搜索</span>
                </div>
            </div> */}

            {/* 侧边栏对应展示内容 */}
            <div className={styles["left-side-bar-content"]}>
                {rendered.current.has("audit") && (
                    <div
                        className={classNames(styles["content-wrapper"], {
                            [styles["hidden-content"]]: active !== "audit" || isUnShow
                        })}
                    >
                        <YakitResizeBox
                            isVer={true}
                            firstNodeStyle={{padding: 0}}
                            lineStyle={{display: isOnlyFileTree ? "none" : ""}}
                            secondNodeStyle={{padding: 0, display: isOnlyFileTree ? "none" : ""}}
                            firstNode={<RunnerFileTree fileTreeLoad={fileTreeLoad} boxHeight={boxHeight} />}
                            secondNode={
                                <AuditCode
                                    setOnlyFileTree={setOnlyFileTree}
                                    onOpenEditorDetails={onOpenEditorDetails}
                                />
                            }
                            {...ResizeBoxProps}
                        />
                    </div>
                )}
                {rendered.current.has("search") && (
                    <div
                        className={classNames(styles["content-wrapper"], {
                            [styles["hidden-content"]]: active !== "search" || isUnShow
                        })}
                    ></div>
                )}
            </div>
        </div>
    )
}
