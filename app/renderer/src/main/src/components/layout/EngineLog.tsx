import React, {useEffect, useRef} from "react"
import {XTerm} from "xterm-for-react"
import {xtermClear, xtermFit} from "@/utils/xtermUtils"
import {EngineLogCloseSvgIcon} from "./icons"
import ReactResizeDetector from "react-resize-detector"

import styles from "./EngineLog.module.scss"
import {getReleaseEditionName} from "@/utils/envfile"
import {useXTermOptions} from "@/hook/useXTermOptions/useXTermOptions"

const {ipcRenderer} = window.require("electron")

export interface EngineLogProps {
    visible: boolean
    setVisible: (flag: boolean) => any
}

export const EngineLog: React.FC<EngineLogProps> = React.memo((props) => {
    const {visible, setVisible} = props

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

    useEffect(() => {
        if (xtermRef && visible) {
            xtermClear(xtermRef)
        }
    }, [visible])

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        writeToConsole(`欢迎使用 ${getReleaseEditionName()}!\n`)

        ipcRenderer.on("live-engine-stdio", (e, stdout) => {
            writeToConsole(stdout)
        })
        ipcRenderer.on("live-engine-log", (e, stdout) => {
            writeToConsole(`[INFO] ${getReleaseEditionName()}-Verbose-Log: ${stdout}`)
        })
        return () => {
            ipcRenderer.removeAllListeners("live-engine-stdio")
            ipcRenderer.removeAllListeners("live-engine-log")
        }
    }, [xtermRef])

    const onCancel = () => {
        setVisible(false)
    }

    return (
        <div className={styles["engine-log-wrapper"]}>
            <div className={styles["engine-log-header"]}>
                <div className={styles["header-title"]}>连接日志</div>
                <div className={styles["header-close"]} onClick={onCancel}>
                    <EngineLogCloseSvgIcon />
                </div>
            </div>
            <div className={styles["engine-log-body"]}>
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
            </div>
        </div>
    )
})
