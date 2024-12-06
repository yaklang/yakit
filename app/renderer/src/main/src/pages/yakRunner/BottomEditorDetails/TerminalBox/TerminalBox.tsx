import React, {useEffect, useRef} from "react"
import {useMemoizedFn, useVirtualList} from "ahooks"
import {getMapAllTerminalKey, getTerminalMap, setTerminalMap, TerminalDetailsProps} from "./TerminalMap"
import YakitXterm from "@/components/yakitUI/YakitXterm/YakitXterm"
import {OutlineTerminalIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import styles from "./TerminalBox.module.scss"

export const defaultTerminaFont = "Consolas, 'Courier New', monospace"

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

    return (
        <YakitXterm
            ref={xtermRef}
            options={{
                ...defaultTerminalSetting,
            }}
            onData={(data) => {
                commandExec && commandExec(data)
            }}
            customKeyEventHandler={() => true}
            onResize={(val) => {
                const {rows, cols} = val
                const size = {
                    row: rows,
                    col: cols
                }
                onChangeSize && onChangeSize(size)
            }}
        />
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
