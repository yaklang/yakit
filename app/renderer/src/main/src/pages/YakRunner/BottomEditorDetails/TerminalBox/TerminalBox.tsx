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
import {TERMINAL_INPUT_KEY, YakitCVXterm} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import useStore from "../../hooks/useStore"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import { StringToUint8Array, Uint8ArrayToString } from "@/utils/str"

const {ipcRenderer} = window.require("electron")

export interface TerminalBoxProps {
    isShowEditorDetails: boolean
    folderPath: string
}
export const TerminalBox: React.FC<TerminalBoxProps> = (props) => {
    const {isShowEditorDetails,folderPath} = props
    const xtermRef = useRef<any>(null)
    // 是否允许输入及不允许输入的原因
    const [allowInput, setAllowInput] = useState<boolean>(true)

    // 写入
    const commandExec = useMemoizedFn((cmd) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }
        ipcRenderer.invoke("runner-terminal-input", folderPath, cmd)
    })

    // 终端启用路径
    const startTerminalPath = useRef<string>()

    useEffect(() => {
        if (!xtermRef) {
            return
        }
        if(startTerminalPath.current){
            ipcRenderer.invoke("runner-terminal-cancel",startTerminalPath.current)
            startTerminalPath.current = undefined
        }
        setAllowInput(true)
        // 启动
        ipcRenderer
            .invoke("runner-terminal", {
                path: folderPath
            })
            .then(() => {
                startTerminalPath.current = folderPath
                isShowEditorDetails&&success(`终端${folderPath}监听成功`)
            })
            .catch((e: any) => {
                failed(`ERROR: ${JSON.stringify(e)}`)
            })
            .finally(() => {})

        // 接收
        const key = `client-listening-terminal-data-${folderPath}`
        ipcRenderer.on(key, (e, data) => {
            if (data.control) {
                return
            }

            if (data?.raw && xtermRef?.current && xtermRef.current?.terminal) {
                // let str = String.fromCharCode.apply(null, data.raw);
                let str = Uint8ArrayToString(data.raw)
                
                writeXTerm(xtermRef, str)
            }
        })

        const successKey = `client-listening-terminal-success-${folderPath}`
        ipcRenderer.on(successKey, (e: any) => {
            // console.log("client-listening-terminal-success---")
        })

        // grpc通知关闭
        const errorKey = "client-listening-terminal-end"
        ipcRenderer.on(errorKey, (e: any, data: any) => {
            if(startTerminalPath.current === data){
                setAllowInput(false)
            }
            isShowEditorDetails&&warn(`终端${data}被关闭`)
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

    // xtermClear(xtermRef)
    // writeXTerm(xtermRef, defaultXterm)

    return (
        <div className={styles["terminal-box"]}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    const row = Math.floor(height / 18.5)
                    const col = Math.floor(width / 10)
                    if (xtermRef) xtermFit(xtermRef, col, row)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <YakitCVXterm
                maxHeight={0}
                ref={xtermRef}
                options={{
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
                    if (!allowInput) {
                        warn(`终端 ${startTerminalPath.current} 被关闭`)
                        return
                    }
                    commandExec(data)
                }}
                onKey={(e) => {
                    return
                }}
            />
        </div>
    )
}
