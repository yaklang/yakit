import React, {useEffect, useMemo, useRef, useState} from "react"
import {Modal} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useVirtualList} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./TerminalBox.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import ReactResizeDetector from "react-resize-detector"
import {writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import {TerminalDetailsProps} from "./TerminalMap"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {callCopyToClipboard} from "@/utils/basic"
import YakitXterm from "@/components/yakitUI/YakitXterm/YakitXterm"
import {OutlineTerminalIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

export const defaultTerminaFont = "Consolas, 'Courier New', monospace"

const {ipcRenderer} = window.require("electron")

export const defaultTerminalFont = {
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: 14
}

export interface DefaultTerminaSettingProps {
    fontFamily: string
    fontSize: number
}

export interface TerminalBoxProps {
    xtermRef: React.MutableRefObject<any>
    commandExec?: (v: string) => void
    onChangeSize?: (v: {row: number; col: number}) => void
    defaultTerminalSetting?: DefaultTerminaSettingProps
}
export const TerminalBox: React.FC<TerminalBoxProps> = (props) => {
    const {xtermRef, commandExec, onChangeSize, defaultTerminalSetting = defaultTerminalFont} = props

    const onCopy = useMemoizedFn(() => {
        const selectedText: string = (xtermRef.current && xtermRef.current.terminal.getSelection()) || ""
        if (selectedText.length === 0) {
            warn("暂无复制内容")
            return
        }
        callCopyToClipboard(selectedText, false)
    })

    const onPaste = useMemoizedFn(() => {
        if (xtermRef.current) {
            ipcRenderer
                .invoke("get-copy-clipboard")
                .then((str: string) => {
                    xtermRef.current.terminal.paste(str)
                    xtermRef.current.terminal.focus()
                })
                .catch(() => {})
        }
    })

    const menuData: YakitMenuItemType[] = useMemo(() => {
        return [
            {
                label: "复制",
                key: "copy"
            },
            {
                label: "粘贴",
                key: "paste"
            }
        ] as YakitMenuItemType[]
    }, [])

    const handleContextMenu = useMemoizedFn(() => {
        showByRightContext({
            width: 180,
            type: "grey",
            data: [...menuData],
            onClick: ({key, keyPath}) => {
                switch (key) {
                    case "copy":
                        onCopy()
                        break
                    case "paste":
                        onPaste()
                        break
                    default:
                        break
                }
            }
        })
    })

    return (
        <div className={styles["terminal-box"]} onContextMenu={handleContextMenu}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    const row = Math.floor(height / 18.5)
                    const col = Math.floor(width / 10)
                    const size = {
                        row,
                        col
                    }
                    onChangeSize && onChangeSize(size)
                    if (xtermRef) xtermFit(xtermRef, col, row)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <YakitXterm
                ref={xtermRef}
                options={{
                    // fontFamily: '"Courier New", Courier, monospace', //"Menlo"
                    ...defaultTerminalSetting,
                    convertEol: true,
                    theme: {
                        foreground: "#e5c7a9",
                        background: "#31343F",
                        cursor: "#f6f7ec",

                        black: "#121418",
                        brightBlack: "#675f54",

                        red: "#c94234",
                        brightRed: "#ff645a",

                        green: "#85c54c",
                        brightGreen: "#98e036",

                        yellow: "#f5ae2e",
                        brightYellow: "#e0d561",

                        blue: "#1398b9",
                        brightBlue: "#5fdaff",

                        magenta: "#d0633d",
                        brightMagenta: "#ff9269",

                        cyan: "#509552",
                        brightCyan: "#84f088",

                        white: "#e5c6aa",
                        brightWhite: "#f6f7ec"
                    }
                }}
                // isWrite={false}
                onData={(data) => {
                    commandExec && commandExec(data)
                }}
                onKey={(e) => {
                    return
                }}
            />
        </div>
    )
}

interface TerminalListBoxProps {
    initTerminalListData: TerminalDetailsProps[]
    terminalRunnerId: string
    onSelectTerminalItem: (v: string) => void
    onDeleteTerminalItem: (v: string) => void
}

/* 终端列表 */
export const TerminalListBox: React.FC<TerminalListBoxProps> = (props) => {
    const {initTerminalListData, terminalRunnerId, onSelectTerminalItem, onDeleteTerminalItem} = props
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)

    const [list] = useVirtualList(initTerminalListData, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 22,
        overscan: 10
    })

    return (
        <div className={styles["terminal-list-box"]} ref={containerRef}>
            <div ref={wrapperRef}>
                {list.map((ele) => (
                    <div
                        key={ele.index}
                        className={classNames(styles["list-item"], {
                            [styles["list-item-active"]]: ele.data.id === terminalRunnerId,
                            [styles["list-item-no-active"]]: ele.data.id !== terminalRunnerId
                        })}
                        onClick={() => onSelectTerminalItem(ele.data.id)}
                    >
                        <div className={styles["content"]}>
                            <OutlineTerminalIcon />
                            <div className={classNames(styles["title"], "yakit-content-single-ellipsis")}>
                                {ele.data.title}
                            </div>
                        </div>
                        <div className={styles["extra"]}>
                            <OutlineTrashIcon
                                className={styles["delete"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteTerminalItem(ele.data.id)
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
