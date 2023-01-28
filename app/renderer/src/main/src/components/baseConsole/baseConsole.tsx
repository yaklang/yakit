import React, {ReactNode, useEffect, useRef, useState} from "react"
import {useDebounce, useGetState, useMemoizedFn} from "ahooks"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import classnames from "classnames"
import { YakitConsoleShrinkSvgIcon,YakitConsoleLeftSvgIcon,YakitConsoleRightSvgIcon,YakitConsoleBottomSvgIcon,YakitConsoleDotsSvgIcon } from "../layout/icons";
import {} from "antd"
import {} from "@ant-design/icons"

import styles from "./baseConsole.module.scss"

const {ipcRenderer} = window.require("electron")

export interface BaseConsoleProps {}

export const BaseConsole: React.FC<BaseConsoleProps> = (props) => {
    return <div>coneole</div>
}

export interface BaseConsoleMiniProps {
    visible: boolean
    setVisible: (v: boolean) => any
}

export const BaseMiniConsole: React.FC<BaseConsoleMiniProps> = (props) => {
    const {visible} = props
    const [disabled, setDisabled] = useState(false)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)
    /** 弹窗拖拽移动触发事件 */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })
    return (
        <Draggable
            defaultClassName={classnames(
                styles["yaklang-console-modal"],
                visible ? styles["engine-console-modal-wrapper"] : styles["engine-console-modal-hidden-wrapper"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>
                <div
                    className={styles["modal-yaklang-engine-console"]}
                    // onClick={() => setIsTop(0)}
                >
                    <div className={styles["yaklang-engine-console-wrapper"]}>
                        <div
                            className={styles["console-draggle-header"]}
                            onMouseEnter={() => {
                                if (disabled) setDisabled(false)
                            }}
                            onMouseLeave={() => setDisabled(true)}
                            // onMouseDown={() => setIsTop(0)}
                        >
                            <div><span>引擎</span><span>Console</span></div>
                        </div>
                        <div className={styles["console-draggle-body"]}>
                            <div>mini</div>
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    )
}
