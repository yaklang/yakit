import React, {useRef} from "react"
import {useMemoizedFn} from "ahooks"
import {OutlineEngineIcon} from "@/assets/icon/outline"
import {RightSideBarProps, RightSideType} from "./RightSideBarType"
import {AuditCode} from "../AuditCode/AuditCode"

import classNames from "classnames"
import styles from "./RightSideBar.module.scss"

const {ipcRenderer} = window.require("electron")

export const RightSideBar: React.FC<RightSideBarProps> = (props) => {
    const {} = props

    // 控制初始渲染的变量，存在该变量里的类型则代表组件已经被渲染
    const rendered = useRef<Set<string>>(new Set())

    const [active, setActive] = React.useState<RightSideType>()
    const onSetActive = useMemoizedFn((type: RightSideType) => {
        if (type === active) {
            setActive(undefined)
            return
        }
        if (!rendered.current.has(type as string)) {
            rendered.current.add(type as string)
        }
        setActive(type)
    })

    return (
        <div className={classNames(styles["right-side-bar"], {[styles["folded"]]: !active})}>
            {/* 侧边栏对应展示内容 */}
            <div className={styles["right-side-bar-content"]}>
                {rendered.current.has("audit-code") && (
                    <div
                        className={classNames(styles["content-wrapper"], {
                            [styles["hidden-content"]]: active !== "audit-code"
                        })}
                    >
                        <AuditCode />
                    </div>
                )}
            </div>

            {/* 右侧边栏 */}
            <div className={styles["right-side-bar-list"]}>
                <div
                    className={classNames(styles["right-side-bar-item"], {
                        [styles["right-side-bar-item-active"]]: active === "audit-code"
                    })}
                    onClick={() => onSetActive("audit-code")}
                >
                    <OutlineEngineIcon />
                    <span className={styles["item-text"]}>代码审计</span>
                </div>
            </div>
        </div>
    )
}
