import React, {useEffect, useState} from "react"
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

const {ipcRenderer} = window.require("electron")

export const BottomSideBar: React.FC<BottomSideBarProps> = (props) => {
    return (
        <div className={styles["bottom-side-bar"]}>
            {/* 语法检查|终端|帮助信息 */}
            <div className={styles["bottom-side-bar-left"]}>
                <div className={classNames(styles["left-item"], styles["left-check"])}>
                    <div className={classNames(styles["left-check-info"], styles["left-check-start"])}>
                        <OutlineStethoscopeIcon />
                        语法检查
                    </div>
                    <div className={styles["left-check-info"]}>
                        <OutlineXcircleIcon />2
                    </div>
                    <div className={styles["left-check-info"]}>
                        <OutlineExclamationIcon />
                        24
                    </div>
                    <div className={styles["left-check-info"]}>
                        <OutlineInformationcircleIcon />0
                    </div>
                    <div className={classNames(styles["left-check-info"], styles["left-check-end"])}>
                        <OutlineDeprecatedIcon />0
                    </div>
                </div>
                <div className={classNames(styles["left-item"], styles["left-terminal-and-help"])}>
                    <OutlineCodeIcon />
                    终端
                </div>
                <div className={classNames(styles["left-item"], styles["left-terminal-and-help"])}>
                    <OutlineAnnotationIcon />
                    帮助信息
                </div>
            </div>

            {/* 光标位置 */}
            <div className={styles["bottom-side-bar-right"]}>{`行 ${1}，  列 ${1}`}</div>
        </div>
    )
}
