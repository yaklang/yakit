import React, {useEffect, useMemo, useState} from "react"
import {BottomSideBarProps} from "./BottomSideBarType"
import classNames from "classnames"
import styles from "./BottomSideBar.module.scss"
import {OutlineBugIcon, OutlineClockIcon, OutlineScanRuleEditIcon, OutlineTagIcon} from "@/assets/icon/outline"
import useStore from "../hooks/useStore"
import emiter from "@/utils/eventBus/eventBus"

export const BottomSideBar: React.FC<BottomSideBarProps> = (props) => {
    const {onOpenEditorDetails} = props
    const {activeFile} = useStore()

    const showLocationInfo = useMemo(() => {
        let data = {
            lineNumber: 1,
            column: 1
        }
        if (activeFile?.position) {
            data.lineNumber = activeFile.position.lineNumber
            data.column = activeFile.position.column
        }
        return data
    }, [activeFile?.position])

    return (
        <div className={styles["bottom-side-bar"]}>
            {/* 语法检查|终端|帮助信息 */}
            <div className={styles["bottom-side-bar-left"]}>
                <div
                    className={classNames(styles["left-item"], styles["left-terminal-and-help"])}
                    onClick={() => {
                        emiter.emit("onOpenLeftSecondNode", "result")
                    }}
                >
                    <OutlineTagIcon />
                    审计结果
                </div>
                <div
                    className={classNames(styles["left-item"], styles["left-terminal-and-help"])}
                    onClick={() => {
                        emiter.emit("onOpenLeftSecondNode", "history")
                    }}
                >
                    <OutlineClockIcon />
                    审计历史
                </div>
                <div
                    className={classNames(styles["left-item"], styles["left-terminal-and-help"])}
                    onClick={() => {
                        onOpenEditorDetails("ruleEditor")
                    }}
                >
                    <OutlineScanRuleEditIcon />
                    规则编写
                </div>
                <div
                    className={classNames(styles["left-item"], styles["left-terminal-and-help"])}
                    onClick={() => {
                        onOpenEditorDetails("holeDetail")
                    }}
                >
                    <OutlineBugIcon />
                    漏洞汇总
                </div>
            </div>

            {/* 光标位置 */}
            <div
                className={styles["bottom-side-bar-right"]}
            >{`行 ${showLocationInfo.lineNumber}，  列 ${showLocationInfo.column}`}</div>
        </div>
    )
}
