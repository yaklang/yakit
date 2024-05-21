import React, {useRef} from "react"
import {useMemoizedFn} from "ahooks"
import {OutlineDocumenttextIcon, OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {LeftSideBarProps, LeftSideType} from "./LeftSideBarType"
import {RunnerFileTree} from "../RunnerFileTree/RunnerFileTree"
import {YakHelpDoc} from "../YakHelpDoc/YakHelpDoc"

import classNames from "classnames"
import styles from "./LeftSideBar.module.scss"

const {ipcRenderer} = window.require("electron")

export const LeftSideBar: React.FC<LeftSideBarProps> = (props) => {
    const {} = props

    // 控制初始渲染的变量，存在该变量里的类型则代表组件已经被渲染
    const rendered = useRef<Set<string>>(new Set(["file-tree"]))

    const [active, setActive] = React.useState<LeftSideType>("file-tree")
    const onSetActive = useMemoizedFn((type: LeftSideType) => {
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
        <div className={classNames(styles["left-side-bar"], {[styles["folded"]]: !active})}>
            {/* 左侧边栏 */}
            <div className={styles["left-side-bar-list"]}>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "file-tree"
                    })}
                    onClick={() => onSetActive("file-tree")}
                >
                    <span className={styles["item-text"]}>资源管理器</span>
                    <OutlineDocumenttextIcon />
                </div>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "help-doc"
                    })}
                    onClick={() => onSetActive("help-doc")}
                >
                    <span className={styles["item-text"]}>帮助文档</span>
                    <OutlineQuestionmarkcircleIcon />
                </div>
            </div>

            {/* 侧边栏对应展示内容 */}
            <div className={styles["left-side-bar-content"]}>
                {rendered.current.has("file-tree") && (
                    <div
                        className={classNames(styles["content-wrapper"], {
                            [styles["hidden-content"]]: active !== "file-tree"
                        })}
                    >
                        <RunnerFileTree />
                    </div>
                )}
                {rendered.current.has("help-doc") && (
                    <div
                        className={classNames(styles["content-wrapper"], {
                            [styles["hidden-content"]]: active !== "help-doc"
                        })}
                    >
                        <YakHelpDoc />
                    </div>
                )}
            </div>
        </div>
    )
}
