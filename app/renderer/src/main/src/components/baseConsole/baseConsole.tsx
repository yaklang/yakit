import React, {ReactNode, useEffect, useRef, useState} from "react"
import {useDebounce, useGetState, useMemoizedFn} from "ahooks"
import Draggable from "react-draggable"
import {useSize} from "ahooks"
import type {DraggableEvent, DraggableData} from "react-draggable"
import classnames from "classnames"
import {
    YakitConsoleShrinkSvgIcon,
    YakitConsoleLeftSvgIcon,
    YakitConsoleRightSvgIcon,
    YakitConsoleBottomSvgIcon,
    YakitConsoleDotsSvgIcon
} from "../layout/icons"
import {Space} from "antd"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitMenu} from "../yakitUI/YakitMenu/YakitMenu"
import styles from "./baseConsole.module.scss"

const {ipcRenderer} = window.require("electron")

export interface RightIconMenuProps {}
export const RightIconMenu: React.FC<RightIconMenuProps> = (props) => {
    const [show, setShow] = useState<boolean>(false)

    const menuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "devtool":
                ipcRenderer.invoke("trigger-devtool")
                return
            case "reload":
                ipcRenderer.invoke("trigger-reload")
                return
            case "reloadCache":
                ipcRenderer.invoke("trigger-reload-cache")
                return

            default:
                return
        }
    })
    const menu = <RightIconBox activeSource={"shrink"} />
    return (
        <YakitPopover
            overlayClassName={classnames(styles["right-icon-menu"])}
            title={<span>停靠方位</span>}
            placement={"bottom"}
            content={menu}
            trigger='hover'
            onVisibleChange={(visible) => setShow(visible)}
        >
            <YakitConsoleDotsSvgIcon className={styles["right-dots-icon"]} />
        </YakitPopover>
    )
}
export interface RightIconBoxProps {
    activeSource: "shrink" | "left" | "bottom" | "right"
}
export const RightIconBox: React.FC<RightIconBoxProps> = (props) => {
    const {activeSource} = props
    return (
        <div className={styles["right-icon-box"]}>
            <Space>
                <YakitConsoleShrinkSvgIcon
                    className={classnames(styles["item-icon"], {
                        [styles["item-icon-active"]]: activeSource === "shrink"
                    })}
                />
                <YakitConsoleLeftSvgIcon
                    className={classnames(styles["item-icon"], {[styles["item-icon-active"]]: activeSource === "left"})}
                />
                <YakitConsoleBottomSvgIcon
                    className={classnames(styles["item-icon"], {
                        [styles["item-icon-active"]]: activeSource === "bottom"
                    })}
                />
                <YakitConsoleRightSvgIcon
                    className={classnames(styles["item-icon"], {
                        [styles["item-icon-active"]]: activeSource === "right"
                    })}
                />
            </Space>
        </div>
    )
}

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
    const draggleRef = useRef<HTMLDivElement>(null)
    const size = useSize(draggleRef)
    const [disabled, setDisabled] = useState(false)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
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
    console.log("gg", size?.width, size?.height)
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
                            <div className={styles["header-box"]}>
                                <div className={styles["header-left"]}>
                                    <div className={styles["dot"]}></div>
                                </div>
                                <div className={styles["header-center"]}>
                                    引擎 Console
                                    {/* <span style={{paddingRight:6}}>引擎</span><span>Console</span> */}
                                </div>
                                <div className={styles["header-right"]}>
                                    {size && size.width > 400 && <RightIconBox activeSource={"shrink"} />}
                                    {size && size.width <= 400 && <RightIconMenu />}
                                    {/* <RightIconMenu /> */}
                                </div>
                            </div>
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
