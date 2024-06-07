import React, {useEffect, useMemo, useState} from "react"
import {BottomSideBarProps} from "./BottomSideBarType"

import classNames from "classnames"
import styles from "./BottomSideBar.module.scss"
import {
    OutlineAnnotationIcon,
    OutlineCodeIcon,
    OutlineDeprecatedIcon,
    OutlineExclamationIcon,
    OutlineInformationcircleIcon,
    OutlineStethoscopeIcon,
    OutlineXcircleIcon
} from "@/assets/icon/outline"
import useStore from "../hooks/useStore"

const {ipcRenderer} = window.require("electron")

export const BottomSideBar: React.FC<BottomSideBarProps> = (props) => {
    const {onOpenEditorDetails} = props
    const {activeFile} = useStore()
    const showSyntaxInfo = useMemo(() => {
        let data = {
            hint: 0,
            info: 0,
            warning: 0,
            error: 0
        }
        if (activeFile?.syntaxCheck) {
            activeFile.syntaxCheck.forEach((item) => {
                switch (item.severity) {
                    case 1:
                        data.hint += 1
                        break
                    case 2:
                        data.info += 1
                        break
                    case 4:
                        data.warning += 1
                        break
                    case 8:
                        data.error += 1
                        break
                }
            })
        }
        return data
    }, [activeFile])

    const showLocationInfo = useMemo(()=>{
        let data = {
            lineNumber:1,
            column:1
        }
        if(activeFile?.position){
            data.lineNumber = activeFile.position.lineNumber
            data.column = activeFile.position.column
        }
        return data
    },[activeFile?.position])
    return (
        <div className={styles["bottom-side-bar"]}>
            {/* 语法检查|终端|帮助信息 */}
            <div className={styles["bottom-side-bar-left"]}>
                <div className={classNames(styles["left-item"], styles["left-check"])}>
                    <div
                        className={classNames(styles["left-check-info"], styles["left-check-start"])}
                        onClick={() => {
                            onOpenEditorDetails("syntaxCheck")
                        }}
                    >
                        <OutlineStethoscopeIcon />
                        语法检查
                    </div>
                    <div
                        className={styles["left-check-info"]}
                        onClick={() => {
                            onOpenEditorDetails("syntaxCheck")
                        }}
                    >
                        <OutlineXcircleIcon />
                        {showSyntaxInfo.error}
                    </div>
                    <div
                        className={styles["left-check-info"]}
                        onClick={() => {
                            onOpenEditorDetails("syntaxCheck")
                        }}
                    >
                        <OutlineExclamationIcon />
                        {showSyntaxInfo.warning}
                    </div>
                    <div
                        className={styles["left-check-info"]}
                        onClick={() => {
                            onOpenEditorDetails("syntaxCheck")
                        }}
                    >
                        <OutlineInformationcircleIcon />
                        {showSyntaxInfo.info}
                    </div>
                    <div
                        className={classNames(styles["left-check-info"], styles["left-check-end"])}
                        onClick={() => {
                            onOpenEditorDetails("syntaxCheck")
                        }}
                    >
                        <OutlineDeprecatedIcon />
                        {showSyntaxInfo.hint}
                    </div>
                </div>
                <div
                    className={classNames(styles["left-item"], styles["left-terminal-and-help"])}
                    onClick={() => {
                        onOpenEditorDetails("terminal")
                    }}
                >
                    <OutlineCodeIcon />
                    终端
                </div>
                <div
                    className={classNames(styles["left-item"], styles["left-terminal-and-help"])}
                    onClick={() => {
                        onOpenEditorDetails("helpInfo")
                    }}
                >
                    <OutlineAnnotationIcon />
                    帮助信息
                </div>
            </div>

            {/* 光标位置 */}
            <div className={styles["bottom-side-bar-right"]}>{`行 ${showLocationInfo.lineNumber}，  列 ${showLocationInfo.column}`}</div>
        </div>
    )
}
