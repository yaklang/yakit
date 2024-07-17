import React, {useEffect, useRef} from "react"
import {} from "@ant-design/icons"
import {useMemoizedFn} from "ahooks"
import {failed, success, warn} from "@/utils/notification"
import {writeXTerm, xtermClear} from "@/utils/xtermUtils"
import {Uint8ArrayToString} from "@/utils/str"
import {getMapAllTerminalKey, getTerminalMap, setTerminalMap} from "./TerminalMap"
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

    const terminalSizeRef = useRef<any>()
    // 写入
    const commandExec = useMemoizedFn((cmd) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }
        ipcRenderer.invoke("runner-terminal-input", folderPath, cmd)
    })

    // 行列变化
    const onChangeSize = useMemoizedFn((height, width) => {
        if (height && width && folderPath) {
            ipcRenderer.invoke("runner-terminal-size", folderPath, {
                height,
                width
            })
        }
    })

    // 输出
    const onWriteXTerm = useMemoizedFn((data: Uint8Array) => {
        let outPut = Uint8ArrayToString(data)
        // 缓存
        setTerminalMap(folderPath, getTerminalMap(folderPath) + outPut)
        writeXTerm(xtermRef, outPut)
    })

    const run = useMemoizedFn((size) => {
        if (!xtermRef) return
        if (!size) return
        // 校验map存储缓存
        const terminalCache = getTerminalMap(folderPath)
        if (terminalCache) {
            writeXTerm(xtermRef, terminalCache)
        } else {
            // 启动
            ipcRenderer
                .invoke("runner-terminal", {
                    path: folderPath,
                    ...size
                })
                .then(() => {
                    isShowEditorDetails && success(`终端${folderPath}监听成功`)
                })
                .catch((e: any) => {
                    failed(`ERROR: ${JSON.stringify(e)}`)
                })
                .finally(() => {})
        }
    })

    useEffect(() => {
        if (!xtermRef) return

        run(terminalSizeRef.current)

        // 接收
        const key = `client-listening-terminal-data-${folderPath}`
        ipcRenderer.on(key, (e, data) => {
            if (data.control) {
                return
            }

            if (data?.raw) {
                onWriteXTerm(data.raw)
            }
        })

        const successKey = `client-listening-terminal-success-${folderPath}`
        ipcRenderer.on(successKey, (e: any) => {
            // console.log("client-listening-terminal-success---")
        })

        // grpc通知关闭
        const errorKey = "client-listening-terminal-end"
        ipcRenderer.on(errorKey, (e: any, data: any) => {
            if (getMapAllTerminalKey().includes(data)) {
                onExitTernimal(data)
                isShowEditorDetails && warn(`终端${data}被关闭`)
            }
        })
        return () => {
            // 移除
            ipcRenderer.removeAllListeners(key)
            ipcRenderer.removeAllListeners(successKey)
            ipcRenderer.removeAllListeners(errorKey)
            // 清空
            xtermClear(xtermRef)
        }
    }, [xtermRef, folderPath])

    // const onCopy = useMemoizedFn(() => {
    //     const selectedText: string = (xtermRef.current && xtermRef.current.terminal.getSelection()) || ""
    //     if (selectedText.length === 0) {
    //         warn("暂无复制内容")
    //         return
    //     }
    //     callCopyToClipboard(selectedText, false)
    // })

    // const onPaste = useMemoizedFn(() => {
    //     if (xtermRef.current) {
    //         ipcRenderer
    //             .invoke("get-copy-clipboard")
    //             .then((str: string) => {
    //                 xtermRef.current.terminal.paste(str)
    //                 xtermRef.current.terminal.focus()
    //             })
    //             .catch(() => {})
    //     }
    // })

    // const menuData: YakitMenuItemType[] = useMemo(() => {
    //     return [
    //         {
    //             label: "复制",
    //             key: "copy"
    //         },
    //         {
    //             label: "粘贴",
    //             key: "paste"
    //         }
    //     ] as YakitMenuItemType[]
    // }, [])

    // const handleContextMenu = useMemoizedFn(() => {
    //     showByRightContext({
    //         width: 180,
    //         type: "grey",
    //         data: [...menuData],
    //         onClick: ({key, keyPath}) => {
    //             switch (key) {
    //                 case "copy":
    //                     onCopy()
    //                     break
    //                 case "paste":
    //                     onPaste()
    //                     break
    //                 default:
    //                     break
    //             }
    //         }
    //     })
    // })

    return (
        // <div className={styles["terminal-box"]} onContextMenu={handleContextMenu}>
        //     <ReactResizeDetector
        //         onResize={(width, height) => {
        //             if (!width || !height) return
        //             const row = Math.floor(height / 18.5)
        //             const col = Math.floor(width / 10)
        //             const size = {
        //                 row,
        //                 col
        //             }
        //             // 第一次执行 带入row、col
        //             if(!terminalSizeRef.current){
        //                 run(size)
        //             }
        //             terminalSizeRef.current = size
        //             onChangeSize(row, col)
        //             if (xtermRef) xtermFit(xtermRef, col, row)
        //         }}
        //         handleWidth={true}
        //         handleHeight={true}
        //         refreshMode={"debounce"}
        //         refreshRate={50}
        //     />
        //     <YakitXterm
        //         ref={xtermRef}
        //         options={{
        //             // fontFamily: '"Courier New", Courier, monospace',
        //             fontFamily: terminaFont,
        //             convertEol: true,
        //             theme: {
        //                 foreground: "#e5c7a9",
        //                 background: "#31343F",
        //                 cursor: "#f6f7ec",

        //                 black: "#121418",
        //                 brightBlack: "#675f54",

        //                 red: "#c94234",
        //                 brightRed: "#ff645a",

        //                 green: "#85c54c",
        //                 brightGreen: "#98e036",

        //                 yellow: "#f5ae2e",
        //                 brightYellow: "#e0d561",

        //                 blue: "#1398b9",
        //                 brightBlue: "#5fdaff",

        //                 magenta: "#d0633d",
        //                 brightMagenta: "#ff9269",

        //                 cyan: "#509552",
        //                 brightCyan: "#84f088",

        //                 white: "#e5c6aa",
        //                 brightWhite: "#f6f7ec"
        //             }
        //         }}
        //         // isWrite={false}
        //         onData={(data) => {
        //             commandExec(data)
        //         }}
        //         onKey={(e) => {
        //             return
        //         }}
        //     />
        // </div>
        <YakitXterm
            ref={xtermRef}
            onData={(data) => {
                commandExec(data)
            }}
            customKeyEventHandler={() => true}
            onResize={(val) => {
                const {rows, cols} = val
                const size = {
                    row: rows,
                    col: cols
                }
                // 第一次执行 带入row、col
                if (!terminalSizeRef.current) {
                    run(size)
                }
                terminalSizeRef.current = size
                onChangeSize(rows, cols)
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
