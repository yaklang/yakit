import React, {useEffect, useMemo, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./SyntaxCheckList.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import useStore from "../../hooks/useStore"
import {IMonacoEditorMarker} from "@/utils/editorMarkers"
import {OutlineDeprecatedIcon} from "@/assets/icon/outline"
import {SolidExclamationIcon, SolidInformationcircleIcon, SolidXcircleIcon} from "@/assets/icon/solid"
import {Selection} from "../../RunnerTabs/RunnerTabsType"
const {ipcRenderer} = window.require("electron")
export interface SyntaxCheckListProps {
    syntaxCheckData: IMonacoEditorMarker[]
    onJumpToEditor: (v: Selection) => void
}
export const SyntaxCheckList: React.FC<SyntaxCheckListProps> = (props) => {
    const {syntaxCheckData, onJumpToEditor} = props

    const showIcon = useMemoizedFn((severity) => {
        switch (severity) {
            // Hint
            case 1:
                return (
                    <div className={classNames(styles["hint-icon"], styles["icon-box"])}>
                        <OutlineDeprecatedIcon />
                    </div>
                )
            // Info
            case 2:
                return (
                    <div className={classNames(styles["info-icon"], styles["icon-box"])}>
                        <SolidInformationcircleIcon />
                    </div>
                )
            // Warning
            case 4:
                return (
                    <div className={classNames(styles["warn-icon"], styles["icon-box"])}>
                        <SolidExclamationIcon />
                    </div>
                )
            // Error
            case 8:
                return (
                    <div className={classNames(styles["error-icon"], styles["icon-box"])}>
                        <SolidXcircleIcon />
                    </div>
                )
            default:
                return <></>
        }
    })

    return (
        <div className={styles["syntax-check-list"]}>
            {syntaxCheckData.map((item) => {
                const {severity, message, startLineNumber, startColumn, endLineNumber, endColumn} = item
                return (
                    <div
                        className={styles["syntax-check-item"]}
                        onClick={() => {
                            onJumpToEditor({
                                startLineNumber,
                                startColumn,
                                endLineNumber,
                                endColumn
                            })
                        }}
                    >
                        {showIcon(severity)}
                        <div className={classNames(styles["text"], "yakit-content-single-ellipsis")}>{message}</div>
                        <div className={styles["area"]}>
                            [Ln {startLineNumber},Col {startColumn} - Ln {endLineNumber},Col {endColumn}]
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
