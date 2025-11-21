import React, {useEffect, useRef} from "react"
import {getReleaseEditionName} from "@/utils/envfile"
import {xtermFit} from "@/utils/xtermUtils"
import ReactResizeDetector from "react-resize-detector"
import {XTerm} from "xterm-for-react"
import {useXTermOptions} from "@/hooks/useXTermOptions"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineDocumentduplicateIcon} from "@/assets/outline"
import {setClipboardText} from "@/utils/clipboard"
import {yakitNotify} from "@/utils/notification"
import {Tooltip} from "antd"

import styles from "./EngineLog.module.scss"

const {ipcRenderer} = window.require("electron")

interface EngineLogProps {}
export const EngineLog: React.FC<EngineLogProps> = React.memo((props) => {
    const xtermRef = useRef<any>(null)
    const terminalOptions = useXTermOptions({
        getTerminal: () => xtermRef.current?.terminal,
        delay: 200
    })

    /** 日志输出 */
    const writeToConsole = (i: string) => {
        if (!xtermRef) return
        xtermRef.current.terminal.write(i)
    }

    const liveEngineLog = useMemoizedFn((e, stdout) => {
        writeToConsole(`[INFO] ${getReleaseEditionName()}-Verbose-Log: ${stdout}`)
    })

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        writeToConsole(`欢迎使用 ${getReleaseEditionName()}!\n`)

        ipcRenderer.on("live-engine-stdio", (e, stdout) => {
            writeToConsole(stdout)
        })

        ipcRenderer.on("live-engine-log", liveEngineLog)
        return () => {
            ipcRenderer.removeAllListeners("live-engine-log", liveEngineLog)
            ipcRenderer.removeAllListeners("live-engine-stdio")
        }
    }, [xtermRef])

    const getFullTerminalText = (terminal: any) => {
        if (!terminal) return ""

        const buffer = terminal.buffer.active
        let result: string[] = []
        let currentLine = ""

        for (let i = 0; i < buffer.length; i++) {
            const line = buffer.getLine(i)
            if (!line) continue

            const text = line.translateToString(false) // 保留原样但不 trimmed
            const isWrapped = line.isWrapped // <-- wrap 状态（关键）

            currentLine += text.trimEnd()

            if (!isWrapped) {
                // 当前行不是 wrap → 本行结束
                if (currentLine.trim() !== "") {
                    result.push(currentLine)
                }
                currentLine = ""
            }
        }

        // 最后一行
        if (currentLine.trim() !== "") {
            result.push(currentLine)
        }

        return result.join("\n")
    }

    const onCopyEngineLog = useMemoizedFn(() => {
        const terminal = xtermRef.current?.terminal
        const fullText = getFullTerminalText(terminal)
        setClipboardText(fullText, {
            hiddenHint: true,
            finalCallback: () => {
                yakitNotify("success", "复制成功")
            }
        })
    })

    return (
        <div className={styles["engine-log-wrapper"]}>
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
            <XTerm ref={xtermRef} options={terminalOptions} />
            <div className={styles["engine-copy"]}>
                <Tooltip title='复制日志信息' placement='topRight'>
                    <YakitButton
                        icon={<OutlineDocumentduplicateIcon />}
                        type='secondary2'
                        onClick={onCopyEngineLog}
                    ></YakitButton>
                </Tooltip>
            </div>
        </div>
    )
})
