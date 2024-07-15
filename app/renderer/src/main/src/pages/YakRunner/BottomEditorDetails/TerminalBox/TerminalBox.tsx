import React, {useEffect, useMemo, useRef, useState} from "react"
import {Modal} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./TerminalBox.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import ReactResizeDetector from "react-resize-detector"
import {writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import {YakitCVXterm} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import {Uint8ArrayToString} from "@/utils/str"
import {getMapAllTerminalKey, getTerminalMap, removeTerminalMap, setTerminalMap} from "./TerminalMap"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {callCopyToClipboard} from "@/utils/basic"
import YakitXterm from "@/components/yakitUI/YakitXterm/YakitXterm"

const {ipcRenderer} = window.require("electron")
export interface TerminalBoxProps {
    isShowEditorDetails: boolean
    folderPath: string
    terminaFont: string
    xtermRef: React.MutableRefObject<any>
    onExitTernimal: (path: string) => void
}
export const TerminalBox: React.FC<TerminalBoxProps> = (props) => {
    const {isShowEditorDetails, folderPath, terminaFont, xtermRef, onExitTernimal} = props

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

    const run = useMemoizedFn((size)=>{
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
                    // 第一次执行 带入row、col
                    if(!terminalSizeRef.current){
                        run(size)
                    }
                    terminalSizeRef.current = size
                    onChangeSize(row, col)
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
                    fontFamily: terminaFont,
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
                    commandExec(data)
                }}
                onKey={(e) => {
                    return
                }}
            />
        </div>
    )
}
