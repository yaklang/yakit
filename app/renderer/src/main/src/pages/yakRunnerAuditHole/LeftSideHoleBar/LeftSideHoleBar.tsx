import React, {useRef} from "react"
import styles from "./LeftSideHoleBar.module.scss"
import classNames from "classnames"
import {LeftSideHoleBarProps} from "./LeftSideHoleBarType"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {useMemoizedFn} from "ahooks"

export const LeftSideHoleBar: React.FC<LeftSideHoleBarProps> = (props) => {
    const {isUnShow, active, setActive, yakitTab, setYakitTab, statisticNode, documentCollectDom} = props
    // 控制初始渲染的变量，存在该变量里的类型则代表组件已经被渲染
    const rendered = useRef<Set<string>>(new Set(["statistic"]))

    const onSetActive = useMemoizedFn((type: string) => {
        if (!rendered.current.has(type)) {
            rendered.current.add(type)
        }
        setActive(type)
    })

    return (
        <div
            className={classNames(styles["left-side-bar"], {
                [styles["folded"]]: !active
            })}
        >
            {/* 左侧边栏 */}
            <YakitSideTab
                yakitTabs={yakitTab}
                setYakitTabs={setYakitTab}
                activeKey={active}
                onActiveKey={onSetActive}
            />

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
